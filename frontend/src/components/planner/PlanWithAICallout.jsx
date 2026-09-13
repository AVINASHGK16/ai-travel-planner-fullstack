import React, { useState } from 'react';
import { Sparkles, ArrowRight, Wand2 } from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';

/**
 * PlanWithAICallout Component — Roamly UI-3
 * Prominent secondary AI callout card.
 * Rule: Purple is reserved EXCLUSIVELY for AI functionality (#7C3AED).
 */
export function PlanWithAICallout({ onApplyPrompt, className = '' }) {
  const [isOpen, setIsOpen] = useState(false);
  const [promptText, setPromptText] = useState('');

  const samplePrompts = [
    { label: 'Goa beach holiday', text: 'Plan a 4-day leisure beach vacation in Goa departing next weekend with ₹45,000 budget for 2 travelers' },
    { label: 'Rajasthan heritage trip', text: 'Plan a 3-day royal palace and heritage tour in Jaipur for 2 travelers with ₹30,000 budget' },
    { label: 'Himachal mountain retreat', text: 'Plan a 5-day scenic mountain getaway to Manali for 2 travelers with ₹40,000 budget' }
  ];

  const handleApply = (text) => {
    const textToUse = text || promptText;
    if (!textToUse.trim()) return;

    if (onApplyPrompt) {
      onApplyPrompt(textToUse.trim());
    }
    setIsOpen(false);
    setPromptText('');
  };

  return (
    <>
      <Card className={`relative overflow-hidden bg-gradient-to-r from-purple-50/90 via-purple-50/50 to-white border border-purple-200/90 shadow-xs max-w-4xl mx-auto ${className}`}>
        <div className="p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1.5 max-w-xl">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-700 border border-purple-200">
              <Sparkles className="w-3.5 h-3.5 text-purple-600" />
              <span>✨ Plan with AI</span>
            </div>
            <h3 className="font-display font-bold text-base sm:text-lg text-slate-900 tracking-tight">
              Describe your dream trip in your own words
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              Describe your dream trip and let Roamly create a personalized itinerary for you with live fares and routes.
            </p>
          </div>

          <div className="shrink-0">
            <Button
              type="button"
              onClick={() => setIsOpen(true)}
              className="w-full sm:w-auto bg-purple-600 hover:bg-purple-700 text-white border-none shadow-xs font-semibold px-5 py-2.5 text-xs sm:text-sm rounded-lg cursor-pointer transition-all hover:shadow-sm flex items-center justify-center gap-2"
            >
              <Sparkles className="w-4 h-4 text-purple-200" />
              <span>Plan with AI</span>
              <ArrowRight className="w-3.5 h-3.5 ml-0.5" />
            </Button>
          </div>
        </div>
      </Card>

      {/* AI Prompt Modal */}
      <Modal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title="✨ Plan with AI Itinerary Assistant"
        maxWidth="lg"
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-600">
            Tell us where you want to go, who is traveling, and what kind of experience you are looking for. Our AI assistant will extract your destinations, dates, and budget.
          </p>

          <div className="space-y-2">
            <label htmlFor="ai-prompt-input" className="block text-xs font-semibold text-slate-700">
              Your Travel Idea or Prompt
            </label>
            <textarea
              id="ai-prompt-input"
              rows={3}
              value={promptText}
              onChange={(e) => setPromptText(e.target.value)}
              placeholder="e.g. We are a couple looking for a 4-day relaxing beach holiday in Goa with around ₹50,000 budget..."
              className="w-full text-sm p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none text-slate-800"
            />
          </div>

          {/* Quick Examples */}
          <div className="space-y-1.5">
            <span className="text-[11px] font-medium text-slate-500 flex items-center gap-1">
              <Wand2 className="w-3 h-3 text-purple-600" /> Or pick a popular inspiration prompt:
            </span>
            <div className="flex flex-col gap-1.5">
              {samplePrompts.map((p, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => handleApply(p.text)}
                  className="text-left text-xs p-2 rounded-md bg-purple-50/70 hover:bg-purple-100/80 text-purple-900 border border-purple-100 transition-colors flex items-center justify-between group cursor-pointer"
                >
                  <span className="font-medium">{p.text}</span>
                  <ArrowRight className="w-3 h-3 text-purple-500 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ml-2" />
                </button>
              ))}
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={!promptText.trim()}
              onClick={() => handleApply(promptText)}
              className="bg-purple-600 hover:bg-purple-700 text-white border-none font-semibold px-4 text-xs"
            >
              Apply Prompt →
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}

export default PlanWithAICallout;
