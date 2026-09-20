import React, { useId } from 'react';

/**
 * Roamly Slider Primitive
 * Standardized range input with 4-6px track, accessible thumb, and min/max labels.
 *
 * @param {Object} props
 * @param {number} props.value - Current slider value
 * @param {(val: number) => void} props.onChange - Value change handler
 * @param {number} [props.min=0] - Minimum bound
 * @param {number} [props.max=100] - Maximum bound
 * @param {number} [props.step=1] - Increment step
 * @param {string} [props.label] - Label title
 * @param {string} [props.valuePrefix=''] - Text/symbol prefix (e.g. '₹')
 * @param {string} [props.valueSuffix=''] - Text/symbol suffix (e.g. ' km')
 * @param {(val: number) => string} [props.formatValue] - Custom value formatter
 * @param {boolean} [props.showMinMax=true] - Whether to render bottom min/max tags
 * @param {boolean} [props.disabled=false] - Disabled state
 * @param {string} [props.id] - Element ID
 * @param {string} [props.className=''] - Container class
 */
export function Slider({
  value = 0,
  onChange,
  min = 0,
  max = 100,
  step = 1,
  label,
  valuePrefix = '',
  valueSuffix = '',
  formatValue,
  showValue = true,
  showMinMax = true,
  disabled = false,
  id,
  className = '',
  ...props
}) {
  const reactId = useId();
  const sliderId = id || `slider-${reactId}`;

  const safeMin = Number(min);
  const safeMax = Number(max) > safeMin ? Number(max) : safeMin + 1;
  const safeVal = Math.min(safeMax, Math.max(safeMin, Number(value) || safeMin));

  const percentage = Math.round(((safeVal - safeMin) / (safeMax - safeMin)) * 100);

  const displayVal = formatValue
    ? formatValue(safeVal)
    : `${valuePrefix}${safeVal.toLocaleString()}${valueSuffix}`;

  const displayMin = formatValue
    ? formatValue(safeMin)
    : `${valuePrefix}${safeMin.toLocaleString()}${valueSuffix}`;

  const displayMax = formatValue
    ? formatValue(safeMax)
    : `${valuePrefix}${safeMax.toLocaleString()}${valueSuffix}`;

  const handleChange = (e) => {
    if (disabled || !onChange) return;
    const num = parseFloat(e.target.value);
    onChange(Number.isNaN(num) ? safeMin : num);
  };

  return (
    <div className={`w-full space-y-2 ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}>
      {(label || (showValue && displayVal)) && (
        <div className="flex items-center justify-between text-xs gap-2">
          {label && (
            <label htmlFor={sliderId} className="font-semibold text-[#14171F] select-none">
              {label}
            </label>
          )}
          {showValue && (
            <span className="font-mono font-bold text-[#14171F] tabular-nums text-right ml-auto">
              {displayVal}
            </span>
          )}
        </div>
      )}

      {/* Slider Track and Native Input */}
      <div className="relative flex items-center py-1.5 select-none">
        <input
          id={sliderId}
          type="range"
          min={safeMin}
          max={safeMax}
          step={step}
          value={safeVal}
          disabled={disabled}
          onChange={handleChange}
          aria-valuemin={safeMin}
          aria-valuemax={safeMax}
          aria-valuenow={safeVal}
          aria-label={label || 'Range slider'}
          style={{
            background: `linear-gradient(to right, #2453FF 0%, #2453FF ${percentage}%, #E7E5DF ${percentage}%, #E7E5DF 100%)`
          }}
          className="w-full h-1.5 rounded-full appearance-none cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2453FF] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          {...props}
        />
      </div>

      {showMinMax && (
        <div className="flex items-center justify-between text-xs font-mono text-[#737885] tabular-nums select-none pt-0.5">
          <span>{displayMin}</span>
          <span>{displayMax}</span>
        </div>
      )}
    </div>
  );
}

export default Slider;
