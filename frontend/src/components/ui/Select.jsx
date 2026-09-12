import React from 'react';
import { ChevronDown } from 'lucide-react';

/**
 * Roamly Select Primitive
 * @param {Object} props
 * @param {string} [props.label]
 * @param {string} [props.error]
 * @param {Array<{value: string, label: string}>} [props.options]
 */
export function Select({
  label,
  error,
  options = [],
  children,
  id,
  className = '',
  disabled = false,
  required = false,
  ...props
}) {
  const generatedId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

  return (
    <div className="w-full space-y-1.5 text-left">
      {label && (
        <label
          htmlFor={generatedId}
          className="block text-xs font-semibold text-slate-700 tracking-wide"
        >
          {label}
          {required && <span className="text-red-500 ml-0.5">*</span>}
        </label>
      )}

      <div className="relative flex items-center">
        <select
          id={generatedId}
          disabled={disabled}
          required={required}
          className={`w-full bg-white text-slate-900 text-sm rounded-lg border appearance-none transition-all duration-150 h-10 pl-3.5 pr-9 ${
            error
              ? 'border-red-500 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-600'
              : 'border-slate-200 hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600'
          } ${disabled ? 'bg-slate-50 text-slate-400 cursor-not-allowed border-slate-200' : 'shadow-xs'} ${className}`}
          {...props}
        >
          {options.length > 0
            ? options.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))
            : children}
        </select>

        <div className="absolute right-3 text-slate-400 pointer-events-none flex items-center">
          <ChevronDown className="w-4 h-4" />
        </div>
      </div>

      {error && <p className="text-xs text-red-600 font-medium">{error}</p>}
    </div>
  );
}

export default Select;
