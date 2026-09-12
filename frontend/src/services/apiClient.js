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

/**
 * Simple, normalized error object for API failures.
 * Encapsulates status, code, and user-facing message while maintaining standard Error prototype.
 */
export class ApiError extends Error {
  constructor(message, status = 500, code = 'API_ERROR', details = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

/**
 * Extract or normalize an ApiError from an API response object.
 * @param {Object} res - Response object from request() { ok, status, data }
 * @param {string} [defaultMessage] - Fallback message
 * @returns {ApiError}
 */
export const normalizeApiError = (res, defaultMessage = 'A network error occurred.') => {
  const status = res?.status || 500;
  const data = res?.data;
  const message = data?.details?.[0]?.message || data?.error || res?.statusText || defaultMessage;
  const code = data?.code || (
    status === 429 ? 'RATE_LIMIT_EXCEEDED' :
    status === 401 ? 'UNAUTHORIZED' :
    status === 403 ? 'FORBIDDEN' :
    status === 404 ? 'NOT_FOUND' :
    status === 409 ? 'CONFLICT' : 'API_ERROR'
  );
  return new ApiError(message, status, code, data?.details || null);
};

/**
 * Check if a response indicates an authentication/authorization failure.
 * Components should decide recovery behavior (silent logout vs alert vs modal).
 */
export const isAuthError = (res) => res?.status === 401 || res?.status === 403;

/**
 * Check if a response indicates rate limiting.
 */
export const isRateLimited = (res) => res?.status === 429;
