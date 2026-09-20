import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { SettingsForm } from '../components/SettingsForm';

export default function SettingsPage() {
  const navigate = useNavigate();

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      {/* Back to previous route link */}
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-blue-600 transition-colors cursor-pointer"
      >
        <ChevronLeft className="w-4 h-4" />
        <span>Back to Plan</span>
      </button>

      {/* Page Heading & Subtitle */}
      <div>
        <h1 className="font-display text-2xl font-bold text-slate-900 tracking-tight">Settings</h1>
        <p className="text-sm text-slate-500 mt-1">Manage your account and Roamly preferences.</p>
      </div>

      {/* Shared Settings Form in Page Layout */}
      <SettingsForm isModal={false} />
    </div>
  );
}
