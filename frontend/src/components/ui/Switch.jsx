import React from 'react';

/**
 * Roamly Switch Primitive
 * Accessible toggle control with standardized typography and alignment.
 *
 * @param {Object} props
 * @param {boolean} props.checked - Active/on state
 * @param {(checked: boolean) => void} props.onChange - State change callback
 * @param {string} [props.label] - Primary label title
 * @param {string} [props.description] - Supporting description text
 * @param {boolean} [props.disabled=false] - Disabled state
 * @param {string} [props.id] - Element ID
 * @param {string} [props.className=''] - Additional container classes
 */
export function Switch({
  checked = false,
  onChange,
  label,
  description,
  disabled = false,
  id,
  className = '',
  ...props
}) {
  const reactId = React.useId();
  const switchId = id || (label ? `switch-${label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${reactId}` : reactId);

  const handleToggle = () => {
    if (disabled || !onChange) return;
    onChange(!checked);
  };

  const handleKeyDown = (e) => {
    if (disabled || !onChange) return;
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      onChange(!checked);
    }
  };

  const toggleButton = (
    <button
      id={switchId}
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label || 'Toggle switch'}
      disabled={disabled}
      onClick={handleToggle}
      onKeyDown={handleKeyDown}
      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-[220ms] ease-out focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2453FF] focus-visible:ring-offset-2 ${
        checked ? 'bg-[#2453FF]' : 'bg-[#E7E5DF]'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      {...props}
    >
      <span
        aria-hidden="true"
        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-xs ring-0 transition-transform duration-[180ms] ease-out ${
          checked ? 'translate-x-4' : 'translate-x-0'
        }`}
      />
    </button>
  );

  if (!label && !description) {
    return toggleButton;
  }

  return (
    <div className={`flex items-center justify-between gap-4 py-2 ${disabled ? 'opacity-60' : ''} ${className}`}>
      <label htmlFor={switchId} className="cursor-pointer select-none min-w-0 flex-1">
        {label && (
          <span className="font-semibold text-sm text-[#14171F] block leading-snug">
            {label}
          </span>
        )}
        {description && (
          <span className="text-xs text-[#737885] mt-0.5 block leading-relaxed">
            {description}
          </span>
        )}
      </label>
      <div className="shrink-0 flex items-center">
        {toggleButton}
      </div>
    </div>
  );
}

export default Switch;
