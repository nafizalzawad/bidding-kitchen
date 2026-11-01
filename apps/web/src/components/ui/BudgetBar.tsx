import React from 'react';
import { Coins } from 'lucide-react';
import { useReducedMotion } from '../../hooks/useReducedMotion';

export interface BudgetBarProps {
  budget: number;
  maxBudget?: number;
  previousBudget?: number;
  deductionAmount?: number;
  drainProgress?: number; // 0 (start) to 1 (fully drained)
  label?: string;
  className?: string;
}

export const BudgetBar: React.FC<BudgetBarProps> = ({
  budget,
  maxBudget = 20,
  previousBudget,
  deductionAmount,
  drainProgress,
  label = 'Budget',
  className = '',
}) => {
  const prefersReducedMotion = useReducedMotion();

  // Calculate deduction if any
  const calculatedDeduction =
    deductionAmount ??
    (previousBudget !== undefined && previousBudget > budget
      ? previousBudget - budget
      : 0);

  const startBudget = previousBudget ?? budget;

  // If drainProgress is provided and reduced motion is off, interpolate
  let displayBudget = budget;
  if (!prefersReducedMotion && drainProgress !== undefined && calculatedDeduction > 0) {
    const progress = Math.max(0, Math.min(1, drainProgress));
    displayBudget = Math.round(startBudget - calculatedDeduction * progress);
  }

  const clampedBudget = Math.max(0, Math.min(maxBudget, displayBudget));
  const percent = maxBudget > 0 ? (clampedBudget / maxBudget) * 100 : 0;

  // Show deduction pill if there's a deduction and (drainProgress is active or explicitly passed)
  const showPill =
    calculatedDeduction > 0 &&
    (drainProgress === undefined || (drainProgress >= 0 && drainProgress <= 1));

  return (
    <div className={`w-full relative ${className}`}>
      <div className="flex items-center justify-between text-xs font-extrabold font-display text-[#1E1B18] mb-1">
        <span className="flex items-center gap-1.5">
          <Coins className="w-4 h-4 text-[#FFB703]" />
          <span>{label}</span>
        </span>
        <div className="relative flex items-center tabular-nums">
          <span className="text-sm font-extrabold text-[#1E1B18]">${clampedBudget}</span>
          <span className="text-[#57514A]"> / ${maxBudget}</span>

          {showPill && (
            <div
              data-testid="budget-deduction-pill"
              className={`absolute -top-3 right-0 px-1.5 py-0.5 rounded-full bg-[#B91C1C] text-white font-black text-[10px] border border-[#1E1B18] shadow-[0_2px_0_#1E1B18] pointer-events-none z-10 ${
                prefersReducedMotion ? '' : 'animate-bounce'
              }`}
            >
              -${calculatedDeduction}
            </div>
          )}
        </div>
      </div>

      <div
        data-testid="budget-bar-track"
        className="w-full h-3.5 bg-[#F4EFE2] rounded-full border-2 border-[#1E1B18] overflow-hidden shadow-[0_2px_0_#1E1B18]"
      >
        <div
          data-testid="budget-bar-fill"
          className={`h-full bg-[#FFB703] border-r border-[#1E1B18] ${
            prefersReducedMotion ? '' : 'transition-all duration-300 ease-out'
          }`}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
};
