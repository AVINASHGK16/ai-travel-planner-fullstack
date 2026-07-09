import React from 'react';
import { Compass, Moon, Sun, Key, User, FolderHeart } from 'lucide-react';

export default function Navbar({
  theme,
  setTheme,
  onOpenSettings,
  auth,
  setAuth,
  setView,
  view
}) {
  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    document.documentElement.classList.toggle('dark', newTheme === 'dark');
  };

  const handleAuthClick = () => {
    if (auth.user) {
      if (confirm('Are you sure you want to logout?')) {
        setAuth({ ...auth, user: null });
      }
    } else {
      setAuth({ ...auth, modalOpen: true });
    }
  };

  return (
    <header className="sticky top-0 z-50 w-full px-6 py-4 glass dark:bg-slate-900/60 border-b border-white/10">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        
        {/* Brand Logo */}
        <div 
          onClick={() => setView('home')} 
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
            onClick={() => setView(view === 'dashboard' ? 'home' : 'dashboard')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium text-sm transition-all duration-300 border ${
              view === 'dashboard'
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white border-transparent'
                : 'text-slate-300 border-white/10 hover:bg-white/5'
            }`}
          >
            <FolderHeart className="w-4.5 h-4.5" />
            <span className="hidden sm:inline">My Trips</span>
          </button>

          {/* Dev/API Keys Settings */}
          <button
            onClick={onOpenSettings}
            title="Configure API Keys"
            className="p-2.5 rounded-xl border border-white/10 text-slate-300 hover:bg-white/5 transition-all duration-200"
          >
            <Key className="w-4.5 h-4.5" />
          </button>

          {/* Light/Dark Toggle */}
          <button
            onClick={toggleTheme}
            className="p-2.5 rounded-xl border border-white/10 text-slate-300 hover:bg-white/5 transition-all duration-200"
          >
            {theme === 'dark' ? (
              <Sun className="w-4.5 h-4.5 text-yellow-400" />
            ) : (
              <Moon className="w-4.5 h-4.5 text-indigo-400" />
            )}
          </button>

          {/* User Profile / Auth */}
          <button
            onClick={handleAuthClick}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-white/10 hover:bg-white/5 text-slate-300 hover:text-white transition-all duration-200"
          >
            <User className="w-4.5 h-4.5 text-blue-400" />
            <span className="text-sm font-medium">
              {auth.user ? auth.user.name.split(' ')[0] : 'Sign In'}
            </span>
          </button>

        </div>
      </div>
    </header>
  );
}
