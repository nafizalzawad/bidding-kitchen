import React from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'gold' | 'danger' | 'ghost';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  icon?: React.ReactNode;
  loading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  icon,
  loading = false,
  disabled,
  className = '',
  ...props
}) => {
  const variantStyles: Record<ButtonVariant, string> = {
    primary:
      'bg-[#DC2626] text-[#FFFFFF] hover:bg-[#b91c1c] border-2 border-[#1E1B18] shadow-[0_4px_0_#1E1B18] active:translate-y-[2px] active:shadow-[0_2px_0_#1E1B18]',
    secondary:
      'bg-[#FFFFFF] text-[#1E1B18] hover:bg-[#F4EFE2] border-2 border-[#1E1B18] shadow-[0_4px_0_#1E1B18] active:translate-y-[2px] active:shadow-[0_2px_0_#1E1B18]',
    gold:
      'bg-[#FFB703] text-[#1E1B18] hover:bg-[#f0a900] border-2 border-[#1E1B18] shadow-[0_4px_0_#1E1B18] active:translate-y-[2px] active:shadow-[0_2px_0_#1E1B18]',
    danger:
      'bg-[#DC2626] text-[#FFFFFF] hover:bg-[#B91C1C] border-2 border-[#1E1B18] shadow-[0_4px_0_#1E1B18] active:translate-y-[2px] active:shadow-[0_2px_0_#1E1B18]',
    ghost:
      'bg-transparent text-[#1E1B18] hover:bg-[#F4EFE2] border-2 border-transparent hover:border-[#1E1B18] active:translate-y-[1px]',
  };

  const sizeStyles: Record<ButtonSize, string> = {
    sm: 'min-h-[44px] min-w-[44px] px-3.5 py-2 text-xs font-bold rounded-xl',
    md: 'min-h-[48px] min-w-[48px] px-5 py-2.5 text-sm font-bold rounded-xl',
    lg: 'min-h-[52px] min-w-[52px] px-6 py-3.5 text-base font-extrabold rounded-2xl',
  };

  const disabledStyles = disabled || loading ? 'opacity-50 cursor-not-allowed pointer-events-none' : 'cursor-pointer';
  const widthStyles = fullWidth ? 'w-full' : '';

  return (
    <button
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center gap-2 font-display select-none transition-all duration-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFB703] focus-visible:ring-offset-2 ${variantStyles[variant]} ${sizeStyles[size]} ${disabledStyles} ${widthStyles} ${className}`}
      {...props}
    >
      {loading ? (
        <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
      ) : (
        icon && <span className="shrink-0">{icon}</span>
      )}
      <span>{children}</span>
    </button>
  );
};
