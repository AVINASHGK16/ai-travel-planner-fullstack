import React from 'react';

/**
 * Roamly Badge Primitive
 * @param {Object} props
 * @param {'default'|'primary'|'ai'|'success'|'warning'|'error'|'outline'} [props.variant='default']
 * @param {'sm'|'md'} [props.size='sm']
 */
export function Badge({
  children,
  variant = 'default',
  size = 'sm',
  className = '',
  ...props
}) {
  const base = 'inline-flex items-center gap-1 font-medium transition-colors select-none';

  const variants = {
    default: 'bg-slate-100 text-slate-700 border border-slate-200/80',
    primary: 'bg-blue-50 text-blue-700 border border-blue-200/80',
    ai: 'bg-purple-50 text-purple-700 border border-purple-200/80',
    success: 'bg-emerald-50 text-emerald-700 border border-emerald-200/80',
    warning: 'bg-amber-50 text-amber-800 border border-amber-200/80',
    error: 'bg-red-50 text-red-700 border border-red-200/80',
    outline: 'bg-transparent text-slate-600 border border-slate-300'
  };

  const sizes = {
    sm: 'px-2 py-0.5 text-[11px] rounded-md',
    md: 'px-2.5 py-1 text-xs rounded-md'
  };

  const currentVariant = variants[variant] || variants.default;
  const currentSize = sizes[size] || sizes.sm;

  return (
    <span className={`${base} ${currentVariant} ${currentSize} ${className}`} {...props}>
      {children}
    </span>
  );
}

export default Badge;
