import React from 'react';

export type CardPadding = 'none' | 'sm' | 'md' | 'lg';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  padding?: CardPadding;
  interactive?: boolean;
  selected?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  padding = 'md',
  interactive = false,
  selected = false,
  className = '',
  ...props
}) => {
  const paddingStyles: Record<CardPadding, string> = {
    none: 'p-0',
    sm: 'p-3',
    md: 'p-5 sm:p-6',
    lg: 'p-6 sm:p-8',
  };

  const interactiveStyles = interactive
    ? 'cursor-pointer transition hover:-translate-y-0.5 hover:shadow-[0_6px_0_#1E1B18] active:translate-y-0 active:shadow-[0_2px_0_#1E1B18]'
    : '';

  const selectedStyles = selected
    ? 'ring-4 ring-[#FFB703] border-[#1E1B18] bg-[#FFFDF7]'
    : 'border-[#1E1B18] bg-[#FFFFFF]';

  return (
    <div
      className={`rounded-2xl border-2 shadow-[0_4px_0_#1E1B18] ${selectedStyles} ${interactiveStyles} ${paddingStyles[padding]} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};
