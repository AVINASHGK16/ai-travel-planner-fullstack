import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, X, Send, Sparkles } from 'lucide-react';
import { getAIChatResponse } from '../utils/planner';

// Safe markdown-bold renderer — strictly prevents XSS without dangerouslySetInnerHTML
export const renderMessageText = (text) => {
  if (typeof text !== 'string' || !text) return null;
  const parts = text.split(/(\*\*.*?\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i} className="font-semibold text-slate-900">{part.slice(2, -2)}</strong>;
    }
    return part;
  });
};

// Local fallback rules engine when backend AI is offline or key is unconfigured
export const getLocalChatFallback = (text, tripData) => {
  const lower = typeof text === 'string' ? text.toLowerCase() : '';
  const from = tripData?.from || 'Origin';
  const to = tripData?.to || 'Destination';
  
  if (lower.includes('packing') || lower.includes('what should i bring') || lower.includes('pack')) {
    return `Here is a custom **Packing Checklist** for your trip to ${to}:
- 👕 **Clothing**: Lightweight clothes for daytime, a light jacket (stops/midpoints can get cool in the evening).
- 🔌 **Electronics**: Phone charger, power bank (crucial for road trips), camera, headphones.
- 💊 **First Aid**: Basic painkillers, motion sickness pills (if driving), band-aids.
- 📂 **Documents**: Printed tickets, ID proof, booking vouchers, vehicle papers.
- 🧴 **Toiletries**: Sunscreen (SPF 50+ is recommended as daytime temp is ${tripData?.weather?.temp || '30°C'}), moisturizer, hand sanitizer.`;
  } else if (lower.includes('safety') || lower.includes('safe') || lower.includes('score') || lower.includes('danger')) {
    return `🛡️ **Safety Assessment for this Route: 8.5/10 (High)**
- **Day Driving**: Highly safe. Road surface is excellent, and traffic moves smoothly.
- **Night Driving**: Moderate safety. We recommend completing the journey by 9:00 PM due to active heavy truck freight traffic.
- **Support**: Mechanics and trauma hubs are situated every 50-80 km on NH 44.`;
  } else if (lower.includes('route') || lower.includes('scenic') || lower.includes('fastest') || lower.includes('highway')) {
    return `Based on the route data between **${from}** and **${to}**:
- 🛣️ **Fastest Route**: via national highway (NH 44). Drive takes around ${tripData?.options?.own?.time || '8.5 hours'}, covering ${tripData?.distance || '570'} km. Excellent 4-lane condition.
- 🌳 **Scenic Route**: Diverges at the midway point into state routes, offering beautiful hill vistas but adds about 40 km and 1.5 hours to travel duration.
- 🪙 **Tolls**: Total toll charges estimated around ₹${tripData?.options?.own?.routes?.[0]?.tolls || '700'}.`;
  } else if (lower.includes('restaurant') || lower.includes('eat') || lower.includes('food') || lower.includes('cuisine') || lower.includes('dine')) {
    return `Here are popular dining spots near the route to **${to}**:
1. **Saravana Bhavan** - Rating: 4.6⭐. Outstanding traditional South Indian vegetarian breakfast and meals.
2. **Grand Highway Plaza** - Rating: 4.4⭐. Multi-cuisine buffet, ideal for quick family dining.
3. **Highway Grill** - Rating: 4.2⭐. Famous for tandoori and North Indian clay oven dishes.`;
  } else if (lower.includes('weather') || lower.includes('temperature') || lower.includes('rain')) {
    return `🌦️ **Weather Briefing**:
- Current temperature at ${to} is **${tripData?.weather?.temp || '32°C'}** with **${tripData?.weather?.condition || 'Sunny'}** conditions.
- Transit points forecast: stops like Midpoint average **34°C** and dry skies.
- **Precipitation**: ${tripData?.weather?.rainAlert || 'No rain expected'}. Great weather for travel!`;
  } else if (lower.includes('budget') || lower.includes('cost') || lower.includes('cheap')) {
    return `💰 **Budget Optimization Tips**:
- 🚆 **Travel**: Choose Train Sleeper class (₹${tripData?.options?.train?.[1]?.price || '350'} per head) over flights.
- 🏨 **Stay**: Choose transit stays or 3-star lodging to lower lodging costs by up to 40%.
- 🍽️ **Food**: Dine at highway plazas rather than fine-dining resorts to save ₹1,000+ daily.`;
  }
  return `I can assist you with your trip to **${to}**! You can ask about:
1. 🎒 **Packing list Suggestions**
2. 🛣️ **Route details & tolls**
3. 🍽️ **Restaurant recommendations**
4. 🛡️ **Safety ratings**
5. 🌦️ **Weather alerts**
6. 💰 **Budget optimization tips**

Try asking: *"What should I pack for this trip?"* or *"Are there any good restaurants on the way?"*`;
};

