import React, { useState, Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import AuthModal from './components/AuthModal';
import SettingsPanel from './components/SettingsPanel';
import HomePage from './pages/HomePage';
import { AuthProvider, useAuth } from './context/AuthContext';
import { storage } from './utils/storage';

export { storage };

// Technically justified code splitting for heavy page-level modules
const PlannerPage = lazy(() => import('./pages/PlannerPage'));
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));

import { PreferencesProvider, usePreferences } from './context/PreferencesContext';
import { AppShell } from './components/shell';

function PageFallback() {
  return (
    <div className="flex flex-col items-center justify-center py-32 text-center space-y-3">
      <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      <p className="text-xs text-slate-500 font-medium tracking-wide">Loading module...</p>
    </div>
  );
}

function AppLayout({ settingsOpen, setSettingsOpen }) {
  const { modalOpen, closeAuthModal, login } = useAuth();
  const { preferences, updatePreferences } = usePreferences();

  const handleSaveSettings = (newSettings) => {
    updatePreferences(newSettings);
    // Clean up legacy keys if any existed
    storage.remove('googleMapsKey');
    storage.remove('geminiKey');
    storage.remove('openWeatherKey');
  };

  return (
    <AppShell onOpenSettings={() => setSettingsOpen(true)}>
      {/* Main Routed Content with Suspense Loading Fallback */}
      <Suspense fallback={<PageFallback />}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/plan" element={<PlannerPage />} />
          <Route path="/plan/:tripId" element={<PlannerPage />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>

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
        settings={preferences}
        onSaveSettings={handleSaveSettings}
      />
    </AppShell>
  );
}

export default function App() {
  const [settingsOpen, setSettingsOpen] = useState(false);

  return (
    <BrowserRouter>
      <AuthProvider>
        <PreferencesProvider>
          <AppLayout
            settingsOpen={settingsOpen}
            setSettingsOpen={setSettingsOpen}
          />
        </PreferencesProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
