import React, { useState } from 'react';
import { X, Mail, Lock, User, AlertCircle, Loader2 } from 'lucide-react';

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (mode === 'forgot') {
      setError('Password reset is not yet available. Please contact support.');
      setLoading(false);
      return;
    }

    try {
      const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';
      const endpoint = mode === 'register' ? '/api/auth/register' : '/api/auth/login';

      const body = { email: email.trim(), password };
      if (mode === 'register') body.name = name.trim();

      const response = await fetch(`${backendUrl}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(8000)
      });

      let data = {};
      try {
        data = await response.json();
      } catch {
        data = { error: `Server returned ${response.status} ${response.statusText || 'Error'}` };
      }

      if (!response.ok) {
        if (response.status === 429) {
          throw new Error('Too many authentication attempts. Please wait a few minutes before trying again.');
        }
        if (response.status === 409) {
          throw new Error('An account with this email already exists. Please sign in instead.');
        }
        if (response.status === 401) {
          throw new Error('Invalid email or password.');
        }
        if (response.status === 400) {
          const detailMsg = data.details?.[0]?.message;
          throw new Error(detailMsg || data.error || 'Please check your inputs and try again.');
        }
        if (response.status >= 500) {
          throw new Error('Server error occurred. Please try again in a few moments.');
        }
        throw new Error(data.error || 'Authentication failed. Please try again.');
      }

      // Pass both user and token to parent
      onLoginSuccess({ user: data.user, token: data.token });
      
      // Reset form
      setEmail('');
      setPassword('');
      setName('');
      setError('');
    } catch (err) {
      if (err.name === 'TimeoutError' || err.name === 'AbortError') {
        setError('Connection timed out. Please check your network and try again.');
      } else {
        setError(err.message || 'Something went wrong. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center">
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose}></div>

      {/* Modal Card */}
      <div className="relative z-10 w-full max-w-md mx-4 rounded-2xl glass border border-white/10 p-7 text-white animate-slide-up">

        {/* Close */}
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors">
          <X className="w-5 h-5" />
        </button>

        {/* Title */}
        <h2 className="font-display font-bold text-2xl mb-1">
          {mode === 'login' ? 'Welcome Back' : mode === 'register' ? 'Create Account' : 'Reset Password'}
        </h2>
        <p className="text-xs text-slate-400 mb-6">
          {mode === 'login'
            ? 'Sign in to access your saved trips and itineraries.'
            : mode === 'register'
            ? 'Join us to plan and save your travel adventures.'
            : 'Enter your email to receive a reset link.'}
        </p>

        {/* Error Message */}
        {error && (
          <div className="flex items-center gap-2 p-3 mb-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">

          {mode === 'register' && (
            <div>
              <label className="block text-[10px] uppercase text-slate-400 font-semibold mb-1.5 tracking-wider">Full Name</label>
              <div className="flex items-center gap-2 bg-slate-900/60 border border-white/10 rounded-xl px-3 py-2.5 focus-within:border-blue-500/50 transition-colors">
                <User className="w-4 h-4 text-slate-500" />
                <input
                  type="text"
                  placeholder="Your name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="bg-transparent w-full text-sm outline-none text-white placeholder-slate-500"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-[10px] uppercase text-slate-400 font-semibold mb-1.5 tracking-wider">Email</label>
            <div className="flex items-center gap-2 bg-slate-900/60 border border-white/10 rounded-xl px-3 py-2.5 focus-within:border-blue-500/50 transition-colors">
              <Mail className="w-4 h-4 text-slate-500" />
              <input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="bg-transparent w-full text-sm outline-none text-white placeholder-slate-500"
              />
            </div>
          </div>

          {mode !== 'forgot' && (
            <div>
              <label className="block text-[10px] uppercase text-slate-400 font-semibold mb-1.5 tracking-wider">Password</label>
              <div className="flex items-center gap-2 bg-slate-900/60 border border-white/10 rounded-xl px-3 py-2.5 focus-within:border-blue-500/50 transition-colors">
                <Lock className="w-4 h-4 text-slate-500" />
                <input
                  type="password"
                  placeholder={mode === 'register' ? 'Min 6 characters' : '••••••••'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={mode === 'register' ? 6 : undefined}
                  className="bg-transparent w-full text-sm outline-none text-white placeholder-slate-500"
                />
              </div>
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>{mode === 'login' ? 'Signing In...' : mode === 'register' ? 'Creating Account...' : 'Sending...'}</span>
              </>
            ) : (
              <span>{mode === 'login' ? 'Sign In' : mode === 'register' ? 'Create Account' : 'Send Reset Link'}</span>
            )}
          </button>
        </form>

        {/* Toggle Modes */}
        <div className="flex items-center justify-between text-[11px] text-slate-400 mt-5 pt-4 border-t border-white/5">
          {mode === 'login' ? (
            <>
              <button onClick={() => { setMode('register'); setError(''); }} className="hover:text-blue-400 transition-colors cursor-pointer">
                Don't have an account? <span className="text-blue-400 font-semibold">Sign Up</span>
              </button>
              <button onClick={() => { setMode('forgot'); setError(''); }} className="hover:text-blue-400 transition-colors cursor-pointer">
                Forgot Password?
              </button>
            </>
          ) : mode === 'register' ? (
            <button onClick={() => { setMode('login'); setError(''); }} className="hover:text-blue-400 transition-colors cursor-pointer">
              Already have an account? <span className="text-blue-400 font-semibold">Sign In</span>
            </button>
          ) : (
            <button onClick={() => { setMode('login'); setError(''); }} className="hover:text-blue-400 transition-colors cursor-pointer">
              Back to <span className="text-blue-400 font-semibold">Sign In</span>
            </button>
          )}
        </div>

      </div>
    </div>
  );
}
