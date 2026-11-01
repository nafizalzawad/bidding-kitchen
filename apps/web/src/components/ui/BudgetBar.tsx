import React from 'react';
import { Coins } from 'lucide-react';

export interface BudgetBarProps {
  budget: number;
  maxBudget?: number;
  label?: string;
  className?: string;
}

export const BudgetBar: React.FC<BudgetBarProps> = ({
  budget,
  maxBudget = 20,
  label = 'Budget',
  className = '',
}) => {
  const clampedBudget = Math.max(0, Math.min(maxBudget, budget));
  const percent = maxBudget > 0 ? (clampedBudget / maxBudget) * 100 : 0;

  return (
    <div className={`w-full ${className}`}>
      <div className="flex items-center justify-between text-xs font-extrabold font-display text-[#1E1B18] mb-1">
        <span className="flex items-center gap-1.5">
          <Coins className="w-4 h-4 text-[#FFB703]" />
          <span>{label}</span>
        </span>
        <span className="tabular-nums">
          <span className="text-sm font-extrabold text-[#1E1B18]">${clampedBudget}</span>
          <span className="text-[#57514A]"> / ${maxBudget}</span>
        </span>
      </div>

      <div
        data-testid="budget-bar-track"
        className="w-full h-3.5 bg-[#F4EFE2] rounded-full border-2 border-[#1E1B18] overflow-hidden shadow-[0_2px_0_#1E1B18]"
      >
        <div
          data-testid="budget-bar-fill"
          className="h-full bg-[#FFB703] transition-all duration-300 ease-out border-r border-[#1E1B18]"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
};
