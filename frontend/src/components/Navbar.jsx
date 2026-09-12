import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Compass, Moon, Sun, Key, User, FolderHeart } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Navbar({
  theme,
  setTheme,
  onOpenSettings,
  auth: propAuth,
  onLogout: propOnLogout
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const authContext = useAuth();

  const user = propAuth?.user || authContext?.user;
  const logout = propOnLogout || authContext?.logout;
  const openAuthModal = authContext?.openAuthModal;

  const isDashboard = location.pathname === '/dashboard';

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    document.documentElement.classList.toggle('dark', newTheme === 'dark');
  };

  const handleAuthClick = () => {
    if (user) {
      if (confirm('Are you sure you want to logout?')) {
        if (logout) logout();
      }
    } else {
      if (openAuthModal) openAuthModal();
    }
  };

  return (
    <header className="sticky top-0 z-50 w-full px-6 py-4 glass dark:bg-slate-900/60 border-b border-white/10">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        
        {/* Brand Logo */}
        <div 
          onClick={() => navigate('/')} 
          className="flex items-center gap-2 cursor-pointer select-none group"
        >
          <div className="p-2 rounded-xl bg-blue-600 text-white group-hover:scale-110 transition-transform duration-300 shadow-md shadow-blue-500/20">
            <Compass className="w-6 h-6 animate-spin-slow" />
          </div>
          <span className="font-display font-bold text-2xl tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500">
            AI Travel Planner
          </span>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-3">
          
          {/* Dashboard/Saved Trips */}
          <button
            type="button"
            onClick={() => navigate(isDashboard ? '/' : '/dashboard')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium text-sm transition-all duration-300 border cursor-pointer ${
              isDashboard
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white border-transparent'
                : 'text-slate-300 border-white/10 hover:bg-white/5'
            }`}
          >
            <FolderHeart className="w-4.5 h-4.5" />
            <span className="hidden sm:inline">My Trips</span>
          </button>

          {/* Dev/API Keys Settings */}
          <button
            type="button"
            onClick={() => {
              if (onOpenSettings) onOpenSettings();
              else navigate('/settings');
            }}
            title="Configure API Keys"
            className="p-2.5 rounded-xl border border-white/10 text-slate-300 hover:bg-white/5 transition-all duration-200 cursor-pointer"
          >
            <Key className="w-4.5 h-4.5" />
          </button>

          {/* Light/Dark Toggle */}
          <button
            type="button"
            onClick={toggleTheme}
            className="p-2.5 rounded-xl border border-white/10 text-slate-300 hover:bg-white/5 transition-all duration-200 cursor-pointer"
          >
            {theme === 'dark' ? (
              <Sun className="w-4.5 h-4.5 text-yellow-400" />
            ) : (
              <Moon className="w-4.5 h-4.5 text-indigo-400" />
            )}
          </button>

          {/* User Profile / Auth */}
          <button
            type="button"
            onClick={handleAuthClick}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-white/10 hover:bg-white/5 text-slate-300 hover:text-white transition-all duration-200 cursor-pointer"
          >
            <User className="w-4.5 h-4.5 text-blue-400" />
            <span className="text-sm font-medium">
              {user ? (user.name?.split(' ')[0] || user.email?.split('@')[0] || 'User') : 'Sign In'}
            </span>
          </button>

        </div>
      </div>
    </header>
  );
}
