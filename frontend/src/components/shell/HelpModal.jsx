import React from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { HelpCircle, Sparkles, Plane, ShieldCheck, Mail, ExternalLink } from 'lucide-react';

export function HelpModal({ isOpen, onClose }) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Help & Support"
      description="Learn how to get the most out of Roamly AI Travel Planner"
      maxWidth="lg"
    >
      <div className="space-y-6 text-sm text-slate-600">
        
        {/* Quick Highlights */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="p-3.5 rounded-xl bg-blue-50/70 border border-blue-100 space-y-1.5">
            <div className="flex items-center gap-2 text-blue-700 font-semibold text-xs">
              <Plane className="w-4 h-4" />
              <span>Live Flight Fares</span>
            </div>
            <p className="text-xs text-blue-900/80 leading-relaxed">
              Google Flights inventory via SerpApi provides confirmed commercial flights across Indian domestic carriers (IndiGo, Air India, Akasa Air).
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-purple-50/70 border border-purple-100 space-y-1.5">
            <div className="flex items-center gap-2 text-purple-700 font-semibold text-xs">
              <Sparkles className="w-4 h-4" />
              <span>AI Itineraries</span>
            </div>
            <p className="text-xs text-purple-900/80 leading-relaxed">
              Gemini AI generates narrative daily activities and recommended spots bounded by authoritative road distances and real coordinates.
            </p>
          </div>
        </div>

        {/* FAQs */}
        <div className="space-y-3">
          <h4 className="font-semibold text-xs uppercase tracking-wider text-slate-900">
            Frequently Asked Questions
          </h4>

          <div className="space-y-2 text-xs">
            <div className="p-3 rounded-lg border border-slate-200 bg-white">
              <p className="font-semibold text-slate-800 mb-1">
                How do I compare different travel options?
              </p>
              <p className="text-slate-600 leading-relaxed">
                Use the "Compare & Book Transports" tabs on the Planner page to switch between Flights, Trains, Buses, Cabs, and Own Vehicle. The budget updates dynamically to reflect your chosen transport mode.
              </p>
            </div>

            <div className="p-3 rounded-lg border border-slate-200 bg-white">
              <p className="font-semibold text-slate-800 mb-1">
                Are my saved trips kept when I am offline?
              </p>
              <p className="text-slate-600 leading-relaxed">
                Yes! Trips are automatically cached locally in your browser. When you log in with your account, your trips sync securely with the server database.
              </p>
            </div>

            <div className="p-3 rounded-lg border border-slate-200 bg-white">
              <p className="font-semibold text-slate-800 mb-1">
                Why are flights unavailable for some cities?
              </p>
              <p className="text-slate-600 leading-relaxed">
                Commercial passenger flights do not operate on short corridors under 200 km (e.g. Bangalore to Mysore). Roamly truthfully directs you to Train, Bus, or Road transit.
              </p>
            </div>
          </div>
        </div>

        {/* Contact Strip */}
        <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-white border border-slate-200 text-slate-700">
              <Mail className="w-4 h-4" />
            </div>
            <div>
              <p className="font-medium text-slate-800">Need personalized assistance?</p>
              <p className="text-slate-500">Contact the developer pair team anytime</p>
            </div>
          </div>

          <a
            href="mailto:support@roamly.travel"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg font-medium text-slate-700 transition-colors shrink-0"
          >
            <span>support@roamly.travel</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>

        {/* Close Button */}
        <div className="flex justify-end pt-2">
          <Button variant="outline" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>

      </div>
    </Modal>
  );
}

export default HelpModal;
