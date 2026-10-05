/**
 * Automated Browser CDP Verification Script
 * Connects directly to the running Chrome instance on port 9222 via Chrome DevTools Protocol.
 * Injects a 12-day trip, navigates to /plan/test-12-day-trip, tests day navigation buttons,
 * verifies Day 9-12 selection, and captures screenshots.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ARTIFACTS_DIR = path.resolve('C:\\Users\\g\\.gemini\\antigravity-ide\\brain\\da900039-4c82-41ff-9d73-da88f7efbd3f');

async function getTargetPageWsUrl() {
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
          if (msg.error) {
            reject(new Error(JSON.stringify(msg.error)));
          } else {
            resolve(msg.result);
          }
        }
      };
    });
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
    if (this.ws) {
      this.ws.close();
    }
  }
}

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function run() {
  console.log('Connecting to Chrome CDP on port 9222...');
  const wsUrl = await getTargetPageWsUrl();
  console.log('Page wsUrl:', wsUrl);

  const cdp = new CDPClient(wsUrl);
  await cdp.connect();
  await cdp.send('Page.enable');
  await cdp.send('Runtime.enable');

  console.log('Step 1: Ingesting 12-day trip mock into localStorage...');
  await cdp.eval(`
    (() => {
      const days12 = Array.from({ length: 12 }, (_, i) => ({
        day: i + 1,
        title: 'Day ' + (i + 1) + ' Grand Tokyo Exploration',
        activities: [
          {
            title: 'Iconic Landmark ' + (i + 1),
            time: '10:00 AM',
            duration: '2h',
            cost: 1500,
            icon: 'MapPin',
            desc: 'Special highlight for Day ' + (i + 1)
          },
          {
            title: 'Afternoon Cultural Tour ' + (i + 1),
            time: '02:30 PM',
            duration: '1h 30m',
            cost: 2000,
            icon: 'Camera',
            desc: 'Sightseeing on Day ' + (i + 1)
          }
        ]
      }));

      const mockTrip12 = {
        _id: 'test-12-day-trip',
        from: 'San Francisco, USA',
        to: 'Tokyo, Japan',
        date: '2026-11-01',
        returnDate: '2026-11-12',
        travelers: 2,
        tripDays: 12,
        currency: 'USD',
        budget: 5000,
        budgetDetails: { total: 4200, tickets: 1800, hotel: 1600, food: 500, misc: 300 },
        weather: { condition: 'Sunny & Pleasant', temp: '19°C' },
        coordinates: { from: [37.7749, -122.4194], to: [35.6762, 139.6503] },
        itinerary: days12
      };

      const existing = JSON.parse(localStorage.getItem('savedTrips') || '[]');
      const updated = [mockTrip12, ...existing.filter(t => t?._id !== 'test-12-day-trip')];
      localStorage.setItem('savedTrips', JSON.stringify(updated));
      return true;
    })()
  `);

  console.log('Step 2: Navigating to /plan/test-12-day-trip...');
  await cdp.send('Page.navigate', { url: 'http://localhost:5173/plan/test-12-day-trip' });
  await sleep(2500);

  console.log('Step 3: Inspecting initial state (Day 1)...');
  const initialData = await cdp.eval(`
    (() => {
      const daysText = document.body.innerText;
      const plannedMatch = daysText.match(/(\\d+)\\s+days planned/i);
      const prevBtn = document.querySelector('button[aria-label="Previous Day"]');
      const nextBtn = document.querySelector('button[aria-label="Next Day"]');
      const dayButtons = Array.from(document.querySelectorAll('button[data-day]')).map(b => ({
        day: b.getAttribute('data-day'),
        text: b.innerText,
        isActive: b.classList.contains('bg-blue-600')
      }));

      return {
        plannedMatch: plannedMatch ? plannedMatch[0] : null,
        prevDisabled: prevBtn ? prevBtn.disabled : null,
        nextDisabled: nextBtn ? nextBtn.disabled : null,
        nextExists: Boolean(nextBtn),
        totalDayButtons: dayButtons.length,
        dayButtonsSummary: dayButtons.map(b => b.text).join(', ')
      };
    })()
  `);
  console.log('Initial day selector inspect:', initialData);

  if (initialData.plannedMatch !== '12 days planned') {
    throw new Error('Expected "12 days planned", found: ' + initialData.plannedMatch);
  }
  if (!initialData.prevDisabled) {
    throw new Error('Previous button should be disabled on Day 1');
  }
  if (initialData.nextDisabled) {
    throw new Error('Next button should be enabled on Day 1');
  }
  if (initialData.totalDayButtons !== 12) {
    throw new Error('Expected 12 day buttons, found: ' + initialData.totalDayButtons);
  }
  console.log('✓ All 12 day buttons are present in the DOM!');
  console.log('✓ Next Day button is enabled and pinned!');

  console.log('Step 4: Clicking Next Day button 8 times to advance to Day 9...');
  for (let i = 2; i <= 9; i++) {
    await cdp.eval(`
      (() => {
        const nextBtn = document.querySelector('button[aria-label="Next Day"]');
        if (nextBtn) nextBtn.click();
      })()
    `);
    await sleep(200);
  }

  const day9Data = await cdp.eval(`
    (() => {
      const activeHeader = document.body.innerText;
      const hasDay9Header = activeHeader.includes('DAY 9');
      const hasDay9Title = activeHeader.includes('Day 9 Grand Tokyo Exploration');
      const hasDay9Act = activeHeader.includes('Iconic Landmark 9');
      const day9Btn = document.querySelector('button[data-day="9"]');
      const container = day9Btn ? day9Btn.parentElement : null;
      let isVisibleInContainer = false;
      if (day9Btn && container) {
        const cRect = container.getBoundingClientRect();
        const bRect = day9Btn.getBoundingClientRect();
        isVisibleInContainer = bRect.left >= cRect.left - 5 && bRect.right <= cRect.right + 5;
      }

      return {
        hasDay9Header,
        hasDay9Title,
        hasDay9Act,
        isDay9Active: day9Btn ? day9Btn.classList.contains('bg-blue-600') : false,
        isVisibleInContainer
      };
    })()
  `);
  console.log('Day 9 verification:', day9Data);
  if (!day9Data.hasDay9Header || !day9Data.hasDay9Title || !day9Data.hasDay9Act) {
    throw new Error('Day 9 content not properly activated');
  }
  console.log('✓ Day 9 reached via Next Day navigation and content rendered!');

  console.log('Step 5: Clicking Day 12 button directly...');
  await cdp.eval(`
    (() => {
      const day12Btn = document.querySelector('button[data-day="12"]');
      if (day12Btn) day12Btn.click();
    })()
  `);
  await sleep(400);

  const day12Data = await cdp.eval(`
    (() => {
      const text = document.body.innerText;
      const hasDay12Header = text.includes('DAY 12');
      const hasDay12Title = text.includes('Day 12 Grand Tokyo Exploration');
      const hasDay12Act = text.includes('Iconic Landmark 12');
      const prevBtn = document.querySelector('button[aria-label="Previous Day"]');
      const nextBtn = document.querySelector('button[aria-label="Next Day"]');
      const day12Btn = document.querySelector('button[data-day="12"]');
      const container = day12Btn ? day12Btn.parentElement : null;
      let isVisibleInContainer = false;
      if (day12Btn && container) {
        const cRect = container.getBoundingClientRect();
        const bRect = day12Btn.getBoundingClientRect();
        isVisibleInContainer = bRect.left >= cRect.left - 5 && bRect.right <= cRect.right + 5;
      }

      return {
        hasDay12Header,
        hasDay12Title,
        hasDay12Act,
        isDay12Active: day12Btn ? day12Btn.classList.contains('bg-blue-600') : false,
        prevDisabled: prevBtn ? prevBtn.disabled : null,
        nextDisabled: nextBtn ? nextBtn.disabled : null,
        isVisibleInContainer
      };
    })()
  `);
  console.log('Day 12 verification:', day12Data);
  if (!day12Data.hasDay12Header || !day12Data.hasDay12Title || !day12Data.hasDay12Act) {
    throw new Error('Day 12 content not properly activated');
  }
  if (!day12Data.nextDisabled) {
    throw new Error('Next button should be disabled on Day 12 (last day)');
  }
  if (day12Data.prevDisabled) {
    throw new Error('Previous button should be enabled on Day 12');
  }
  console.log('✓ Day 12 reached, content rendered, Next button disabled, Previous button enabled!');

  console.log('Step 6: Clicking Previous Day button to navigate back to Day 11...');
  await cdp.eval(`
    (() => {
      const prevBtn = document.querySelector('button[aria-label="Previous Day"]');
      if (prevBtn) prevBtn.click();
    })()
  `);
  await sleep(400);

  const day11Data = await cdp.eval(`
    (() => {
      const text = document.body.innerText;
      return {
        hasDay11Header: text.includes('DAY 11'),
        hasDay11Title: text.includes('Day 11 Grand Tokyo Exploration'),
        hasDay11Act: text.includes('Iconic Landmark 11')
      };
    })()
  `);
  console.log('Day 11 verification:', day11Data);
  if (!day11Data.hasDay11Header || !day11Data.hasDay11Title) {
    throw new Error('Previous Day button did not return to Day 11');
  }
  console.log('✓ Previous Day navigation back to Day 11 verified!');

  console.log('Step 7: Capturing screenshot of 12-day itinerary overview...');
  const screenshotRes = await cdp.send('Page.captureScreenshot', { format: 'png' });
  const screenshotBuffer = Buffer.from(screenshotRes.data, 'base64');
  const screenshotPath = path.join(ARTIFACTS_DIR, 'day_12_navigation_verified.png');
  fs.writeFileSync(screenshotPath, screenshotBuffer);
  console.log('Screenshot saved to:', screenshotPath);

  cdp.close();
  console.log('\n🎉 ALL BROWSER CDP VERIFICATION CHECKS PASSED SUCCESSFULLY!');
}

run().catch(err => {
  console.error('Browser CDP verification failed:', err);
  process.exit(1);
});
