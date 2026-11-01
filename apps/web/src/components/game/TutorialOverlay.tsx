import React, { useState } from 'react';
import { Button } from '../ui/Button.js';
import { Swords, ShieldCheck, Sparkles, X, ChevronRight, ChevronLeft } from 'lucide-react';

export interface TutorialOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete?: () => void;
}

export const TutorialOverlay: React.FC<TutorialOverlayProps> = ({
  isOpen,
  onClose,
  onComplete,
}) => {
  const [currentStep, setCurrentStep] = useState<number>(1);

  if (!isOpen) return null;

  const handleNext = () => {
    if (currentStep < 3) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete?.();
      onClose();
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const steps = [
    {
      step: 1,
      title: 'Secret Bidding & Collisions',
      badge: 'Rule 1 of 3',
      icon: <Swords className="w-8 h-8 text-[#E63946]" />,
      desc: 'Both chefs place simultaneous secret whole-dollar bids on available ingredients. If you both target the same item, a COLLISION occurs — the higher bid wins! Ties are decided by a 50/50 kitchen coinflip.',
      visualTip: '🔒 Opponents cannot see your bid or target until the timer ends!',
    },
    {
      step: 2,
      title: 'Free $0 Basic Fallback',
      badge: 'Rule 2 of 3',
      icon: <ShieldCheck className="w-8 h-8 text-[#1D7A4C]" />,
      desc: 'If you lose a collision, you keep 100% of your money and receive the free Basic fallback ($0). You will NEVER have an empty plate! Save your budget for key rounds.',
      visualTip: '💰 You keep all unspent cash for later rounds or the Leftover Money bonus!',
    },
    {
      step: 3,
      title: 'Flavor Tag Combos',
      badge: 'Rule 3 of 3',
      icon: <Sparkles className="w-8 h-8 text-[#FFB703]" />,
      desc: 'Each ingredient has flavor tags (Smoky, Spicy, Rich, Crispy, Fresh). Collect matching recipe synergies to unlock massive Combo Bonuses (+3 to +5 pts) at the Grand Tasting!',
      visualTip: '🍔 The chef with the highest total Taste + Combos takes the Golden Spatula!',
    },
  ];

  const activeStep = steps[currentStep - 1]!;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="tutorial-title"
      data-testid="tutorial-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1E1B18]/70 backdrop-blur-sm animate-fade-in"
    >
      <div className="relative w-full max-w-md bg-[#FFFFFF] rounded-3xl border-3 border-[#1E1B18] shadow-[0_8px_0_#1E1B18] p-6 text-[#1E1B18]">
        {/* Top Header with Close & Step Indicators */}
        <div className="flex items-center justify-between pb-3 mb-3 border-b-2 border-[#1E1B18]">
          <span className="px-3 py-1 rounded-full bg-[#F4EFE2] border border-[#1E1B18] text-xs font-black font-display text-[#1E1B18]">
            {activeStep.badge}
          </span>

          <div className="flex items-center gap-1.5">
            {[1, 2, 3].map((s) => (
              <span
                key={s}
                className={`w-2.5 h-2.5 rounded-full border border-[#1E1B18] ${
                  s === currentStep ? 'bg-[#FFB703]' : 'bg-[#F4EFE2]'
                }`}
              />
            ))}
          </div>

          <button
            onClick={onClose}
            aria-label="Skip tutorial"
            data-testid="tutorial-close-btn"
            className="min-h-[44px] min-w-[44px] p-2 rounded-xl bg-[#F4EFE2] hover:bg-[#FFB703] text-[#1E1B18] border-2 border-[#1E1B18] shadow-[0_2px_0_#1E1B18] active:translate-y-[1px] transition flex items-center justify-center cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex flex-col items-center text-center py-3">
          <div className="w-16 h-16 rounded-2xl bg-[#FFFDF7] border-2 border-[#1E1B18] flex items-center justify-center shadow-[0_4px_0_#1E1B18] mb-3">
            {activeStep.icon}
          </div>

          <h3 id="tutorial-title" className="text-xl font-extrabold font-display text-[#1E1B18] mb-2">
            {activeStep.title}
          </h3>

          <p className="text-xs sm:text-sm text-[#57514A] font-medium leading-relaxed mb-4">
            {activeStep.desc}
          </p>

          <div className="w-full p-2.5 rounded-xl bg-[#F4EFE2] border border-[#1E1B18] text-xs font-bold text-[#1E1B18] mb-4">
            {activeStep.visualTip}
          </div>
        </div>

        {/* Stepper Buttons */}
        <div className="flex items-center gap-3 pt-3 border-t-2 border-[#1E1B18]">
          {currentStep > 1 && (
            <button
              onClick={handleBack}
              data-testid="tutorial-back-btn"
              aria-label="Previous tutorial step"
              className="min-h-[44px] min-w-[44px] px-3 py-2 rounded-xl border-2 border-[#1E1B18] bg-[#F4EFE2] hover:bg-[#FFB703] text-xs font-bold flex items-center gap-1 shadow-[0_2px_0_#1E1B18] cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Back</span>
            </button>
          )}

          <Button
            variant="primary"
            size="md"
            fullWidth
            onClick={handleNext}
            data-testid="tutorial-next-btn"
            icon={currentStep === 3 ? undefined : <ChevronRight className="w-4 h-4" />}
          >
            {currentStep === 3 ? "Got It, Let's Cook!" : 'Next Step'}
          </Button>

          <button
            type="button"
            onClick={() => {
              onComplete?.();
              onClose();
            }}
            data-testid="tutorial-complete-btn"
            aria-label="Complete tutorial and start cooking"
            className="min-h-[44px] px-3 py-2 rounded-xl border-2 border-[#1E1B18] bg-[#FFB703] text-[#1E1B18] text-xs font-black shadow-[0_2px_0_#1E1B18] active:translate-y-[1px] transition shrink-0 cursor-pointer"
          >
            Skip
          </button>
        </div>
      </div>
    </div>
  );
};
