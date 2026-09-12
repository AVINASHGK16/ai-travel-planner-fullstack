import React, { useState } from 'react';
import { AppHeader } from './AppHeader';
import { AppSidebar } from './AppSidebar';
import { HelpModal } from './HelpModal';
import { X } from 'lucide-react';

/**
 * Roamly Main Application Shell
 * Wraps persistent desktop sidebar, mobile drawer, sticky header, and main routed viewport.
 */
export function AppShell({ children, onOpenSettings }) {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [helpModalOpen, setHelpModalOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col text-slate-900">
      
      {/* Persistent SaaS Header */}
      <AppHeader
        onToggleSidebar={() => setMobileSidebarOpen((prev) => !prev)}
        onOpenSettings={onOpenSettings}
      />

      {/* Body Area: Sidebar + Main Content */}
      <div className="flex-1 flex min-h-[calc(100vh-60px)]">
        
        {/* Desktop Persistent Sidebar */}
        <AppSidebar
          onOpenHelp={() => setHelpModalOpen(true)}
          className="hidden md:flex sticky top-[60px] h-[calc(100vh-60px)] shrink-0"
        />

        {/* Mobile Slide-Out Drawer */}
        {mobileSidebarOpen && (
          <div className="fixed inset-0 z-50 md:hidden">
            {/* Backdrop */}
            <div
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity animate-fade-in"
              onClick={() => setMobileSidebarOpen(false)}
            />

            {/* Sliding Panel */}
            <div className="relative z-10 w-72 max-w-[80vw] h-full bg-white shadow-xl flex flex-col animate-slide-up">
              <div className="flex items-center justify-between p-4 border-b border-slate-100">
                <span className="font-semibold text-sm text-slate-800">Menu</span>
                <button
                  type="button"
                  onClick={() => setMobileSidebarOpen(false)}
                  aria-label="Close navigation menu"
                  className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto">
                <AppSidebar
                  onOpenHelp={() => {
                    setMobileSidebarOpen(false);
                    setHelpModalOpen(true);
                  }}
                  onCloseMobile={() => setMobileSidebarOpen(false)}
                  className="w-full h-full border-r-0"
                />
              </div>
            </div>
          </div>
        )}

        {/* Main Content Viewport */}
        <main className="flex-1 min-w-0 bg-slate-50 overflow-x-hidden flex flex-col justify-between">
          <div className="flex-1">
            {children}
          </div>

          {/* Minimal SaaS Footer */}
          <footer className="py-5 px-6 border-t border-slate-200/80 bg-white text-xs text-slate-500 font-medium">
            <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
              <p>© {new Date().getFullYear()} Roamly Travel Inc. All rights reserved.</p>
              <div className="flex items-center gap-4">
                <button
                  type="button"
                  onClick={() => setHelpModalOpen(true)}
                  className="hover:text-slate-800 transition-colors cursor-pointer"
                >
                  Support
                </button>
                <span>•</span>
                <span>Privacy Policy</span>
                <span>•</span>
                <span>Terms of Service</span>
              </div>
            </div>
          </footer>
        </main>

      </div>

      {/* Global Help Modal */}
      <HelpModal
        isOpen={helpModalOpen}
        onClose={() => setHelpModalOpen(false)}
      />

    </div>
  );
}

export default AppShell;
