import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Compass, User, FolderHeart, Settings } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Navbar({
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

  const handleAuthClick = () => {
    if (user) {
      if (logout) logout();
    } else {
      if (openAuthModal) openAuthModal();
    }
  };

  return (
    <header className="sticky top-0 z-50 w-full px-6 py-3 bg-white/95 backdrop-blur-xs border-b border-slate-200">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        
        {/* Brand Logo */}
        <div 
          onClick={() => navigate('/')} 
          className="flex items-center gap-2.5 cursor-pointer select-none group"
        >
          <div className="p-2 rounded-xl bg-blue-600 text-white group-hover:scale-105 transition-transform duration-200 shadow-xs">
            <Compass className="w-5 h-5" />
          </div>
          <span className="font-semibold text-lg tracking-tight text-slate-900">
            Roamly
          </span>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5">
          
          {/* Dashboard/Saved Trips */}
          <button
            type="button"
            onClick={() => navigate(isDashboard ? '/' : '/dashboard')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg font-medium text-xs transition-colors cursor-pointer ${
              isDashboard
                ? 'bg-blue-50 text-blue-700 border border-blue-200'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <FolderHeart className="w-4 h-4" />
            <span className="hidden sm:inline">My Trips</span>
          </button>

          {/* Settings */}
          <button
            type="button"
            onClick={() => {
              if (onOpenSettings) onOpenSettings();
              else navigate('/settings');
            }}
            title="Settings & Preferences"
            className="p-2 rounded-lg border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <Settings className="w-4 h-4" />
          </button>

          {/* User Profile / Auth */}
          <button
            type="button"
            onClick={handleAuthClick}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 transition-colors cursor-pointer text-xs font-medium"
          >
            <User className="w-4 h-4 text-slate-500" />
            <span>
              {user ? (user.name?.split(' ')[0] || user.email?.split('@')[0] || 'User') : 'Sign In'}
            </span>
          </button>

        </div>
      </div>
    </header>
  );
}
