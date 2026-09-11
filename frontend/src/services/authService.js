import { request } from './apiClient.js';

export const register = async ({ name, email, password }, signal = null) => {
  const body = { email: email.trim(), password };
  if (name && name.trim()) body.name = name.trim();

  const res = await request('/api/auth/register', {
    method: 'POST',
    body,
    signal,
    timeoutMs: 8000
  });

  if (!res.ok) {
    if (res.status === 429) {
      throw new Error('Too many authentication attempts. Please wait a few minutes before trying again.');
    }
    if (res.status === 409) {
      throw new Error('An account with this email already exists. Please sign in instead.');
    }
    if (res.status === 400) {
      const detailMsg = res.data?.details?.[0]?.message;
      throw new Error(detailMsg || res.data?.error || 'Please check your inputs and try again.');
    }
    if (res.status >= 500) {
      throw new Error('Server error occurred. Please try again in a few moments.');
    }
    throw new Error(res.data?.error || 'Registration failed. Please try again.');
  }

  return res.data; // { token, user }
};

export const login = async ({ email, password }, signal = null) => {
  const body = { email: email.trim(), password };

  const res = await request('/api/auth/login', {
    method: 'POST',
    body,
    signal,
    timeoutMs: 8000
  });

  if (!res.ok) {
    if (res.status === 429) {
      throw new Error('Too many authentication attempts. Please wait a few minutes before trying again.');
    }
    if (res.status === 401) {
      throw new Error('Invalid email or password.');
    }
    if (res.status === 400) {
      const detailMsg = res.data?.details?.[0]?.message;
      throw new Error(detailMsg || res.data?.error || 'Please check your inputs and try again.');
    }
    if (res.status >= 500) {
      throw new Error('Server error occurred. Please try again in a few moments.');
    }
    throw new Error(res.data?.error || 'Authentication failed. Please try again.');
  }

  return res.data; // { token, user }
};

export const getCurrentUser = async (token, signal = null) => {
  const res = await request('/api/auth/me', {
    method: 'GET',
    token,
    signal,
    timeoutMs: 6000
  });

  return {
    ok: res.ok,
    status: res.status,
    user: res.data?.user || null
  };
};

export const logout = async (token, signal = null) => {
  if (!token) return { ok: true };
  try {
    return await request('/api/auth/logout', {
      method: 'POST',
      token,
      signal,
      timeoutMs: 4000
    });
  } catch {
    return { ok: false };
  }
};
