import React, { useState, useEffect } from 'react';
import { Mail, Lock, User, AlertCircle, Loader2 } from 'lucide-react';
import { Modal, Button } from './ui';
import { login, register } from '../services/authService';

export default function AuthModal({
  isOpen,
  onClose,
  onLoginSuccess
}) {
  const [mode, setMode] = useState('login'); // 'login' | 'register' | 'forgot'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Clear stale form inputs and error messages when modal closes
  useEffect(() => {
    if (!isOpen) {
      setEmail('');
      setPassword('');
      setName('');
      setError('');
      setLoading(false);
      setMode('login');
    }
  }, [isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;
    setError('');

    if (mode === 'register' && name.trim().length > 0 && name.trim().length < 2) {
      setError('Name must be at least 2 characters long.');
      return;
    }

    setLoading(true);

    if (mode === 'forgot') {
      setError('Password reset is not yet available. Please contact support.');
      setLoading(false);
      return;
    }

    try {
      const data = mode === 'register'
        ? await register({ name, email, password })
        : await login({ email, password });

      // Pass both user and token to parent
      onLoginSuccess({ user: data.user, token: data.token });

      // Reset form
      setEmail('');
      setPassword('');
      setName('');
      setError('');
    } catch (err) {
      if (err?.name === 'TimeoutError' || err?.name === 'AbortError' || err?.code === 'REQUEST_TIMEOUT') {
        setError({
          message: 'Connection timed out. Please check your network and try again.',
          isNetwork: true
        });
      } else if (err?.code === 'NETWORK_UNAVAILABLE' || err?.message?.toLowerCase()?.includes('failed to fetch') || err?.message?.toLowerCase()?.includes('connect to roamly')) {
        setError({
          message: "We couldn't connect to Roamly right now. Please check your connection and try again.",
          isNetwork: true
        });
      } else {
        const rawMsg = err?.message || '';
        const isTechnical = /TypeError|AxiosError|Failed to fetch|NetworkError|Cannot read|undefined|null|500|jwt/i.test(rawMsg);
        const safeMsg = isTechnical || !rawMsg
          ? "We couldn't process your request right now. Please try again."
          : rawMsg;
        setError({
          message: safeMsg,
          isNetwork: false
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const title = mode === 'login' ? 'Welcome Back' : mode === 'register' ? 'Create an Account' : 'Reset Password';
  const description = mode === 'login'
    ? 'Sign in to access your saved trips and synchronized itineraries.'
    : mode === 'register'
    ? 'Join Roamly to plan, customize, and save your travel itineraries.'
    : 'Password reset is currently unavailable. Please contact support for account recovery assistance.';

  const errorMessage = typeof error === 'object' && error !== null ? error.message : error;
  const isNetworkError = typeof error === 'object' && error !== null ? Boolean(error.isNetwork) : (typeof error === 'string' && error.includes("couldn't connect"));

  return (
    <Modal
      isOpen={isOpen}
      onClose={loading ? () => {} : onClose}
      title={title}
      description={description}
      maxWidth="sm"
    >
      <div className="space-y-4 pt-1">
        {/* Error Notification */}
        {errorMessage && (
          <div
            role="alert"
            aria-live="assertive"
            className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs animate-fade-in space-y-2"
          >
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span className="leading-relaxed">{errorMessage}</span>
            </div>
            {isNetworkError && (
              <div className="pt-1 pl-6">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={handleSubmit}
                  disabled={loading}
                  className="h-7 text-xs px-3 bg-white text-red-700 border-red-300 hover:bg-red-100 hover:text-red-900 cursor-pointer shadow-none"
                >
                  Try Again
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-3.5">
          {mode === 'register' && (
            <div>
              <label htmlFor="auth-name" className="block text-xs font-medium text-slate-700 mb-1.5">
                Full Name
              </label>
              <div className="flex items-center gap-2 bg-white border border-slate-300 rounded-lg px-3 py-2 focus-within:border-blue-600 focus-within:ring-2 focus-within:ring-blue-100 transition-all">
                <User className="w-4 h-4 text-slate-400 shrink-0" />
                <input
                  id="auth-name"
                  type="text"
                  placeholder="Your full name"
                  value={name}
                  disabled={loading}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full text-xs text-slate-900 placeholder:text-slate-400 bg-transparent outline-none disabled:opacity-60"
                />
              </div>
            </div>
          )}

          <div>
            <label htmlFor="auth-email" className="block text-xs font-medium text-slate-700 mb-1.5">
              Email Address
            </label>
            <div className="flex items-center gap-2 bg-white border border-slate-300 rounded-lg px-3 py-2 focus-within:border-blue-600 focus-within:ring-2 focus-within:ring-blue-100 transition-all">
              <Mail className="w-4 h-4 text-slate-400 shrink-0" />
              <input
                id="auth-email"
                type="email"
                placeholder="you@example.com"
                value={email}
                disabled={loading}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full text-xs text-slate-900 placeholder:text-slate-400 bg-transparent outline-none disabled:opacity-60"
              />
            </div>
          </div>

          {mode !== 'forgot' && (
            <div>
              <label htmlFor="auth-password" className="block text-xs font-medium text-slate-700 mb-1.5">
                Password
              </label>
              <div className="flex items-center gap-2 bg-white border border-slate-300 rounded-lg px-3 py-2 focus-within:border-blue-600 focus-within:ring-2 focus-within:ring-blue-100 transition-all">
                <Lock className="w-4 h-4 text-slate-400 shrink-0" />
                <input
                  id="auth-password"
                  type="password"
                  placeholder={mode === 'register' ? 'Minimum 6 characters' : '••••••••'}
                  value={password}
                  disabled={loading}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={mode === 'register' ? 6 : undefined}
                  className="w-full text-xs text-slate-900 placeholder:text-slate-400 bg-transparent outline-none disabled:opacity-60"
                />
              </div>
            </div>
          )}

          <Button
            type="submit"
            variant="primary"
            size="md"
            disabled={loading}
            className="w-full mt-2 font-medium justify-center"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                <span>{mode === 'login' ? 'Signing In...' : mode === 'register' ? 'Creating Account...' : 'Sending Link...'}</span>
              </>
            ) : (
              <span>{mode === 'login' ? 'Sign In' : mode === 'register' ? 'Create Account' : 'Send Reset Link'}</span>
            )}
          </Button>
        </form>

        {/* Mode Switches */}
        <div className="flex items-center justify-between text-xs text-slate-500 pt-3 border-t border-slate-100">
          {mode === 'login' ? (
            <>
              <button
                type="button"
                disabled={loading}
                onClick={() => { setMode('register'); setError(''); }}
                className="hover:text-blue-600 transition-colors cursor-pointer disabled:opacity-50"
              >
                Need an account? <span className="text-blue-600 font-semibold">Sign Up</span>
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={() => { setMode('forgot'); setError(''); }}
                className="hover:text-blue-600 transition-colors cursor-pointer disabled:opacity-50"
              >
                Forgot Password?
              </button>
            </>
          ) : mode === 'register' ? (
            <button
              type="button"
              disabled={loading}
              onClick={() => { setMode('login'); setError(''); }}
              className="hover:text-blue-600 transition-colors cursor-pointer disabled:opacity-50 mx-auto"
            >
              Already have an account? <span className="text-blue-600 font-semibold">Sign In</span>
            </button>
          ) : (
            <button
              type="button"
              disabled={loading}
              onClick={() => { setMode('login'); setError(''); }}
              className="hover:text-blue-600 transition-colors cursor-pointer disabled:opacity-50 mx-auto"
            >
              Back to <span className="text-blue-600 font-semibold">Sign In</span>
            </button>
          )}
        </div>
      </div>
    </Modal>
  );
}
