import React from 'react';
import { Loader2 } from 'lucide-react';

/**
 * Roamly Button Primitive
 * @param {Object} props
 * @param {'primary'|'secondary'|'outline'|'ghost'|'ai'|'danger'} [props.variant='primary']
 * @param {'sm'|'md'|'lg'} [props.size='md']
 * @param {boolean} [props.isLoading=false]
 * @param {React.ReactNode} [props.leftIcon]
 * @param {React.ReactNode} [props.rightIcon]
 */
export function Button({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  leftIcon,
  rightIcon,
  disabled = false,
  className = '',
  type = 'button',
  ...props
}) {
  const baseStyles = 'inline-flex items-center justify-center font-medium transition-all duration-150 rounded-lg select-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2';

  const variants = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700 shadow-xs border border-blue-600 hover:border-blue-700 focus-visible:ring-blue-500',
    secondary: 'bg-slate-100 text-slate-800 hover:bg-slate-200 border border-slate-200/80 focus-visible:ring-slate-400',
    outline: 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-300 shadow-xs focus-visible:ring-blue-500',
    ghost: 'bg-transparent text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-transparent focus-visible:ring-slate-400',
    ai: 'bg-purple-600 text-white hover:bg-purple-700 shadow-xs border border-purple-600 hover:border-purple-700 focus-visible:ring-purple-500',
    danger: 'bg-red-600 text-white hover:bg-red-700 shadow-xs border border-red-600 focus-visible:ring-red-500'
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-xs gap-1.5 h-8',
    md: 'px-4 py-2 text-sm gap-2 h-9.5',
    lg: 'px-5 py-2.5 text-base gap-2.5 h-11'
  };

  const currentVariant = variants[variant] || variants.primary;
  const currentSize = sizes[size] || sizes.md;

  return (
    <button
      type={type}
      disabled={disabled || isLoading}
      className={`${baseStyles} ${currentVariant} ${currentSize} ${className}`}
      {...props}
    >
      {isLoading ? (
        <Loader2 className="w-4 h-4 animate-spin text-current shrink-0" />
      ) : (
        leftIcon && <span className="shrink-0">{leftIcon}</span>
      )}
      <span>{children}</span>
      {!isLoading && rightIcon && <span className="shrink-0">{rightIcon}</span>}
    </button>
  );
}

export default Button;
