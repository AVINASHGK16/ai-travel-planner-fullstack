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
  if (!itinerary) return null;

  const [expandedDay, setExpandedDay] = useState(1);
  const [editingActivity, setEditingActivity] = useState(null); // { day, actIdx }

  // Form states
  const [formTime, setFormTime] = useState('');
  const [formTitle, setFormTitle] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formCost, setFormCost] = useState(0);
  const [formIcon, setFormIcon] = useState('Compass');

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

  const handleSaveActivity = (day) => {
    if (!formTitle.trim()) {
      alert('Activity title is required.');
      return;
    }

    const newItinerary = itinerary.map(dayPlan => {
      if (dayPlan.day !== day) return dayPlan;

      let newActivities;
      const updatedActivity = {
        time: formTime,
        title: formTitle,
        desc: formDesc,
        cost: parseFloat(formCost) || 0,
        icon: formIcon
      };

      if (editingActivity.actIdx === -1) {
        // Add new
        newActivities = [...(dayPlan.activities || []), updatedActivity];
      } else {
        // Edit existing
        newActivities = dayPlan.activities.map((act, idx) => 
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
      const newItinerary = itinerary.map(dayPlan => {
        if (dayPlan.day !== day) return dayPlan;
        return {
          ...dayPlan,
          activities: dayPlan.activities.filter((_, idx) => idx !== actIdx)
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
      <div className="flex items-center justify-between pb-2 border-b border-white/5 mb-3">
        <div>
          <h4 className="font-display font-semibold text-base text-white">Day-by-Day Travel Guide</h4>
          <p className="text-xs text-slate-400">Chronological travel schedule recommendation</p>
        </div>
      </div>

      {/* Accordion List */}
      <div className="space-y-3">
        {itinerary.map((dayPlan) => {
          const isExpanded = expandedDay === dayPlan.day;
          const isAddingForDay = editingActivity && editingActivity.day === dayPlan.day && editingActivity.actIdx === -1;
          
          return (
            <div 
              key={dayPlan.day} 
              className="rounded-xl border border-white/10 overflow-hidden bg-slate-900/15"
            >
              
              {/* Day Header Trigger */}
              <div
                onClick={() => toggleDay(dayPlan.day)}
                className="p-4 bg-white/5 hover:bg-white/10 transition-colors cursor-pointer flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <span className="font-display font-extrabold text-sm text-blue-400 bg-blue-500/10 px-3 py-1 rounded-lg">
                    DAY {dayPlan.day}
                  </span>
                  <h5 className="font-semibold text-sm text-white">{dayPlan.title}</h5>
                </div>
                <div className="text-slate-400">
                  {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                </div>
              </div>

              {/* Day Details Timeline (Content) */}
              {isExpanded && (
                <div className="p-5 border-t border-white/5 bg-slate-900/35 relative flex flex-col gap-4">
                  
                  {/* Vertical Timeline Guide Line */}
                  <div className="absolute left-8 top-6 bottom-16 w-0.5 bg-slate-800 pointer-events-none"></div>

                  <div className="space-y-6 relative">
                    {dayPlan.activities?.map((activity, actIdx) => {
                      const isEditingCurrent = editingActivity && editingActivity.day === dayPlan.day && editingActivity.actIdx === actIdx;
                      const ActivityIcon = iconMap[activity.icon] || Compass;

                      if (isEditingCurrent) {
                        return (
                          <div key={actIdx} className="flex gap-4 items-start relative ml-2 p-4 bg-slate-900/60 border border-white/15 rounded-xl text-slate-200">
                            <div className="flex-grow space-y-3 w-full">
                              <div className="grid grid-cols-2 gap-3">
                                <div>
                                  <label className="block text-[10px] text-slate-400 uppercase font-semibold mb-1">Time</label>
                                  <input 
                                    type="text" 
                                    value={formTime}
                                    onChange={(e) => setFormTime(e.target.value)}
                                    className="w-full bg-slate-950 border border-white/10 rounded-lg px-2.5 py-1 text-xs text-white" 
                                  />
                                </div>
                                <div>
                                  <label className="block text-[10px] text-slate-400 uppercase font-semibold mb-1">Cost (₹)</label>
                                  <input 
                                    type="number" 
                                    value={formCost}
                                    onChange={(e) => setFormCost(e.target.value)}
                                    className="w-full bg-slate-950 border border-white/10 rounded-lg px-2.5 py-1 text-xs text-white" 
                                  />
                                </div>
                              </div>
                              <div>
                                <label className="block text-[10px] text-slate-400 uppercase font-semibold mb-1">Title</label>
                                <input 
                                  type="text" 
                                  value={formTitle}
                                  onChange={(e) => setFormTitle(e.target.value)}
                                  className="w-full bg-slate-950 border border-white/10 rounded-lg px-2.5 py-1 text-xs text-white font-medium" 
                                />
                              </div>
                              <div>
                                <label className="block text-[10px] text-slate-400 uppercase font-semibold mb-1">Description</label>
                                <textarea 
                                  value={formDesc}
                                  onChange={(e) => setFormDesc(e.target.value)}
                                  rows={2}
                                  className="w-full bg-slate-950 border border-white/10 rounded-lg px-2.5 py-1 text-xs text-white leading-relaxed" 
                                />
                              </div>
                              <div className="flex justify-between items-center gap-3">
                                <div>
                                  <label className="block text-[10px] text-slate-400 uppercase font-semibold mb-1">Icon</label>
                                  <select 
                                    value={formIcon}
                                    onChange={(e) => setFormIcon(e.target.value)}
                                    className="bg-slate-950 border border-white/10 rounded-lg px-2 py-1 text-xs text-slate-300"
                                  >
                                    {Object.keys(iconMap).map(iconName => (
                                      <option key={iconName} value={iconName}>{iconName}</option>
                                    ))}
                                  </select>
                                </div>
                                <div className="flex gap-2 self-end">
                                  <button 
                                    onClick={() => setEditingActivity(null)} 
                                    className="px-3 py-1 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-[11px] font-semibold text-slate-300 transition-colors"
                                  >
                                    Cancel
                                  </button>
                                  <button 
                                    onClick={() => handleSaveActivity(dayPlan.day)} 
                                    className="px-3 py-1 bg-blue-600 hover:bg-blue-500 rounded-lg text-[11px] font-semibold text-white transition-colors"
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
                          <div className="z-10 flex items-center justify-center w-7.5 h-7.5 rounded-full bg-slate-900 border border-slate-700 text-blue-400 group-hover:border-blue-500/50 group-hover:text-blue-300 transition-colors shrink-0">
                            <ActivityIcon className="w-4 h-4" />
                          </div>

                          {/* Action Info Card */}
                          <div className="flex-grow space-y-1">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                              <span className="text-xs font-semibold text-slate-200">{activity.title}</span>
                              <div className="flex items-center gap-3 font-mono text-[10px] text-slate-500 shrink-0">
                                <span className="flex items-center gap-1">
                                  <Clock className="w-3 h-3 text-slate-600" />
                                  {activity.time}
                                </span>
                                {activity.cost > 0 && (
                                  <span className="text-emerald-400 font-bold">
                                    ₹{activity.cost.toLocaleString()}
                                  </span>
                                )}
                              </div>
                            </div>
                            <p className="text-xs text-slate-400 leading-relaxed font-sans">{activity.desc}</p>
                          </div>

                          {/* Hover action items (Pencil / Trash) */}
                          <div className="opacity-0 group-hover:opacity-100 flex gap-1.5 shrink-0 transition-opacity ml-2">
                            <button
                              onClick={() => handleStartEdit(dayPlan.day, actIdx, activity)}
                              className="p-1 bg-white/5 border border-white/10 hover:border-blue-500/30 text-slate-400 hover:text-blue-400 rounded transition-colors cursor-pointer"
                              title="Edit Activity"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteActivity(dayPlan.day, actIdx)}
                              className="p-1 bg-white/5 border border-white/10 hover:border-red-500/30 text-slate-400 hover:text-red-400 rounded transition-colors cursor-pointer"
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
                    <div className="flex gap-4 items-start relative ml-2 p-4 bg-slate-900/60 border border-blue-500/30 rounded-xl text-slate-200 mt-2">
                      <div className="flex-grow space-y-3 w-full">
                        <h6 className="text-xs font-bold text-blue-400">Add New Activity</h6>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[10px] text-slate-400 uppercase font-semibold mb-1">Time</label>
                            <input 
                              type="text" 
                              value={formTime}
                              onChange={(e) => setFormTime(e.target.value)}
                              placeholder="e.g. 10:00 AM"
                              className="w-full bg-slate-950 border border-white/10 rounded-lg px-2.5 py-1 text-xs text-white" 
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] text-slate-400 uppercase font-semibold mb-1">Cost (₹)</label>
                            <input 
                              type="number" 
                              value={formCost}
                              onChange={(e) => setFormCost(e.target.value)}
                              placeholder="0"
                              className="w-full bg-slate-950 border border-white/10 rounded-lg px-2.5 py-1 text-xs text-white" 
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-[10px] text-slate-400 uppercase font-semibold mb-1">Title</label>
                          <input 
                            type="text" 
                            value={formTitle}
                            onChange={(e) => setFormTitle(e.target.value)}
                            placeholder="e.g. Visit Museum"
                            className="w-full bg-slate-950 border border-white/10 rounded-lg px-2.5 py-1 text-xs text-white font-medium" 
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] text-slate-400 uppercase font-semibold mb-1">Description</label>
                          <textarea 
                            value={formDesc}
                            onChange={(e) => setFormDesc(e.target.value)}
                            placeholder="Describe the activity..."
                            rows={2}
                            className="w-full bg-slate-950 border border-white/10 rounded-lg px-2.5 py-1 text-xs text-white leading-relaxed" 
                          />
                        </div>
                        <div className="flex justify-between items-center gap-3">
                          <div>
                            <label className="block text-[10px] text-slate-400 uppercase font-semibold mb-1">Icon</label>
                            <select 
                              value={formIcon}
                              onChange={(e) => setFormIcon(e.target.value)}
                              className="bg-slate-950 border border-white/10 rounded-lg px-2 py-1 text-xs text-slate-300"
                            >
                              {Object.keys(iconMap).map(iconName => (
                                <option key={iconName} value={iconName}>{iconName}</option>
                              ))}
                            </select>
                          </div>
                          <div className="flex gap-2 self-end">
                            <button 
                              onClick={() => setEditingActivity(null)} 
                              className="px-3 py-1 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-[11px] font-semibold text-slate-300 transition-colors"
                            >
                              Cancel
                            </button>
                            <button 
                              onClick={() => handleSaveActivity(dayPlan.day)} 
                              className="px-3 py-1 bg-blue-600 hover:bg-blue-500 rounded-lg text-[11px] font-semibold text-white transition-colors"
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
                      onClick={() => handleStartAdd(dayPlan.day)}
                      className="flex items-center gap-1 px-3 py-1.5 mt-2 rounded-lg text-[10px] font-bold text-blue-400 hover:text-blue-300 border border-blue-500/20 hover:border-blue-500/40 bg-blue-500/5 hover:bg-blue-500/10 cursor-pointer self-start transition-all ml-12"
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
