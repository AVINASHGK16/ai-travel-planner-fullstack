import React, { useState } from 'react';
import { X, Mail, Lock, User, KeyRound, Globe } from 'lucide-react';

export default function AuthModal({
  isOpen,
  onClose,
  onLoginSuccess
}) {
  const [mode, setMode] = useState('login'); // 'login' | 'register' | 'forgot'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (mode === 'forgot') {
      alert(`Password reset link sent to ${email}`);
      setMode('login');
      return;
    }

    // Mock successful authentication
    const user = {
      name: mode === 'register' ? name : email.split('@')[0],
      email: email
    };
    onLoginSuccess(user);
    onClose();
  };

  const handleGoogleSignIn = () => {
    const user = {
      name: 'Google Explorer',
      email: 'explorer@gmail.com'
    };
    onLoginSuccess(user);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
      <div className="relative w-full max-w-md overflow-hidden rounded-2xl glass border border-white/15 shadow-2xl p-6 text-slate-200">
        
        {/* Close Button */}
        <button 
          onClick={onClose} 
          className="absolute right-4 top-4 p-1 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="text-center mb-6">
          <h3 className="font-display font-bold text-2xl text-white">
            {mode === 'login' && 'Welcome Back'}
            {mode === 'register' && 'Start Your Adventure'}
            {mode === 'forgot' && 'Reset Password'}
          </h3>
          <p className="text-sm text-slate-400 mt-1.5">
            {mode === 'login' && 'Sign in to access your saved itineraries'}
            {mode === 'register' && 'Create an account to start planning trips'}
            {mode === 'forgot' && "Enter your email to recover your credentials"}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* Name Field (Register Mode) */}
          {mode === 'register' && (
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Full Name
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-3 text-slate-400">
                  <User className="w-4.5 h-4.5" />
                </span>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="John Doe"
                  className="w-full pl-11 pr-4 py-2.5 bg-slate-900/60 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-white placeholder-slate-500"
                />
              </div>
            </div>
          )}

          {/* Email Field */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Email Address
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-3 text-slate-400">
                <Mail className="w-4.5 h-4.5" />
              </span>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full pl-11 pr-4 py-2.5 bg-slate-900/60 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-white placeholder-slate-500"
              />
            </div>
          </div>

          {/* Password Field */}
          {mode !== 'forgot' && (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  Password
                </label>
                {mode === 'login' && (
                  <button
                    type="button"
                    onClick={() => setMode('forgot')}
                    className="text-xs text-blue-400 hover:text-blue-300 hover:underline"
                  >
                    Forgot?
                  </button>
                )}
              </div>
              <div className="relative">
                <span className="absolute left-3.5 top-3 text-slate-400">
                  <Lock className="w-4.5 h-4.5" />
                </span>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-11 pr-4 py-2.5 bg-slate-900/60 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-white placeholder-slate-500"
                />
              </div>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            className="w-full py-3 mt-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-medium rounded-xl transition-all shadow-md shadow-blue-500/20 active:scale-[0.98]"
          >
            {mode === 'login' && 'Sign In'}
            {mode === 'register' && 'Sign Up'}
            {mode === 'forgot' && 'Send Reset Instructions'}
          </button>

          {/* Google SSO (For Login/Register) */}
          {mode !== 'forgot' && (
            <>
              <div className="relative flex py-2 items-center">
                <div className="flex-grow border-t border-white/10"></div>
                <span className="flex-shrink mx-4 text-slate-400 text-xs uppercase tracking-wider">or</span>
                <div className="flex-grow border-t border-white/10"></div>
              </div>

              <button
                type="button"
                onClick={handleGoogleSignIn}
                className="w-full flex items-center justify-center gap-2 py-2.5 border border-white/10 hover:bg-white/5 text-slate-200 rounded-xl font-medium text-sm transition-all"
              >
                <Globe className="w-4 h-4 text-red-400" />
                Continue with Google
              </button>
            </>
          )}

        </form>

        {/* View Toggle Footers */}
        <div className="text-center mt-6 pt-4 border-t border-white/10 text-sm text-slate-400">
          {mode === 'login' && (
            <p>
              New to travel planning?{' '}
              <button onClick={() => setMode('register')} className="text-blue-400 hover:underline">
                Create Account
              </button>
            </p>
          )}
          {mode === 'register' && (
            <p>
              Already have an account?{' '}
              <button onClick={() => setMode('login')} className="text-blue-400 hover:underline">
                Sign In
              </button>
            </p>
          )}
          {mode === 'forgot' && (
            <p>
              Remembered credentials?{' '}
              <button onClick={() => setMode('login')} className="text-blue-400 hover:underline">
                Go Back
              </button>
            </p>
          )}
        </div>

      </div>
    </div>
  );
}
