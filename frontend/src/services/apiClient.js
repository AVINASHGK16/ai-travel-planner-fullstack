const BACKEND_URL = ((typeof import.meta !== 'undefined' && import.meta.env?.VITE_BACKEND_URL) || (typeof process !== 'undefined' && process.env?.VITE_BACKEND_URL) || 'http://localhost:5000').replace(/\/$/, '');

export const getBackendUrl = () => BACKEND_URL;

export const request = async (endpoint, options = {}) => {
  const {
    method = 'GET',
    headers = {},
    body = null,
    token = null,
    signal = null,
    timeoutMs = null
  } = options;

  const mergedHeaders = {
    'Content-Type': 'application/json',
    ...headers
  };

  if (token) {
    mergedHeaders['Authorization'] = `Bearer ${token}`;
  }

  // Combine signal and timeout if timeoutMs provided
  let effectiveSignal = signal;
  if (timeoutMs && typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function') {
    const timeoutSignal = AbortSignal.timeout(timeoutMs);
    if (signal && typeof AbortSignal.any === 'function') {
      effectiveSignal = AbortSignal.any([signal, timeoutSignal]);
    } else if (!signal) {
      effectiveSignal = timeoutSignal;
    }
  }

  const url = `${BACKEND_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

  const fetchOptions = {
    method,
    headers: mergedHeaders,
    signal: effectiveSignal
  };

  if (body !== null && body !== undefined && method !== 'GET') {
    fetchOptions.body = typeof body === 'string' ? body : JSON.stringify(body);
  }

  const response = await fetch(url, fetchOptions);

  let data = null;
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    try {
      data = await response.json();
    } catch {
      data = null;
    }
  }

  return {
    ok: response.ok,
    status: response.status,
    statusText: response.statusText,
    data
  };
};
