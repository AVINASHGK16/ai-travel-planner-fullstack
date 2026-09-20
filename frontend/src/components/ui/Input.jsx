import React from 'react';

/**
 * Roamly Input Primitive
 * @param {Object} props
 * @param {string} [props.label]
 * @param {string} [props.error]
 * @param {string} [props.helperText]
 * @param {React.ReactNode} [props.leftIcon]
 * @param {React.ReactNode} [props.rightIcon]
 */
export function Input({
  label,
  error,
  helperText,
  leftIcon,
  rightIcon,
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

        <input
          id={generatedId}
          disabled={disabled}
          required={required}
          className={`w-full bg-white text-[#14171F] placeholder:text-[#737885]/60 text-sm rounded-lg border transition-all duration-120 h-10 ${
            leftIcon ? 'pl-9' : 'pl-3.5'
          } ${rightIcon ? 'pr-9' : 'pr-3.5'} ${
            error
              ? 'border-red-500 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-600'
              : 'border-[#E7E5DF] hover:border-[#2453FF]/40 focus:outline-none focus:ring-2 focus:ring-[#2453FF]/20 focus:border-[#2453FF]'
          } ${disabled ? 'bg-[#FAFAF8] text-[#737885] cursor-not-allowed border-[#E7E5DF]' : 'shadow-xs'} ${className}`}
          {...props}
        />

        {rightIcon && (
          <div className="absolute right-3 text-slate-400 flex items-center">
            {rightIcon}
          </div>
        )}
      </div>

      {error ? (
        <p className="text-xs text-red-600 font-medium">{error}</p>
      ) : helperText ? (
        <p className="text-xs text-slate-500">{helperText}</p>
      ) : null}
    </div>
  );
}

export default Input;
