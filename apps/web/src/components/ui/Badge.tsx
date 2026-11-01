import React from 'react';

export type BadgeVariant = 'neutral' | 'accent' | 'gold' | 'success' | 'danger' | 'blueberry';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  icon?: React.ReactNode;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'neutral',
  icon,
  className = '',
  ...props
}) => {
  const variantStyles: Record<BadgeVariant, string> = {
    neutral: 'bg-[#F4EFE2] text-[#1E1B18] border-[#1E1B18]',
    accent: 'bg-[#E63946] text-[#FFFFFF] border-[#1E1B18]',
    gold: 'bg-[#FFB703] text-[#1E1B18] border-[#1E1B18]',
    success: 'bg-[#1D7A4C] text-[#FFFFFF] border-[#1E1B18]',
    danger: 'bg-[#DC2626] text-[#FFFFFF] border-[#1E1B18]',
    blueberry: 'bg-[#2563EB] text-[#FFFFFF] border-[#1E1B18]',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold font-display rounded-full border-2 shadow-[0_2px_0_#1E1B18] select-none ${variantStyles[variant]} ${className}`}
      {...props}
    >
      {icon && <span className="shrink-0">{icon}</span>}
      <span>{children}</span>
    </span>
  );
};