export default function ChatAssistant({ tripData }) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { sender: 'assistant', text: "Hello! I'm your AI Travel Assistant. Ask me anything about your trip, packing tips, safety scores, local cuisines, or weather forecasts!" }
  ]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  
  const chatEndRef = useRef(null);
  const isMounted = useRef(true);
  const abortControllerRef = useRef(null);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const handleSendMessage = async (textToSend) => {
    const rawText = textToSend !== undefined ? textToSend : inputText;
    if (typeof rawText !== 'string') return;
    const text = rawText.trim();
    if (!text || loading) return;

    // Bound message length to 1000 characters matching backend validator
    const boundedText = text.slice(0, 1000);

    // Add user message
    const userMsg = { sender: 'user', text: boundedText };
    const updatedHistory = [...messages, userMsg];
    setMessages(updatedHistory);
    setInputText('');
    setLoading(true);

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      // Call backend AI proxy
      const reply = await getAIChatResponse(updatedHistory, boundedText, tripData, controller.signal);
      if (isMounted.current && !controller.signal.aborted) {
        setMessages(prev => [...prev, { sender: 'assistant', text: reply }]);
      }
    } catch (err) {
      if (controller.signal.aborted) return;
      console.warn('Backend AI unavailable, using intelligent local response:', err.message);

      let fallbackPrefix = '';
      if (err.status === 429 || err.code === 'AI_QUOTA_EXCEEDED') {
        fallbackPrefix = '⚠️ Live AI assistant is currently rate-limited due to high traffic.\nHere is quick route intelligence for your question:\n\n';
      } else if (err.status === 504 || err.name === 'TimeoutError') {
        fallbackPrefix = '⏱️ Live AI response timed out.\nHere is estimated guidance for your question:\n\n';
      }

      // Fallback local rules engine for chat queries
      const localReply = getLocalChatFallback(boundedText, tripData);
      const finalReply = fallbackPrefix ? `${fallbackPrefix}${localReply}` : localReply;
      if (isMounted.current) {
        setMessages(prev => [...prev, { sender: 'assistant', text: finalReply }]);
      }
    } finally {
      if (isMounted.current && !controller.signal.aborted) {
        setLoading(false);
      }
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !loading) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const quickPrompts = [
    { label: '🎒 Packing List', text: 'Suggest a packing list for this trip.' },
    { label: '🛡️ Safety Score', text: 'What is the safety score of this route?' },
    { label: '🍽️ Local Cuisine', text: 'Recommend good restaurants on the way.' },
    { label: '🌦️ Weather Update', text: 'Give me weather updates for the route stops.' }
  ];

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
      
      {/* Expanded Chat Pane */}
      {isOpen && (
        <div className="w-[340px] sm:w-[400px] h-[520px] rounded-2xl bg-white border border-slate-200/90 shadow-2xl flex flex-col overflow-hidden text-slate-800 animate-slide-up mb-4">
          
          {/* Header */}
          <div className="px-4 py-3.5 bg-slate-50 border-b border-slate-200/80 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-purple-50 border border-purple-200 text-purple-700 flex items-center justify-center shrink-0">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <h4 className="font-semibold text-xs sm:text-sm text-slate-900 flex items-center gap-1.5">
                  AI Travel Guide
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    Online
                  </span>
                </h4>
                <p className="text-[11px] text-slate-500">
                  Instant route & destination answers
                </p>
              </div>
            </div>
            
            <button 
              type="button"
              onClick={() => setIsOpen(false)}
              className="p-1 rounded-lg hover:bg-slate-200/60 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
              aria-label="Close chat assistant"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Messages list area */}
          <div className="flex-grow p-4 overflow-y-auto space-y-3.5 custom-scrollbar bg-slate-50/50">
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`p-3 rounded-2xl max-w-[85%] text-xs leading-relaxed ${
                    msg.sender === 'user'
                      ? 'bg-blue-600 text-white rounded-tr-none shadow-xs'
                      : 'bg-white border border-slate-200/80 text-slate-700 rounded-tl-none shadow-xs'
                  }`}
                  style={{ whiteSpace: 'pre-line' }}
                >
                  {renderMessageText(msg.text)}
                </div>
              </div>
            ))}
            
            {/* Typing Loader */}
            {loading && (
              <div className="flex items-center gap-1.5 p-3 rounded-2xl bg-white border border-slate-200/80 text-slate-500 text-xs w-20 rounded-tl-none shadow-xs">
                <span>typing</span>
                <span className="flex gap-0.5 mt-1">
                  <span className="h-1 w-1 bg-slate-400 rounded-full animate-bounce delay-75"></span>
                  <span className="h-1 w-1 bg-slate-400 rounded-full animate-bounce delay-150"></span>
                  <span className="h-1 w-1 bg-slate-400 rounded-full animate-bounce delay-300"></span>
                </span>
              </div>
            )}
            
            <div ref={chatEndRef} />
          </div>

          {/* Quick Prompts list */}
          <div className="p-2 bg-slate-50 border-t border-slate-200/80 flex gap-1.5 overflow-x-auto scrollbar-none whitespace-nowrap select-none">
            {quickPrompts.map((qp, idx) => (
              <button
                key={idx}
                type="button"
                disabled={loading}
                onClick={() => { if (!loading) handleSendMessage(qp.text); }}
                className={`px-2.5 py-1.5 bg-white border border-slate-200/80 rounded-lg text-[11px] font-medium transition-colors ${
                  loading
                    ? 'opacity-50 cursor-not-allowed text-slate-400'
                    : 'text-slate-700 hover:text-blue-600 hover:border-blue-200 hover:bg-blue-50/50 cursor-pointer shadow-xs'
                }`}
              >
                {qp.label}
              </button>
            ))}
          </div>

          {/* Input Box Footer */}
          <div className="p-3 border-t border-slate-200/80 bg-white flex items-center gap-2">
            <input
              type="text"
              value={inputText}
              maxLength={1000}
              disabled={loading}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder={loading ? 'Waiting for assistant...' : 'Ask travel advice...'}
              className={`flex-grow px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-100 text-xs text-slate-900 placeholder:text-slate-400 transition-all ${
                loading ? 'opacity-60 cursor-not-allowed' : ''
              }`}
            />
            <button
              type="button"
              onClick={() => handleSendMessage()}
              disabled={loading || !inputText.trim()}
              aria-label="Send message"
              className="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl disabled:opacity-50 disabled:hover:bg-blue-600 transition-colors shrink-0 shadow-xs cursor-pointer"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>

        </div>
      )}

      {/* Floating Toggle Icon */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-label={isOpen ? 'Close chat assistant' : 'Open chat assistant'}
        className="p-3.5 rounded-full bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/20 transition-all duration-200 active:scale-95 hover:scale-105 shrink-0 z-50 flex items-center justify-center cursor-pointer"
      >
        {isOpen ? <X className="w-5 h-5" /> : <MessageSquare className="w-5 h-5" />}
      </button>

    </div>
  );
}
