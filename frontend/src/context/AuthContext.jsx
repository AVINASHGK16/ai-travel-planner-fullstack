import React, { createContext, useContext, useState, useEffect } from 'react';
import { storage, isValidUser } from '../utils/storage';
import { getCurrentUser, logout as apiLogout } from '../services/authService';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [auth, setAuth] = useState({
    user: storage.getJSON('user', null, isValidUser),
    token: storage.get('authToken', null),
    modalOpen: false
  });
  const [loadingAuth, setLoadingAuth] = useState(false);

  // Validate stored auth token on initial mount
  useEffect(() => {
    // Purge any legacy API keys from browser localStorage for security
    storage.remove('geminiKey');
    storage.remove('openWeatherKey');

    let active = true;
    const validateToken = async () => {
      const token = storage.get('authToken', null);
      if (!token) return;

      setLoadingAuth(true);
      try {
        const res = await getCurrentUser(token);
        if (!active) return;

        if (res.ok) {
          if (res.user && isValidUser(res.user)) {
            setAuth(prev => ({ ...prev, user: res.user, token, modalOpen: false }));
            storage.setJSON('user', res.user);
          } else {
            const cachedUser = storage.getJSON('user', null, isValidUser);
            setAuth(prev => ({ ...prev, user: cachedUser, token, modalOpen: false }));
          }
        } else if (res.status === 401 || res.status === 403) {
          // Explicit token rejection from server
          storage.remove('authToken');
          storage.remove('user');
          setAuth({ user: null, token: null, modalOpen: false });
        } else {
          // On 429, 500, or temporary server issues, retain cached user session
          const cachedUser = storage.getJSON('user', null, isValidUser);
          if (cachedUser) {
            setAuth(prev => ({ ...prev, user: cachedUser }));
          }
        }
      } catch {
        // Backend offline or request timed out — use cached user data if available
        if (!active) return;
        const cachedUser = storage.getJSON('user', null, isValidUser);
        if (cachedUser) {
          setAuth(prev => ({ ...prev, user: cachedUser }));
        }
      } finally {
        if (active) setLoadingAuth(false);
      }
    };

    validateToken();
    return () => {
      active = false;
    };
  }, []);

  const handleLoginSuccess = ({ user, token }) => {
    setAuth({ user, token, modalOpen: false });
    storage.set('authToken', token);
    storage.setJSON('user', user);
  };

  const handleLogout = async () => {
    const currentToken = auth.token;
    setAuth({ user: null, token: null, modalOpen: false });
    storage.remove('authToken');
    storage.remove('user');

    if (currentToken) {
      try {
        await apiLogout(currentToken);
      } catch {
        // Local logout completed even if network drops
      }
    }
  };

  const openAuthModal = () => setAuth(prev => ({ ...prev, modalOpen: true }));
  const closeAuthModal = () => setAuth(prev => ({ ...prev, modalOpen: false }));

  const value = {
    user: auth.user,
    token: auth.token,
    modalOpen: auth.modalOpen,
    isAuthenticated: Boolean(auth.user && auth.token),
    loadingAuth,
    login: handleLoginSuccess,
    logout: handleLogout,
    openAuthModal,
    closeAuthModal,
    setAuth
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
