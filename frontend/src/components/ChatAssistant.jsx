import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, X, Send, Compass, Sparkles, Smile } from 'lucide-react';
import { getAIChatResponse } from '../utils/planner';

export default function ChatAssistant({ tripData, settings }) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { sender: 'assistant', text: "Hello! I'm your AI Travel Assistant. Ask me anything about your trip, packing tips, safety scores, local cuisines, or weather forecasts!" }
  ]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  
  const chatEndRef = useRef(null);

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  const handleSendMessage = async (textToSend) => {
    const text = textToSend || inputText;
    if (!text.trim()) return;

    // Add user message
    const userMsg = { sender: 'user', text };
    setMessages(prev => [...prev, userMsg]);
    setInputText('');
    setLoading(true);

    // Call AI or local response generator
    try {
      let reply = '';
      if (settings.geminiKey) {
        reply = await getAIChatResponse(settings.geminiKey, messages, text, tripData);
      } else {
        // Fallback local rules engine for chat queries
        const lower = text.toLowerCase();
        const from = tripData?.from || 'Origin';
        const to = tripData?.to || 'Destination';
        
        if (lower.includes('packing') || lower.includes('what should i bring') || lower.includes('pack')) {
          reply = `Here is a custom **Packing Checklist** for your trip to ${to}:
- 👕 **Clothing**: Lightweight clothes for daytime, a light jacket (stops/midpoints can get cool in the evening).
- 🔌 **Electronics**: Phone charger, power bank (crucial for road trips), camera, headphones.
- 💊 **First Aid**: Basic painkillers, motion sickness pills (if driving), band-aids.
- 📂 **Documents**: Printed tickets, ID proof, booking vouchers, vehicle papers.
- 🧴 **Toiletries**: Sunscreen (SPF 50+ is recommended as daytime temp is ${tripData?.weather?.temp || '30°C'}), moisturizer, hand sanitizer.`;
        } else if (lower.includes('route') || lower.includes('scenic') || lower.includes('fastest') || lower.includes('highway')) {
          reply = `Based on the route data between **${from}** and **${to}**:
- 🛣️ **Fastest Route**: via national highway (NH 44). Drive takes around ${tripData?.options?.own?.time || '8.5 hours'}, covering ${tripData?.distance || '570'} km. Excellent 4-lane condition.
- 🌳 **Scenic Route**: Diverges at the midway point into state routes, offering beautiful hill vistas but adds about 40 km and 1.5 hours to travel duration.
- 🪙 **Tolls**: Total toll charges estimated around ₹${tripData?.options?.own?.routes?.[0]?.tolls || '700'}.`;
        } else if (lower.includes('restaurant') || lower.includes('eat') || lower.includes('food') || lower.includes('cuisine')) {
          reply = `Here are popular dining spots near the route to **${to}**:
1. **Saravana Bhavan** - Rating: 4.6⭐. Outstanding traditional South Indian vegetarian breakfast and meals.
2. **Grand Highway Plaza** - Rating: 4.4⭐. Multi-cuisine buffet, ideal for quick family dining.
3. **Highway Grill** - Rating: 4.2⭐. Famous for tandoori and North Indian clay oven dishes.`;
        } else if (lower.includes('safety') || lower.includes('safe') || lower.includes('score')) {
          reply = `🛡️ **Safety Assessment for this Route: 8.5/10 (High)**
- **Day Driving**: Highly safe. Road surface is excellent, and traffic moves smoothly.
- **Night Driving**: Moderate safety. We recommend completing the journey by 9:00 PM due to active heavy truck freight traffic.
- **Support**: Mechanics and trauma hubs are situated every 50-80 km on NH 44.`;
        } else if (lower.includes('weather') || lower.includes('temperature') || lower.includes('rain')) {
          reply = `🌦️ **Weather Briefing**:
- Current temperature at ${to} is **${tripData?.weather?.temp || '32°C'}** with **${tripData?.weather?.condition || 'Sunny'}** conditions.
- Transit points forecast: stops like Midpoint average **34°C** and dry skies.
- **Precipitation**: ${tripData?.weather?.rainAlert || 'No rain expected'}. Great weather for travel!`;
        } else if (lower.includes('budget') || lower.includes('cost') || lower.includes('cheap')) {
          reply = `💰 **Budget Optimization Tips**:
- 🚆 **Travel**: Choose Train Sleeper class (₹${tripData?.options?.train?.[1]?.price || '350'} per head) over flights.
- 🏨 **Stay**: Choose transit stays or 3-star lodging to lower lodging costs by up to 40%.
- 🍽️ **Food**: Dine at highway plazas rather than fine-dining resorts to save ₹1,000+ daily.`;
        } else {
          reply = `I'm on simulated mode since there is no Gemini API key entered. However, I can help you with:
1. 🎒 **Packing list Suggestions**
2. 🛣️ **Route details & tolls**
3. 🍽️ **Restaurant recommendations**
4. 🛡️ **Safety ratings**
5. 🌦️ **Weather alerts**
6. 💰 **Budget optimization tips**

Try asking: *"What should I pack for this trip?"* or *"Are there any good restaurants on the way?"*`;
        }
      }
      
      // Artificial slight delay for typing feel
      setTimeout(() => {
        setMessages(prev => [...prev, { sender: 'assistant', text: reply }]);
        setLoading(false);
      }, 600);

    } catch (err) {
      setMessages(prev => [...prev, { sender: 'assistant', text: `Error generating response: ${err.message}` }]);
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') handleSendMessage();
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
        <div className="w-[340px] sm:w-[400px] h-[520px] rounded-2xl glass border border-white/15 shadow-2xl flex flex-col overflow-hidden text-slate-200 animate-slide-up mb-4">
          
          {/* Header */}
          <div className="p-4 bg-gradient-to-r from-blue-600/30 via-indigo-600/30 to-purple-600/30 border-b border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-blue-500 text-white shrink-0">
                <Compass className="w-4.5 h-4.5 animate-spin-slow" />
              </div>
              <div>
                <h4 className="font-display font-bold text-sm text-white flex items-center gap-1.5">
                  Travel Assistant
                  <span className="flex h-2 w-2 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                </h4>
                <p className="text-[9px] text-slate-400 font-mono">
                  {settings.geminiKey ? 'Gemini AI Active' : 'Offline Mode (Local Knowledge)'}
                </p>
              </div>
            </div>
            
            <button 
              onClick={() => setIsOpen(false)}
              className="p-1 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Messages list area */}
          <div className="flex-grow p-4 overflow-y-auto space-y-3.5 custom-scrollbar">
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`p-3 rounded-2xl max-w-[85%] text-xs leading-relaxed ${
                    msg.sender === 'user'
                      ? 'bg-blue-600 text-white rounded-tr-none'
                      : 'bg-slate-900/60 border border-white/10 text-slate-300 rounded-tl-none markdown-style'
                  }`}
                  style={{ whiteSpace: 'pre-line' }}
                  dangerouslySetInnerHTML={{ __html: msg.text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }}
                >
                </div>
              </div>
            ))}
            
            {/* Typing Loader */}
            {loading && (
              <div className="flex items-center gap-1.5 p-3 rounded-2xl bg-slate-900/40 border border-white/10 text-slate-400 text-xs w-20 rounded-tl-none animate-pulse">
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
          <div className="p-2 bg-slate-950/20 border-t border-white/5 flex gap-1.5 overflow-x-auto scrollbar-none whitespace-nowrap select-none">
            {quickPrompts.map((qp, idx) => (
              <button
                key={idx}
                onClick={() => handleSendMessage(qp.text)}
                className="px-2.5 py-1.5 bg-slate-900/70 border border-white/5 hover:border-blue-500/30 text-slate-300 rounded-lg text-[10px] font-semibold transition-all hover:text-white"
              >
                {qp.label}
              </button>
            ))}
          </div>

          {/* Input Box Footer */}
          <div className="p-3 border-t border-white/10 bg-slate-900/40 flex items-center gap-2">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder="Ask travel advice..."
              className="flex-grow px-3 py-2 bg-slate-950/40 border border-white/10 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500 text-xs text-white placeholder-slate-500"
            />
            <button
              onClick={() => handleSendMessage()}
              disabled={loading || !inputText.trim()}
              className="p-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl disabled:opacity-50 disabled:hover:bg-blue-600 transition-colors shrink-0 shadow-md shadow-blue-500/10"
            >
              <Send className="w-4.5 h-4.5" />
            </button>
          </div>

        </div>
      )}

      {/* Floating Toggle Icon */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-4 rounded-full bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white hover:from-blue-500 hover:to-purple-500 shadow-xl shadow-blue-500/20 transition-all duration-300 active:scale-90 hover:scale-105 shrink-0 z-50 flex items-center justify-center"
      >
        {isOpen ? <X className="w-6 h-6" /> : <MessageSquare className="w-6 h-6 animate-pulse" />}
      </button>

    </div>
  );
}
