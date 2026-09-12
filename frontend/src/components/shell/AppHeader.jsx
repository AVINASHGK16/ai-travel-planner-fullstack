import React from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { Compass, Menu, Key, User, LogOut, FolderHeart, Settings as SettingsIcon, ChevronDown } from 'lucide-react';
import { Dropdown, DropdownItem, DropdownDivider } from '../ui/Dropdown';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { useAuth } from '../../context/AuthContext';

export function AppHeader({ onToggleSidebar, onOpenSettings }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout, openAuthModal } = useAuth();

  const getPageTitle = () => {
    const path = location.pathname;
    if (path === '/') return 'Explore & Plan';
    if (path.startsWith('/plan')) return 'Trip Planner';
    if (path === '/dashboard') return 'My Trips';
    if (path === '/settings') return 'Settings';
    return 'Travel Planner';
  };

  const handleLogout = () => {
    if (window.confirm('Are you sure you want to sign out?')) {
      logout();
      navigate('/');
    }
  };

  const userInitials = user?.name
    ? user.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
    : (user?.email ? user.email.slice(0, 2).toUpperCase() : 'U');

  return (
    <header className="sticky top-0 z-40 w-full h-[60px] bg-white border-b border-slate-200 px-4 sm:px-6 flex items-center justify-between shadow-xs select-none">
      
      {/* Left: Brand & Mobile Toggle */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onToggleSidebar}
          className="md:hidden p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
          aria-label="Toggle Navigation Menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <Link
          to="/"
          className="flex items-center gap-2.5 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded-lg"
          aria-label="Roamly Home"
        >
          <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center shadow-xs transition-transform group-hover:scale-105">
            <Compass className="w-4.5 h-4.5" />
          </div>
          <div className="flex items-center gap-2">
            <span className="font-semibold text-lg tracking-tight text-slate-900">
              Roamly
            </span>
            <Badge variant="primary" size="sm" className="hidden sm:inline-flex text-[10px]">
              SaaS
            </Badge>
          </div>
        </Link>
      </div>

      {/* Center: Current Route Context */}
      <div className="hidden lg:flex items-center gap-2 text-xs font-medium text-slate-500">
        <span>Workspace</span>
        <span>/</span>
        <span className="text-slate-800 font-semibold">{getPageTitle()}</span>
      </div>

      {/* Right: Actions & Profile */}
      <div className="flex items-center gap-2.5">
        {/* Settings Key Button */}
        <button
          type="button"
          onClick={onOpenSettings}
          title="Configure API Keys & Settings"
          className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg border border-slate-200/80 transition-colors cursor-pointer"
        >
          <Key className="w-4 h-4" />
        </button>

        {/* User Account / Sign In */}
        {user ? (
          <Dropdown
            align="right"
            trigger={
              <button
                type="button"
                className="flex items-center gap-2 pl-2 pr-2.5 py-1.5 rounded-lg border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-all cursor-pointer"
              >
                <div className="w-6 h-6 rounded-full bg-blue-600 text-white text-[10px] font-bold flex items-center justify-center">
                  {userInitials}
                </div>
                <span className="text-xs font-medium text-slate-700 max-w-[120px] truncate hidden sm:inline">
                  {user.name || user.email?.split('@')[0]}
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>
            }
          >
            <div className="px-3.5 py-2 border-b border-slate-100">
              <p className="text-xs font-semibold text-slate-900 truncate">
                {user.name || 'Account'}
              </p>
              <p className="text-[11px] text-slate-500 truncate">
                {user.email}
              </p>
            </div>

            <DropdownItem
              icon={<FolderHeart className="w-4 h-4" />}
              onClick={() => navigate('/dashboard')}
            >
              My Trips
            </DropdownItem>

            <DropdownItem
              icon={<SettingsIcon className="w-4 h-4" />}
              onClick={onOpenSettings}
            >
              Settings
            </DropdownItem>

            <DropdownDivider />

            <DropdownItem
              icon={<LogOut className="w-4 h-4" />}
              onClick={handleLogout}
              destructive
            >
              Sign Out
            </DropdownItem>
          </Dropdown>
        ) : (
          <Button
            variant="primary"
            size="sm"
            onClick={openAuthModal}
            leftIcon={<User className="w-3.5 h-3.5" />}
          >
            Sign In
          </Button>
        )}
      </div>

    </header>
  );
}

export default AppHeader;
