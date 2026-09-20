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
  leftIcon,
  options = [],
  children,
  id,
  className = '',
  disabled = false,
  required = false,
  ...props
}) {
  const reactId = React.useId();
  const generatedId = id || (label ? `${label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${reactId}` : reactId);

  return (
    <div className="w-full space-y-1.5 text-left">
      {label && (
        <label
          htmlFor={generatedId}
          className="block text-xs font-semibold text-[#14171F] tracking-wide"
        >
          {label}
          {required && <span className="text-red-500 ml-0.5">*</span>}
        </label>
      )}

      <div className="relative flex items-center">
        {leftIcon && (
          <div className="absolute left-3 text-slate-400 pointer-events-none flex items-center">
            {leftIcon}
          </div>
        )}

        <select
          id={generatedId}
          disabled={disabled}
          required={required}
          className={`w-full bg-white text-[#14171F] text-sm font-normal rounded-lg border appearance-none transition-all duration-120 h-10 ${
            leftIcon ? 'pl-9' : 'pl-3.5'
          } pr-9 cursor-pointer ${
            error
              ? 'border-red-500 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-600'
              : 'border-[#E7E5DF] hover:border-[#2453FF]/40 focus:outline-none focus:ring-2 focus:ring-[#2453FF]/20 focus:border-[#2453FF]'
          } ${disabled ? 'bg-[#FAFAF8] text-[#737885] cursor-not-allowed border-[#E7E5DF]' : 'shadow-xs'} ${className}`}
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

        <div className="absolute right-3 text-[#737885] pointer-events-none flex items-center">
          <ChevronDown className="w-4 h-4" />
        </div>
      </div>

      {error && <p className="text-xs text-red-600 font-medium">{error}</p>}
    </div>
  );
}

export default Select;
