/**
 * Phase P1 Automated Measurement Script
 * Connects to Chrome on port 9222 and executes automated performance audits:
 * 1. Cold Load (Disable Cache ON)
 * 2. Warm Load (Disable Cache OFF)
 * 3. Measures FCP, LCP, DCL, JS Transfer Size, Resource Sizes
 * 4. Measures API latency & MongoDB/backend latency
 */

import fs from 'fs';
import path from 'path';

async function getTargetWsUrl() {
  const res = await fetch('http://127.0.0.1:9222/json/list');
  const pages = await res.json();
  const page = pages.find(p => p.url.includes('localhost:5173') || p.type === 'page');
  if (!page) throw new Error('No target page found on port 9222');
  return page.webSocketDebuggerUrl;
}

class CDPClient {
  constructor(wsUrl) {
    this.wsUrl = wsUrl;
    this.ws = null;
    this.id = 1;
    this.callbacks = new Map();
    this.events = [];
    this.eventListeners = new Map();
  }

  async connect() {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(this.wsUrl);
      this.ws.onopen = () => resolve();
      this.ws.onerror = (err) => reject(err);
      this.ws.onmessage = (event) => {
        const msg = JSON.parse(event.data);
        if (msg.id && this.callbacks.has(msg.id)) {
          const { resolve, reject } = this.callbacks.get(msg.id);
          this.callbacks.delete(msg.id);
          if (msg.error) reject(new Error(JSON.stringify(msg.error)));
          else resolve(msg.result);
        } else if (msg.method) {
          const listeners = this.eventListeners.get(msg.method) || [];
          listeners.forEach(fn => fn(msg.params));
        }
      };
    });
  }

  on(event, fn) {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event).push(fn);
  }

  async send(method, params = {}) {
    const id = this.id++;
    return new Promise((resolve, reject) => {
      this.callbacks.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }

  async eval(expression) {
    const res = await this.send('Runtime.evaluate', {
      expression,
      returnByValue: true,
      awaitPromise: true
    });
    if (res.exceptionDetails) {
      throw new Error(res.exceptionDetails.text || 'Eval error');
    }
    return res.result?.value;
  }

  close() {
    if (this.ws) this.ws.close();
  }
}

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function measurePageLoad(cdp, { cacheDisabled, label }) {
  console.log(`\n======================================================`);
  console.log(`⏱ MEASURING: ${label} (cacheDisabled = ${cacheDisabled})`);
  console.log(`======================================================`);

  // Clear tracking collections
  const requests = new Map(); // requestId -> request data

  const onRequestWillBeSent = (params) => {
    requests.set(params.requestId, {
      url: params.request.url,
      method: params.request.method,
      type: params.type,
      wallTime: params.wallTime,
      encodedDataLength: 0,
      decodedBodyLength: 0,
      fromDiskCache: false,
      fromMemoryCache: false,
      status: null
    });
  };

  const onResponseReceived = (params) => {
    const req = requests.get(params.requestId);
    if (req) {
      req.status = params.response.status;
      req.mimeType = params.response.mimeType;
      req.fromDiskCache = params.response.fromDiskCache || false;
      req.fromMemoryCache = params.response.fromMemoryCache || false;
      req.timing = params.response.timing;
      req.protocol = params.response.protocol;
    }
  };

  const onLoadingFinished = (params) => {
    const req = requests.get(params.requestId);
    if (req) {
      req.encodedDataLength = params.encodedDataLength;
      req.decodedBodyLength = params.encodedDataLength;
    }
  };

  const onDataReceived = (params) => {
    const req = requests.get(params.requestId);
    if (req) {
      req.encodedDataLength = (req.encodedDataLength || 0) + params.dataLength;
    }
  };

  cdp.on('Network.requestWillBeSent', onRequestWillBeSent);
  cdp.on('Network.responseReceived', onResponseReceived);
  cdp.on('Network.loadingFinished', onLoadingFinished);
  cdp.on('Network.dataReceived', onDataReceived);

  await cdp.send('Network.setCacheDisabled', { cacheDisabled });

  if (cacheDisabled) {
    await cdp.send('Network.clearBrowserCache');
  }

  // Navigate to homepage
  await cdp.send('Page.navigate', { url: 'http://localhost:5173/' });

  // Wait for page to stabilize
  await sleep(3500);

  // Collect performance marks from browser window
  const perfData = await cdp.eval(`
    (() => {
      const nav = performance.getEntriesByType('navigation')[0] || {};
      const paintEntries = performance.getEntriesByType('paint') || [];
      const fcpEntry = paintEntries.find(p => p.name === 'first-contentful-paint');
      const fpEntry = paintEntries.find(p => p.name === 'first-paint');

      // Resource timings
      const resources = performance.getEntriesByType('resource').map(r => ({
        name: r.name,
        initiatorType: r.initiatorType,
        transferSize: r.transferSize,
        encodedBodySize: r.encodedBodySize,
        decodedBodySize: r.decodedBodySize,
        duration: r.duration,
        startTime: r.startTime,
        responseEnd: r.responseEnd
      }));

      // Calculate JS resource transfer size
      const jsResources = resources.filter(r => r.initiatorType === 'script' || r.name.endsWith('.js') || r.name.includes('.js?'));
      const jsTransferSize = jsResources.reduce((acc, r) => acc + (r.transferSize || 0), 0);
      const jsDecodedSize = jsResources.reduce((acc, r) => acc + (r.decodedBodySize || 0), 0);

      // DOMContentLoaded
      const dcl = nav.domContentLoadedEventEnd ? (nav.domContentLoadedEventEnd - nav.startTime) : null;
      const load = nav.loadEventEnd ? (nav.loadEventEnd - nav.startTime) : null;
      const ttfb = nav.responseStart ? (nav.responseStart - nav.requestStart) : null;

      return {
        ttfb: ttfb ? Math.round(ttfb) : null,
        dcl: dcl ? Math.round(dcl) : null,
        load: load ? Math.round(load) : null,
        fp: fpEntry ? Math.round(fpEntry.startTime) : null,
        fcp: fcpEntry ? Math.round(fcpEntry.startTime) : null,
        totalResources: resources.length,
        jsCount: jsResources.length,
        jsTransferSize,
        jsDecodedSize,
        jsResourcesList: jsResources.map(r => ({
          url: r.name.split('/').pop().split('?')[0],
          transferSize: r.transferSize,
          decodedSize: r.decodedBodySize,
          duration: Math.round(r.duration)
        }))
      };
    })()
  `);

  // Compute LCP via PerformanceObserver evaluation
  const lcpData = await cdp.eval(`
    new Promise((resolve) => {
      let lcp = null;
      try {
        const po = new PerformanceObserver((entryList) => {
          const entries = entryList.getEntries();
          const lastEntry = entries[entries.length - 1];
          if (lastEntry) lcp = Math.round(lastEntry.startTime);
        });
        po.observe({ type: 'largest-contentful-paint', buffered: true });
        setTimeout(() => {
          po.disconnect();
          resolve(lcp);
        }, 500);
      } catch (e) {
        resolve(null);
      }
    })
  `);

  perfData.lcp = lcpData;

  // Summarize network requests
  let totalTransferBytes = 0;
  let totalDecodedBytes = 0;
  let jsTransferFromNet = 0;
  let jsDecodedFromNet = 0;
  let cachedRequests = 0;

  for (const [id, req] of requests.entries()) {
    totalTransferBytes += req.encodedDataLength || 0;
    if (req.fromDiskCache || req.fromMemoryCache || req.status === 304) {
      cachedRequests++;
    }
    if (req.url.includes('.js') || req.type === 'Script') {
      jsTransferFromNet += req.encodedDataLength || 0;
    }
  }

  const result = {
    label,
    cacheDisabled,
    fcp: perfData.fcp,
    lcp: perfData.lcp || perfData.fcp, // fallback to FCP if LCP observer not buffered
    dcl: perfData.dcl,
    load: perfData.load,
    ttfb: perfData.ttfb,
    jsTransferSize: perfData.jsTransferSize || jsTransferFromNet,
    jsDecodedSize: perfData.jsDecodedSize,
    jsCount: perfData.jsCount,
    totalResources: perfData.totalResources,
    jsResourcesList: perfData.jsResourcesList
  };

  console.log(`Results for ${label}:`);
  console.log(`  - First Contentful Paint (FCP): ${result.fcp} ms`);
  console.log(`  - Largest Contentful Paint (LCP): ${result.lcp} ms`);
  console.log(`  - DOMContentLoaded (DCL):        ${result.dcl} ms`);
  console.log(`  - Page Load Event:               ${result.load} ms`);
  console.log(`  - Time to First Byte (TTFB):     ${result.ttfb} ms`);
  console.log(`  - JS Transfer Size:              ${(result.jsTransferSize / 1024).toFixed(1)} KB`);
  console.log(`  - JS Decoded (Uncompressed):     ${(result.jsDecodedSize / 1024).toFixed(1)} KB`);
  console.log(`  - JS Modules Loaded:             ${result.jsCount}`);

  return result;
}

async function measureApiLatency() {
  console.log(`\n======================================================`);
  console.log(`🌐 MEASURING BACKEND & MONGODB API LATENCY`);
  console.log(`======================================================`);

  const endpoints = [
    { name: 'Health / Root', url: 'http://localhost:5000/' },
    { name: 'Trips GET (MongoDB query)', url: 'http://localhost:5000/api/trips' },
    { name: 'Currency Rates GET', url: 'http://localhost:5000/api/currency/rates' },
    { name: 'Geo Autocomplete GET', url: 'http://localhost:5000/api/geo/search?q=Tokyo' }
  ];

  const results = [];

  for (const ep of endpoints) {
    const runs = [];
    for (let i = 0; i < 3; i++) {
      const start = performance.now();
      try {
        const res = await fetch(ep.url);
        const end = performance.now();
        const duration = end - start;
        runs.push({ status: res.status, duration });
      } catch (err) {
        runs.push({ error: err.message });
      }
      await sleep(100);
    }

    const validRuns = runs.filter(r => r.duration !== undefined);
    const avgDuration = validRuns.length ? Math.round(validRuns.reduce((a, b) => a + b.duration, 0) / validRuns.length) : null;
    const minDuration = validRuns.length ? Math.round(Math.min(...validRuns.map(r => r.duration))) : null;

    console.log(`Endpoint: ${ep.name}`);
    console.log(`  URL: ${ep.url}`);
    console.log(`  Avg Latency: ${avgDuration} ms (min: ${minDuration} ms, status: ${runs[0]?.status})`);

    results.push({
      name: ep.name,
      url: ep.url,
      avgLatencyMs: avgDuration,
      minLatencyMs: minDuration,
      status: runs[0]?.status
    });
  }

  return results;
}

async function run() {
  const wsUrl = await getTargetWsUrl();
  const cdp = new CDPClient(wsUrl);
  await cdp.connect();
  await cdp.send('Page.enable');
  await cdp.send('Network.enable');
  await cdp.send('Runtime.enable');

  // 1. Cold Load (Disable cache ON)
  const coldResults = await measurePageLoad(cdp, { cacheDisabled: true, label: 'Cold Load (Cache Disabled)' });

  // 2. Warm Load (Disable cache OFF)
  // First load to populate cache
  await measurePageLoad(cdp, { cacheDisabled: false, label: 'Pre-warming Cache' });
  // Second load to measure warm cache
  const warmResults = await measurePageLoad(cdp, { cacheDisabled: false, label: 'Warm Load (Cache Enabled)' });

  // 3. API & MongoDB Latency
  const apiResults = await measureApiLatency();

  cdp.close();

  // Summary Comparison Table
  console.log(`\n======================================================`);
  console.log(`📊 COMPARISON: COLD LOAD vs WARM LOAD`);
  console.log(`======================================================`);
  console.table([
    { Metric: 'First Contentful Paint (FCP)', Cold: `${coldResults.fcp} ms`, Warm: `${warmResults.fcp} ms`, Delta: `${warmResults.fcp - coldResults.fcp} ms` },
    { Metric: 'Largest Contentful Paint (LCP)', Cold: `${coldResults.lcp} ms`, Warm: `${warmResults.lcp} ms`, Delta: `${warmResults.lcp - coldResults.lcp} ms` },
    { Metric: 'DOMContentLoaded (DCL)', Cold: `${coldResults.dcl} ms`, Warm: `${warmResults.dcl} ms`, Delta: `${warmResults.dcl - coldResults.dcl} ms` },
    { Metric: 'Page Load Event', Cold: `${coldResults.load} ms`, Warm: `${warmResults.load} ms`, Delta: `${warmResults.load - coldResults.load} ms` },
    { Metric: 'JS Transfer Size', Cold: `${(coldResults.jsTransferSize / 1024).toFixed(1)} KB`, Warm: `${(warmResults.jsTransferSize / 1024).toFixed(1)} KB`, Delta: `${((warmResults.jsTransferSize - coldResults.jsTransferSize) / 1024).toFixed(1)} KB` },
    { Metric: 'JS Total Scripts Loaded', Cold: coldResults.jsCount, Warm: warmResults.jsCount, Delta: warmResults.jsCount - coldResults.jsCount }
  ]);

  // Output JSON report to scratch directory
  const report = {
    coldResults,
    warmResults,
    apiResults,
    timestamp: new Date().toISOString()
  };
  fs.writeFileSync(path.join('scratch', 'p1_measurements.json'), JSON.stringify(report, null, 2));
  console.log('\nP1 Measurement data saved to scratch/p1_measurements.json');
}

run().catch(err => {
  console.error('P1 measurement failed:', err);
  process.exit(1);
});
