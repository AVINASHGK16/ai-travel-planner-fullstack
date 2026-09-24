import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, X, Send, Sparkles, Backpack, ShieldCheck, Utensils, CloudSun } from 'lucide-react';
import { getAIChatResponse } from '../utils/planner';
import { usePreferences } from '../context/PreferencesContext';

// Safe markdown-bold renderer — strictly prevents XSS without dangerouslySetInnerHTML
const renderMessageText = (text) => {
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
const getLocalChatFallback = (text, tripData, formatFn) => {
  const lower = typeof text === 'string' ? text.toLowerCase() : '';
  const from = tripData?.from || 'Origin';
  const to = tripData?.to || 'Destination';
  const fmt = typeof formatFn === 'function' ? formatFn : (v => `₹${v}`);
  
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
    const tollsVal = tripData?.options?.own?.routes?.[0]?.tolls || 700;
    return `Based on the route data between **${from}** and **${to}**:
- 🛣️ **Fastest Route**: via national highway (NH 44). Drive takes around ${tripData?.options?.own?.time || '8.5 hours'}, covering ${tripData?.distance || '570'} km. Excellent 4-lane condition.
- 🌳 **Scenic Route**: Diverges at the midway point into state routes, offering beautiful hill vistas but adds about 40 km and 1.5 hours to travel duration.
- 🪙 **Tolls**: Total toll charges estimated around ${fmt(tollsVal, 'INR')}.`;
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
    const trainVal = tripData?.options?.train?.[1]?.price || 350;
    return `💰 **Budget Optimization Tips**:
- 🚆 **Travel**: Choose Train Sleeper class (${fmt(trainVal, 'INR')} per head) over flights.
- 🏨 **Stay**: Choose transit stays or 3-star lodging to lower lodging costs by up to 40%.
- 🍽️ **Food**: Dine at highway plazas rather than fine-dining resorts to save ${fmt(1000, 'INR')}+ daily.`;
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
  const { convertAndFormat } = usePreferences();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { sender: 'assistant', text: "Hello! I'm your AI Travel Assistant. Ask me anything about your trip, packing tips, safety scores, local cuisines, or weather forecasts!" }
  ]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [isBackendAvailable, setIsBackendAvailable] = useState(true);
  
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
        setIsBackendAvailable(true);
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
      } else {
        if (isMounted.current) {
          setIsBackendAvailable(false);
        }
        fallbackPrefix = 'ℹ️ Live backend currently offline. Displaying local travel intelligence:\n\n';
      }

      // Fallback local rules engine for chat queries
      const localReply = getLocalChatFallback(boundedText, tripData, convertAndFormat);
      const finalReply = `${fallbackPrefix}${localReply}`;
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
    { label: 'Packing List', icon: Backpack, text: 'Suggest a packing list for this trip.' },
    { label: 'Safety Score', icon: ShieldCheck, text: 'What is the safety score of this route?' },
    { label: 'Local Cuisine', icon: Utensils, text: 'Recommend good restaurants on the way.' },
    { label: 'Weather Update', icon: CloudSun, text: 'Give me weather updates for the route stops.' }
  ];

  return (
    <div className="fixed bottom-6 right-6 z-40 flex flex-col items-end">
      
      {/* Expanded Chat Pane with bottom-right origin animation */}
      {isOpen && (
        <div className="w-[340px] sm:w-[400px] h-[520px] rounded-xl bg-white border border-[#E7E5DF] shadow-[0_8px_30px_rgba(20,23,31,0.12)] flex flex-col overflow-hidden text-[#14171F] animate-chat-scale mb-4">
          
          {/* Header */}
          <div className="px-4 py-3.5 bg-[#FAFAF8] border-b border-[#E7E5DF] flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[#2453FF]/10 text-[#2453FF] flex items-center justify-center shrink-0">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <h4 className="font-semibold text-xs sm:text-sm text-[#14171F] flex items-center gap-1.5">
                  AI Travel Guide
                  {isBackendAvailable ? (
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#1E9E6B]/10 text-[#1E9E6B] border border-[#1E9E6B]/20">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#1E9E6B] animate-pulse" />
                      <span>Online</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-[#E8A33D]/10 text-[#E8A33D] border border-[#E8A33D]/20">
                      Offline (Local)
                    </span>
                  )}
                </h4>
                <p className="text-[11px] text-[#737885]">
                  Instant route & destination answers
                </p>
              </div>
            </div>
            
            <button 
              type="button"
              onClick={() => setIsOpen(false)}
              className="p-1 rounded-lg hover:bg-[#E7E5DF]/60 text-[#737885] hover:text-[#14171F] transition-colors cursor-pointer"
              aria-label="Close chat assistant"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Messages list area */}
          <div className="flex-grow p-4 overflow-y-auto space-y-3.5 custom-scrollbar bg-[#FAFAF8]/50">
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`p-3 rounded-xl max-w-[85%] text-xs leading-relaxed ${
                    msg.sender === 'user'
                      ? 'bg-[#2453FF] text-white rounded-tr-none shadow-xs'
                      : 'bg-white border border-[#E7E5DF] text-[#14171F] rounded-tl-none shadow-xs'
                  }`}
                  style={{ whiteSpace: 'pre-line' }}
                >
                  {renderMessageText(msg.text)}
                </div>
              </div>
            ))}
            
            {/* Typing Loader */}
            {loading && (
              <div className="flex items-center gap-1.5 p-3 rounded-xl bg-white border border-[#E7E5DF] text-[#737885] text-xs w-20 rounded-tl-none shadow-xs">
                <span>typing</span>
                <span className="flex gap-0.5 mt-1">
                  <span className="h-1 w-1 bg-[#737885] rounded-full animate-bounce delay-75"></span>
                  <span className="h-1 w-1 bg-[#737885] rounded-full animate-bounce delay-150"></span>
                  <span className="h-1 w-1 bg-[#737885] rounded-full animate-bounce delay-300"></span>
                </span>
              </div>
            )}
            
            <div ref={chatEndRef} />
          </div>

          {/* Quick Prompts list with active press-down scale(0.96) */}
          <div className="p-2 bg-[#FAFAF8] border-t border-[#E7E5DF] flex gap-1.5 overflow-x-auto scrollbar-none whitespace-nowrap select-none">
            {quickPrompts.map((qp, idx) => {
              const PromptIcon = qp.icon;
              return (
                <button
                  key={idx}
                  type="button"
                  disabled={loading}
                  onClick={() => { if (!loading) handleSendMessage(qp.text); }}
                  className={`px-2.5 py-1.5 bg-white border border-[#E7E5DF] rounded-lg text-[11px] font-medium transition-all active:scale-[0.96] inline-flex items-center gap-1.5 ${
                    loading
                      ? 'opacity-50 cursor-not-allowed text-[#737885]'
                      : 'text-[#3E434D] hover:text-[#2453FF] hover:border-[#2453FF]/30 hover:bg-[#FAFAF8] cursor-pointer shadow-xs'
                  }`}
                >
                  <PromptIcon className="w-3 h-3 text-[#737885]" />
                  <span>{qp.label}</span>
                </button>
              );
            })}
          </div>

          {/* Input Box Footer */}
          <div className="p-3 border-t border-[#E7E5DF] bg-white flex items-center gap-2">
            <input
              type="text"
              value={inputText}
              maxLength={1000}
              disabled={loading}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder={loading ? 'Waiting for assistant...' : 'Ask travel advice...'}
              className={`flex-grow px-3 py-2 bg-[#FAFAF8] border border-[#E7E5DF] rounded-lg focus:outline-none focus:bg-white focus:border-[#2453FF] focus:ring-2 focus:ring-[#2453FF]/20 text-xs text-[#14171F] placeholder:text-[#737885] transition-all ${
                loading ? 'opacity-60 cursor-not-allowed' : ''
              }`}
            />
            <button
              type="button"
              onClick={() => handleSendMessage()}
              disabled={loading || !inputText.trim()}
              aria-label="Send message"
              className="p-2 bg-[#2453FF] hover:bg-[#1A3ECC] text-white rounded-lg disabled:opacity-50 disabled:hover:bg-[#2453FF] transition-colors shrink-0 shadow-xs cursor-pointer"
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
        className="p-3.5 rounded-full bg-[#2453FF] hover:bg-[#1A3ECC] text-white shadow-lg shadow-[#2453FF]/25 transition-all duration-150 active:scale-95 shrink-0 z-40 flex items-center justify-center cursor-pointer"
      >
        {isOpen ? <X className="w-5 h-5" /> : <MessageSquare className="w-5 h-5" />}
      </button>

    </div>
  );
}
