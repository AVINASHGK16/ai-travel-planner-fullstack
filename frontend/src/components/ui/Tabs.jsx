import React, { createContext, useContext } from 'react';

const TabsContext = createContext({
  activeTab: '',
  setActiveTab: () => {}
});

/**
 * Roamly Tabs Primitives
 */
export function Tabs({ value, onValueChange, children, className = '' }) {
  return (
    <TabsContext.Provider value={{ activeTab: value, setActiveTab: onValueChange }}>
      <div className={`w-full ${className}`}>
        {children}
      </div>
    </TabsContext.Provider>
  );
}

export function TabsList({ children, className = '' }) {
  return (
    <div className={`flex items-center gap-1 p-1 bg-slate-100/90 rounded-lg border border-slate-200/80 overflow-x-auto scrollbar-none ${className}`}>
      {children}
    </div>
  );
}

export function TabsTrigger({ value, children, icon, className = '' }) {
  const { activeTab, setActiveTab } = useContext(TabsContext);
  const isActive = activeTab === value;

  return (
    <button
      type="button"
      onClick={() => setActiveTab(value)}
      className={`inline-flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold rounded-md transition-all duration-150 whitespace-nowrap cursor-pointer select-none ${
        isActive
          ? 'bg-white text-blue-600 shadow-xs border border-slate-200/60'
          : 'text-slate-600 hover:text-slate-900 hover:bg-white/50 border border-transparent'
      } ${className}`}
    >
      {icon && <span className="shrink-0">{icon}</span>}
      <span>{children}</span>
    </button>
  );
}

export function TabsContent({ value, children, className = '' }) {
  const { activeTab } = useContext(TabsContext);
  if (activeTab !== value) return null;

  return (
    <div className={`mt-3 focus:outline-none animate-fade-in ${className}`}>
      {children}
    </div>
  );
}

export default Tabs;
