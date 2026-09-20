import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { HelpCircle, Sparkles, Plane, ShieldCheck, Mail, ExternalLink, FileText, Lock, ChevronDown } from 'lucide-react';

export function HelpModal({ isOpen, onClose, initialTab = 'help' }) {
  const [activeTab, setActiveTab] = useState(initialTab);
  const [expandedFaq, setExpandedFaq] = useState(0);

  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        activeTab === 'privacy'
          ? 'Privacy Policy'
          : activeTab === 'terms'
          ? 'Terms of Service'
          : 'Help & Support'
      }
      description={
        activeTab === 'privacy'
          ? 'How Roamly secures and manages your travel data'
          : activeTab === 'terms'
          ? 'Terms governing your use of Roamly AI Travel Planner'
          : 'Learn how to get the most out of Roamly AI Travel Planner'
      }
      maxWidth="lg"
    >
      <div className="space-y-5 text-sm text-[#3E434D]">
        {/* Tab Navigation with 150ms sliding indicator */}
        <div role="tablist" aria-label="Help and legal information" className="flex border-b border-[#E7E5DF] gap-2 pb-1 relative">
          {[
            { id: 'help', label: 'Help & FAQs' },
            { id: 'privacy', label: 'Privacy Policy' },
            { id: 'terms', label: 'Terms of Service' }
          ].map(tab => (
            <button
              key={tab.id}
              id={`help-tab-${tab.id}`}
              role="tab"
              aria-selected={activeTab === tab.id}
              aria-controls={`help-tabpanel-${tab.id}`}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`pb-2 px-3 text-xs font-semibold border-b-2 transition-all duration-150 cursor-pointer ${
                activeTab === tab.id
                  ? 'border-[#2453FF] text-[#2453FF]'
                  : 'border-transparent text-[#737885] hover:text-[#14171F]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content: Help & FAQs */}
        {activeTab === 'help' && (
          <div
            id="help-tabpanel-help"
            role="tabpanel"
            aria-labelledby="help-tab-help"
            className="space-y-6"
          >
            {/* Quick Highlights — Capability callouts with distinctive top borders */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3.5 rounded-xl bg-[#FAFAF8] border border-[#E7E5DF] border-t-[2px] border-t-[#2453FF] space-y-1.5 shadow-xs">
                <div className="flex items-center gap-2 text-[#2453FF] font-semibold text-xs">
                  <Plane className="w-4 h-4" />
                  <span>Live Flight Fares</span>
                </div>
                <p className="text-xs text-[#3E434D] leading-relaxed">
                  Google Flights inventory via SerpApi provides confirmed commercial flights across Indian domestic carriers (IndiGo, Air India, Akasa Air).
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-[#FAFAF8] border border-[#E7E5DF] border-t-[2px] border-t-[#1E9E6B] space-y-1.5 shadow-xs">
                <div className="flex items-center gap-2 text-[#1E9E6B] font-semibold text-xs">
                  <Sparkles className="w-4 h-4" />
                  <span>AI Itineraries</span>
                </div>
                <p className="text-xs text-[#3E434D] leading-relaxed">
                  Gemini AI generates narrative daily activities and recommended spots bounded by authoritative road distances and real coordinates.
                </p>
              </div>
            </div>

            {/* FAQs — Accordion Collapse/Expand with 180deg rotating chevron */}
            <div className="space-y-3">
              <h4 className="font-semibold text-xs uppercase tracking-wider text-[#14171F]">
                Frequently Asked Questions
              </h4>

              <div className="space-y-2 text-xs">
                {[
                  {
                    q: 'How do I compare different travel options?',
                    a: 'Use the "Compare & Book Transports" tabs on the Planner page to switch between Flights, Trains, Buses, Cabs, and Own Vehicle. The budget updates dynamically to reflect your chosen transport mode.'
                  },
                  {
                    q: 'Are my saved trips kept when I am offline?',
                    a: 'Yes! Trips are automatically cached locally in your browser. When you log in with your account, your trips sync securely with the server database.'
                  },
                  {
                    q: 'Why are flights unavailable for some cities?',
                    a: 'Commercial passenger flights do not operate on short corridors under 200 km (e.g. Bangalore to Mysore). Roamly truthfully directs you to Train, Bus, or Road transit.'
                  }
                ].map((faq, idx) => {
                  const isExpanded = expandedFaq === idx;
                  return (
                    <div key={idx} className="rounded-lg border border-[#E7E5DF] bg-white overflow-hidden transition-all duration-150">
                      <button
                        type="button"
                        onClick={() => setExpandedFaq(isExpanded ? null : idx)}
                        className="w-full flex items-center justify-between p-3 text-left font-semibold text-xs text-[#14171F] hover:bg-[#FAFAF8] cursor-pointer"
                        aria-expanded={isExpanded}
                      >
                        <span>{faq.q}</span>
                        <ChevronDown
                          className={`w-4 h-4 text-[#737885] transition-transform duration-150 shrink-0 ml-2 ${
                            isExpanded ? 'rotate-180 text-[#2453FF]' : ''
                          }`}
                        />
                      </button>
                      {isExpanded && (
                        <div className="px-3 pb-3 text-xs text-[#3E434D] leading-relaxed border-t border-[#E7E5DF]/60 pt-2 bg-[#FAFAF8]/50 animate-fade-in">
                          {faq.a}
                        </div>
                      )}
                    </div>
                  );
                })}
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
          </div>
        )}

        {/* Tab Content: Privacy Policy */}
        {activeTab === 'privacy' && (
          <div
            id="help-tabpanel-privacy"
            role="tabpanel"
            aria-labelledby="help-tab-privacy"
            className="space-y-4 text-xs leading-relaxed text-slate-700 max-h-[60vh] overflow-y-auto pr-1"
          >
            <div className="flex items-center gap-2 text-slate-900 font-semibold text-sm">
              <Lock className="w-4 h-4 text-emerald-600" />
              <span>Data Protection & Privacy Commitment</span>
            </div>
            <p>
              At Roamly, your privacy is a foundational priority. We only collect information strictly required to generate itineraries, compare live transport schedules, and synchronize your saved trips.
            </p>
            <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50 space-y-2">
              <h5 className="font-semibold text-slate-900">What We Store:</h5>
              <ul className="list-disc pl-4 space-y-1 text-slate-600">
                <li>Search parameters (origin, destination, dates, travel mode, budget preferences).</li>
                <li>Saved itineraries and custom activity adjustments associated with your account.</li>
                <li>Authentication credentials securely hashed with bcrypt; zero plain-text secrets.</li>
              </ul>
            </div>
            <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50 space-y-2">
              <h5 className="font-semibold text-slate-900">What We Do NOT Do:</h5>
              <ul className="list-disc pl-4 space-y-1 text-slate-600">
                <li>We do not sell, rent, or monetize your travel history or personal identity to advertisers.</li>
                <li>We do not store your credit card or payment credentials. All booking links transfer directly to authorized vendors (e.g. Google Flights, ConfirmTkt, redBus).</li>
              </ul>
            </div>
          </div>
        )}

        {/* Tab Content: Terms of Service */}
        {activeTab === 'terms' && (
          <div
            id="help-tabpanel-terms"
            role="tabpanel"
            aria-labelledby="help-tab-terms"
            className="space-y-4 text-xs leading-relaxed text-slate-700 max-h-[60vh] overflow-y-auto pr-1"
          >
            <div className="flex items-center gap-2 text-slate-900 font-semibold text-sm">
              <FileText className="w-4 h-4 text-blue-600" />
              <span>Terms of Service & Usage Guidelines</span>
            </div>
            <p>
              By accessing and using Roamly AI Travel Planner, you agree to comply with our platform policies and the following guidelines:
            </p>
            <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50 space-y-2">
              <h5 className="font-semibold text-slate-900">1. AI-Generated Travel Advice</h5>
              <p className="text-slate-600">
                Roamly provides dynamic recommendations utilizing Google Gemini AI and authoritative OpenStreetMap/SerpApi data. Schedules, operating hours, and ticket costs are subject to real-world carrier adjustments and seasonal changes. Users are advised to confirm bookings with official providers.
              </p>
            </div>
            <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50 space-y-2">
              <h5 className="font-semibold text-slate-900">2. Booking Redirection</h5>
              <p className="text-slate-600">
                Roamly aggregates live flight, train, bus, and road information. Direct bookings occur externally on provider domains. Roamly is not liable for vendor ticketing delays, baggage policies, or cancellation refunds.
              </p>
            </div>
          </div>
        )}

        {/* Close Button */}
        <div className="flex justify-end pt-2 border-t border-slate-100">
          <Button variant="outline" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>

      </div>
    </Modal>
  );
}

export default HelpModal;
