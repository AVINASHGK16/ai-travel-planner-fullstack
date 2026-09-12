import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Compass,
  FolderHeart,
  Bookmark,
  Navigation,
  User,
  HelpCircle,
  Sparkles,
  Settings as SettingsIcon,
  CheckCircle2
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export function AppSidebar({ onOpenHelp, onCloseMobile, className = '' }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, openAuthModal } = useAuth();

  const handleNav = (path, action) => {
    if (action) {
      action();
    } else if (path) {
      navigate(path);
    }
    if (onCloseMobile) {
      onCloseMobile();
    }
  };

  const isPlanActive = location.pathname === '/' || location.pathname.startsWith('/plan');
  const isDashboardActive = location.pathname === '/dashboard' && !location.search.includes('saved');
  const isSavedActive = location.pathname === '/dashboard' && location.search.includes('saved');
  const isProfileActive = location.pathname === '/settings';

  const navItems = [
    {
      id: 'plan',
      label: 'Plan Trip',
      icon: Compass,
      isActive: isPlanActive,
      onClick: () => handleNav('/plan')
    },
    {
      id: 'trips',
      label: 'My Trips',
      icon: FolderHeart,
      isActive: isDashboardActive,
      onClick: () => handleNav('/dashboard')
    },
    {
      id: 'saved',
      label: 'Saved',
      icon: Bookmark,
      isActive: isSavedActive,
      onClick: () => handleNav('/dashboard?tab=saved')
    },
    {
      id: 'destinations',
      label: 'Destinations',
      icon: Navigation,
      isActive: false,
      onClick: () => handleNav('/')
    },
    {
      id: 'profile',
      label: 'Profile',
      icon: User,
      isActive: isProfileActive,
      onClick: () => {
        if (user) {
          handleNav('/settings');
        } else {
          openAuthModal();
          if (onCloseMobile) onCloseMobile();
        }
      }
    }
  ];

  return (
    <aside
      className={`w-64 bg-white border-r border-slate-200/90 flex flex-col justify-between p-3 select-none ${className}`}
    >
      {/* Primary Navigation Section */}
      <div className="space-y-6">
        <div>
          <p className="px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-2">
            Navigation
          </p>
          <nav className="space-y-1">
            {navItems.map((item) => {
              const IconComponent = item.icon;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={item.onClick}
                  className={`w-full flex items-center gap-3 px-3 py-2 text-sm rounded-lg transition-all duration-150 cursor-pointer text-left ${
                    item.isActive
                      ? 'bg-blue-50 text-blue-600 font-semibold shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50 font-medium'
                  }`}
                >
                  <IconComponent
                    className={`w-4.5 h-4.5 shrink-0 ${
                      item.isActive ? 'text-blue-600' : 'text-slate-400'
                    }`}
                  />
                  <span className="truncate">{item.label}</span>
                  {item.id === 'plan' && (
                    <span className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-600" />
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* AI Engine Status Card */}
        <div className="px-3">
          <div className="p-3 rounded-xl bg-purple-50/60 border border-purple-100 space-y-1.5">
            <div className="flex items-center gap-2 text-purple-700 font-semibold text-xs">
              <Sparkles className="w-3.5 h-3.5 shrink-0" />
              <span>Gemini AI Engine</span>
            </div>
            <p className="text-[11px] text-purple-900/70 leading-relaxed">
              Real-time flight search & narrative itineraries ready.
            </p>
          </div>
        </div>
      </div>

      {/* Bottom Section: Help & Status */}
      <div className="pt-4 border-t border-slate-100 space-y-2">
        <button
          type="button"
          onClick={() => {
            if (onOpenHelp) onOpenHelp();
            if (onCloseMobile) onCloseMobile();
          }}
          className="w-full flex items-center gap-3 px-3 py-2 text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-lg transition-colors font-medium text-left cursor-pointer"
        >
          <HelpCircle className="w-4.5 h-4.5 text-slate-400 shrink-0" />
          <span>Help & Support</span>
        </button>

        {/* Status indicator */}
        <div className="px-3 py-2 flex items-center justify-between text-[11px] text-slate-400 font-mono">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-slate-600 font-sans font-medium">Roamly Cloud</span>
          </div>
          <span>v1.2</span>
        </div>
      </div>
    </aside>
  );
}

export default AppSidebar;
