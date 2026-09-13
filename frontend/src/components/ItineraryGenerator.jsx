import React, { useState } from 'react';
import { 
  Utensils, Navigation, MapPin, Eye, Moon, Home, 
  Coffee, ShoppingBag, Camera, Compass, ChevronDown, ChevronUp, Clock, DollarSign,
  Pencil, Trash2, Plus
} from 'lucide-react';

const iconMap = {
  Utensils: Utensils,
  Navigation: Navigation,
  MapPin: MapPin,
  Eye: Eye,
  Moon: Moon,
  Home: Home,
  Coffee: Coffee,
  ShoppingBag: ShoppingBag,
  Camera: Camera,
  Compass: Compass
};

export default function ItineraryGenerator({ itinerary, onChangeItinerary }) {
  const [expandedDay, setExpandedDay] = useState(1);
  const [editingActivity, setEditingActivity] = useState(null); // { day, actIdx }

  // Form states
  const [formTime, setFormTime] = useState('');
  const [formTitle, setFormTitle] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formCost, setFormCost] = useState(0);
  const [formIcon, setFormIcon] = useState('Compass');

  if (!itinerary || !Array.isArray(itinerary) || itinerary.length === 0) return null;

  const toggleDay = (day) => {
    setExpandedDay(expandedDay === day ? null : day);
  };

  const handleStartEdit = (day, actIdx, activity) => {
    setEditingActivity({ day, actIdx });
    setFormTime(activity.time || '10:00 AM');
    setFormTitle(activity.title || '');
    setFormDesc(activity.desc || '');
    setFormCost(activity.cost || 0);
    setFormIcon(activity.icon || 'Compass');
  };

  const handleStartAdd = (day) => {
    setEditingActivity({ day, actIdx: -1 });
    setFormTime('10:00 AM');
    setFormTitle('');
    setFormDesc('');
    setFormCost(0);
    setFormIcon('Compass');
  };

  const handleInputKeyDown = (e, day) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSaveActivity(day);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setEditingActivity(null);
    }
  };

  const handleSaveActivity = (day) => {
    if (!formTitle.trim()) {
      alert('Activity title is required.');
      return;
    }

    const newItinerary = itinerary.map((dayPlan, dayIdx) => {
      const planDay = dayPlan.day ?? (dayIdx + 1);
      if (planDay !== day) return dayPlan;

      let newActivities;
      const updatedActivity = {
        time: formTime || '10:00 AM',
        title: formTitle.trim(),
        desc: formDesc.trim(),
        cost: parseFloat(formCost) || 0,
        icon: formIcon
      };

      if (editingActivity.actIdx === -1) {
        // Add new
        newActivities = [...(dayPlan.activities || []), updatedActivity];
      } else {
        // Edit existing
        newActivities = (dayPlan.activities || []).map((act, idx) => 
          idx === editingActivity.actIdx ? updatedActivity : act
        );
      }

      return {
        ...dayPlan,
        activities: newActivities
      };
    });

    if (onChangeItinerary) {
      onChangeItinerary(newItinerary);
    }
    setEditingActivity(null);
  };

  const handleDeleteActivity = (day, actIdx) => {
    if (confirm('Delete this activity from your itinerary?')) {
      const newItinerary = itinerary.map((dayPlan, dayIdx) => {
        const planDay = dayPlan.day ?? (dayIdx + 1);
        if (planDay !== day) return dayPlan;
        return {
          ...dayPlan,
          activities: (dayPlan.activities || []).filter((_, idx) => idx !== actIdx)
        };
      });
      if (onChangeItinerary) {
        onChangeItinerary(newItinerary);
      }
    }
  };

  return (
    <div className="w-full space-y-4">
      
      {/* Title */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-100 mb-3">
        <div>
          <h4 className="font-semibold text-base text-slate-900 tracking-tight">Day-by-Day Travel Guide</h4>
          <p className="text-xs text-slate-500">Chronological travel schedule recommendation</p>
        </div>
      </div>

      {/* Accordion List */}
      <div className="space-y-3">
        {itinerary.filter(Boolean).map((dayPlan, dayIdx) => {
          const dayNumber = dayPlan.day ?? (dayIdx + 1);
          const isExpanded = expandedDay === dayNumber;
          const isAddingForDay = editingActivity && editingActivity.day === dayNumber && editingActivity.actIdx === -1;
          
          return (
            <div 
              key={dayNumber} 
              className="rounded-xl border border-slate-200 overflow-hidden bg-white shadow-xs"
            >
              
              {/* Day Header Trigger */}
              <div
                onClick={() => toggleDay(dayNumber)}
                className="p-4 bg-slate-50/70 hover:bg-slate-100/70 transition-colors cursor-pointer flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <span className="font-mono font-bold text-xs text-blue-700 bg-blue-50 border border-blue-200/60 px-2.5 py-1 rounded-md">
                    DAY {dayNumber}
                  </span>
                  <h5 className="font-semibold text-sm text-slate-900">{dayPlan.title || `Day ${dayNumber} Activities`}</h5>
                </div>
                <div className="text-slate-400">
                  {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                </div>
              </div>

              {/* Day Details Timeline (Content) */}
              {isExpanded && (
                <div className="p-5 border-t border-slate-100 bg-white relative flex flex-col gap-4">
                  
                  {/* Vertical Timeline Guide Line */}
                  <div className="absolute left-8 top-6 bottom-16 w-0.5 bg-slate-200 pointer-events-none"></div>

                  <div className="space-y-6 relative">
                    {(dayPlan.activities || []).map((rawActivity, actIdx) => {
                      const activity = typeof rawActivity === 'string'
                        ? { title: rawActivity, time: '10:00 AM', desc: '', cost: 0, icon: 'Compass' }
                        : rawActivity;
                      if (!activity || typeof activity !== 'object') return null;

                      const isEditingCurrent = editingActivity && editingActivity.day === dayNumber && editingActivity.actIdx === actIdx;
                      const ActivityIcon = iconMap[activity.icon] || Compass;

                      if (isEditingCurrent) {
                        return (
                          <div key={actIdx} className="flex gap-4 items-start relative ml-2 p-4 bg-slate-50 border border-slate-200 rounded-xl text-slate-800">
                            <div className="flex-grow space-y-3 w-full">
                              <div className="grid grid-cols-2 gap-3">
                                <div>
                                  <label className="block text-[10px] text-slate-500 uppercase font-semibold mb-1">Time</label>
                                  <input 
                                    type="text" 
                                    value={formTime}
                                    onKeyDown={(e) => handleInputKeyDown(e, dayNumber)}
                                    onChange={(e) => setFormTime(e.target.value)}
                                    className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500" 
                                  />
                                </div>
                                <div>
                                  <label className="block text-[10px] text-slate-500 uppercase font-semibold mb-1">Cost (₹)</label>
                                  <input 
                                    type="number" 
                                    value={formCost}
                                    onKeyDown={(e) => handleInputKeyDown(e, dayNumber)}
                                    onChange={(e) => setFormCost(e.target.value)}
                                    className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500" 
                                  />
                                </div>
                              </div>
                              <div>
                                <label className="block text-[10px] text-slate-500 uppercase font-semibold mb-1">Title</label>
                                <input 
                                    type="text" 
                                    value={formTitle}
                                    onKeyDown={(e) => handleInputKeyDown(e, dayNumber)}
                                    onChange={(e) => setFormTitle(e.target.value)}
                                    className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-xs text-slate-900 font-medium focus:outline-none focus:ring-1 focus:ring-blue-500" 
                                />
                              </div>
                              <div>
                                <label className="block text-[10px] text-slate-500 uppercase font-semibold mb-1">Description</label>
                                <textarea 
                                  value={formDesc}
                                  onKeyDown={(e) => { if (e.key === 'Escape') setEditingActivity(null); }}
                                  onChange={(e) => setFormDesc(e.target.value)}
                                  rows={2}
                                  className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-xs text-slate-900 leading-relaxed focus:outline-none focus:ring-1 focus:ring-blue-500" 
                                />
                              </div>
                              <div className="flex justify-between items-center gap-3">
                                <div>
                                  <label className="block text-[10px] text-slate-500 uppercase font-semibold mb-1">Icon</label>
                                  <select 
                                    value={formIcon}
                                    onChange={(e) => setFormIcon(e.target.value)}
                                    className="bg-white border border-slate-300 rounded-lg px-2 py-1 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500" 
                                  >
                                    {Object.keys(iconMap).map(iconName => (
                                      <option key={iconName} value={iconName}>{iconName}</option>
                                    ))}
                                  </select>
                                </div>
                                <div className="flex gap-2 self-end">
                                  <button 
                                    type="button"
                                    onClick={() => setEditingActivity(null)} 
                                    className="px-3 py-1 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg text-[11px] font-semibold text-slate-600 transition-colors cursor-pointer"
                                  >
                                    Cancel
                                  </button>
                                  <button 
                                    type="button"
                                    onClick={() => handleSaveActivity(dayNumber)} 
                                    className="px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded-lg text-[11px] font-semibold text-white transition-colors cursor-pointer"
                                  >
                                    Save
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      }

                      return (
                        <div key={actIdx} className="flex gap-4 items-start relative group">
                          
                          {/* Circle Icon Badge */}
                          <div className="z-10 flex items-center justify-center w-7.5 h-7.5 rounded-full bg-blue-50 border border-blue-200 text-blue-600 group-hover:border-blue-400 group-hover:bg-blue-100 transition-colors shrink-0">
                            <ActivityIcon className="w-4 h-4" />
                          </div>

                          {/* Action Info Card */}
                          <div className="flex-grow space-y-1">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                              <span className="text-xs font-semibold text-slate-900">{activity.title}</span>
                              <div className="flex items-center gap-3 font-mono text-[10px] text-slate-500 shrink-0">
                                <span className="flex items-center gap-1">
                                  <Clock className="w-3 h-3 text-slate-400" />
                                  {activity.time}
                                </span>
                                {!Number.isNaN(Number(activity.cost)) && Number(activity.cost) > 0 && (
                                  <span className="text-emerald-700 font-bold">
                                    ₹{Number(activity.cost).toLocaleString()}
                                  </span>
                                )}
                              </div>
                            </div>
                            <p className="text-xs text-slate-600 leading-relaxed font-sans">{activity.desc}</p>
                          </div>

                          {/* Hover action items (Pencil / Trash) */}
                          <div className="opacity-0 group-hover:opacity-100 flex gap-1.5 shrink-0 transition-opacity ml-2">
                            <button
                              type="button"
                              onClick={() => handleStartEdit(dayNumber, actIdx, activity)}
                              className="p-1 bg-white border border-slate-200 hover:border-blue-400 text-slate-500 hover:text-blue-600 rounded transition-colors cursor-pointer"
                              title="Edit Activity"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteActivity(dayNumber, actIdx)}
                              className="p-1 bg-white border border-slate-200 hover:border-red-400 text-slate-500 hover:text-red-600 rounded transition-colors cursor-pointer"
                              title="Delete Activity"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>

                        </div>
                      );
                    })}
                  </div>

                  {/* Inline Form for Adding New Activity */}
                  {isAddingForDay && (
                    <div className="flex gap-4 items-start relative ml-2 p-4 bg-slate-50 border border-blue-200 rounded-xl text-slate-800 mt-2">
                      <div className="flex-grow space-y-3 w-full">
                        <h6 className="text-xs font-bold text-blue-700">Add New Activity</h6>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[10px] text-slate-500 uppercase font-semibold mb-1">Time</label>
                            <input 
                              type="text" 
                              value={formTime}
                              onKeyDown={(e) => handleInputKeyDown(e, dayNumber)}
                              onChange={(e) => setFormTime(e.target.value)}
                              placeholder="e.g. 10:00 AM"
                              className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500" 
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] text-slate-500 uppercase font-semibold mb-1">Cost (₹)</label>
                            <input 
                              type="number" 
                              value={formCost}
                              onKeyDown={(e) => handleInputKeyDown(e, dayNumber)}
                              onChange={(e) => setFormCost(e.target.value)}
                              placeholder="0"
                              className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500" 
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-[10px] text-slate-500 uppercase font-semibold mb-1">Title</label>
                          <input 
                            type="text" 
                            value={formTitle}
                            onKeyDown={(e) => handleInputKeyDown(e, dayNumber)}
                            onChange={(e) => setFormTitle(e.target.value)}
                            placeholder="e.g. Visit Museum"
                            className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-xs text-slate-900 font-medium focus:outline-none focus:ring-1 focus:ring-blue-500" 
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] text-slate-500 uppercase font-semibold mb-1">Description</label>
                          <textarea 
                            value={formDesc}
                            onKeyDown={(e) => { if (e.key === 'Escape') setEditingActivity(null); }}
                            onChange={(e) => setFormDesc(e.target.value)}
                            placeholder="Describe the activity..."
                            rows={2}
                            className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-xs text-slate-900 leading-relaxed focus:outline-none focus:ring-1 focus:ring-blue-500" 
                          />
                        </div>
                        <div className="flex justify-between items-center gap-3">
                          <div>
                            <label className="block text-[10px] text-slate-500 uppercase font-semibold mb-1">Icon</label>
                            <select 
                              value={formIcon}
                              onChange={(e) => setFormIcon(e.target.value)}
                              className="bg-white border border-slate-300 rounded-lg px-2 py-1 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
                            >
                              {Object.keys(iconMap).map(iconName => (
                                <option key={iconName} value={iconName}>{iconName}</option>
                              ))}
                            </select>
                          </div>
                          <div className="flex gap-2 self-end">
                            <button 
                              type="button"
                              onClick={() => setEditingActivity(null)} 
                              className="px-3 py-1 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg text-[11px] font-semibold text-slate-600 transition-colors cursor-pointer"
                            >
                              Cancel
                            </button>
                            <button 
                              type="button"
                              onClick={() => handleSaveActivity(dayNumber)} 
                              className="px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded-lg text-[11px] font-semibold text-white transition-colors cursor-pointer"
                            >
                              Add
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Add Activity Button */}
                  {!isAddingForDay && (
                    <button
                      type="button"
                      onClick={() => handleStartAdd(dayNumber)}
                      className="flex items-center gap-1 px-3 py-1.5 mt-2 rounded-lg text-[11px] font-semibold text-blue-600 hover:text-blue-700 border border-blue-200 hover:border-blue-300 bg-blue-50/50 hover:bg-blue-50 cursor-pointer self-start transition-all ml-12"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Activity</span>
                    </button>
                  )}

                </div>
              )}

            </div>
          );
        })}
      </div>

    </div>
  );
}
