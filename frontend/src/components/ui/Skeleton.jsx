import React from 'react';

/**
 * Roamly Skeleton Loading Placeholder
 */
export function Skeleton({ className = '', ...props }) {
  return (
    <div
      className={`animate-pulse bg-slate-200/80 rounded-lg ${className}`}
      {...props}
    />
  );
}

export default Skeleton;
