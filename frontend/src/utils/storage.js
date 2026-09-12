// Robust LocalStorage Wrapper with quota error handling, safe parsing, and schema validation
export const storage = {
  get(key, fallback = null) {
    try {
      if (typeof window === 'undefined' || !window.localStorage) return fallback;
      const item = window.localStorage.getItem(key);
      return item !== null ? item : fallback;
    } catch (e) {
      console.warn(`Storage read error for key "${key}":`, e?.message || e);
      return fallback;
    }
  },
  getJSON(key, fallback = null, validator = null) {
    try {
      if (typeof window === 'undefined' || !window.localStorage) return fallback;
      const raw = window.localStorage.getItem(key);
      if (!raw) return fallback;
      const parsed = JSON.parse(raw);
      if (validator && !validator(parsed)) {
        console.warn(`Storage data validation failed for key "${key}". Using fallback.`);
        return fallback;
      }
      return parsed;
    } catch (e) {
      console.warn(`Storage JSON parse error for key "${key}":`, e?.message || e);
      return fallback;
    }
  },
  set(key, value) {
    try {
      if (typeof window === 'undefined' || !window.localStorage) return false;
      window.localStorage.setItem(key, String(value));
      return true;
    } catch (e) {
      console.warn(`Storage set failed for key "${key}" (Quota exceeded or restricted):`, e?.message || e);
      return false;
    }
  },
  setJSON(key, value) {
    try {
      if (typeof window === 'undefined' || !window.localStorage) return false;
      window.localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (e) {
      console.warn(`Storage setJSON failed for key "${key}" (Quota exceeded or restricted):`, e?.message || e);
      return false;
    }
  },
  remove(key) {
    try {
      if (typeof window === 'undefined' || !window.localStorage) return false;
      window.localStorage.removeItem(key);
      return true;
    } catch (e) {
      console.warn(`Storage remove failed for key "${key}":`, e?.message || e);
      return false;
    }
  }
};

export const isValidUser = (u) => u && typeof u === 'object' && typeof u.email === 'string' && u.email.includes('@');
export const isValidTripsArray = (arr) => Array.isArray(arr);

export default storage;
