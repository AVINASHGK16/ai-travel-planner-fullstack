import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import AuthModal from './components/AuthModal';
import SettingsPanel from './components/SettingsPanel';
import HomePage from './pages/HomePage';
import PlannerPage from './pages/PlannerPage';
import DashboardPage from './pages/DashboardPage';
import SettingsPage from './pages/SettingsPage';
import { AuthProvider, useAuth } from './context/AuthContext';
import { storage } from './utils/storage';

export { storage };

function AppLayout({ theme, setTheme, settingsOpen, setSettingsOpen, settings, handleSaveSettings }) {
  const { modalOpen, closeAuthModal, login } = useAuth();

  return (
    <div className={`min-h-screen flex flex-col justify-between ${theme === 'dark' ? 'bg-[#080b11] text-slate-100' : 'bg-slate-50 text-slate-900'}`}>
      
      {/* Global Navbar */}
      <Navbar
        theme={theme}
        setTheme={setTheme}
        onOpenSettings={() => setSettingsOpen(true)}
      />

      {/* Main Routed Content */}
      <main className="flex-grow pb-16">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/plan" element={<PlannerPage />} />
          <Route path="/plan/:tripId" element={<PlannerPage />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      {/* Global Auth Modal */}
      <AuthModal
        isOpen={modalOpen}
        onClose={closeAuthModal}
        onLoginSuccess={login}
      />

      {/* Global Settings Modal */}
      <SettingsPanel
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        settings={settings}
        onSaveSettings={handleSaveSettings}
      />

      {/* Global Footer */}
      <footer className="py-6 border-t border-white/5 text-center text-xs text-slate-500 font-mono">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <p>© {new Date().getFullYear()} AI Travel Planner Inc. All rights reserved.</p>
          <div className="flex gap-4">
            <span className="cursor-pointer hover:text-slate-400">Privacy Policy</span>
            <span>•</span>
            <span className="cursor-pointer hover:text-slate-400">Terms of Use</span>
          </div>
        </div>
      </footer>

    </div>
  );
}

export default function App() {
  const [theme, setTheme] = useState('dark');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settings, setSettings] = useState({
    googleMapsKey: storage.get('googleMapsKey', '')
  });

  const handleSaveSettings = (newSettings) => {
    const key = newSettings?.googleMapsKey || '';
    setSettings({ googleMapsKey: key });
    storage.set('googleMapsKey', key);
    storage.remove('geminiKey');
    storage.remove('openWeatherKey');
    alert('Settings successfully updated!');
  };

  return (
    <BrowserRouter>
      <AuthProvider>
        <AppLayout
          theme={theme}
          setTheme={setTheme}
          settingsOpen={settingsOpen}
          setSettingsOpen={setSettingsOpen}
          settings={settings}
          handleSaveSettings={handleSaveSettings}
        />
      </AuthProvider>
    </BrowserRouter>
  );
}
