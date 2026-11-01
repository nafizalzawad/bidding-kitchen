import React, { useEffect } from 'react';
import { COMBO_DEFINITIONS } from '@bidding-kitchen/shared';
import { Sparkles, X, Flame } from 'lucide-react';

export interface ComboHintDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  className?: string;
}

export const ComboHintDrawer: React.FC<ComboHintDrawerProps> = ({
  isOpen,
  onClose,
  className = '',
}) => {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="combo-drawer-title"
      data-testid="combo-hint-drawer"
      className="fixed inset-0 z-50 flex justify-end bg-[#1E1B18]/60 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className={`w-full max-w-md h-full bg-[#FFFFFF] border-l-3 border-[#1E1B18] shadow-[-8px_0_0_#1E1B18] p-5 sm:p-6 flex flex-col justify-between overflow-y-auto ${className}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div>
          <div className="flex items-center justify-between pb-4 mb-4 border-b-2 border-[#1E1B18]">
            <div className="flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-[#FFB703]" />
              <h3 id="combo-drawer-title" className="text-xl font-black font-display text-[#1E1B18]">
                Flavor Combos
              </h3>
            </div>
            <button
              onClick={onClose}
              aria-label="Close combos drawer"
              data-testid="combo-drawer-close-btn"
              className="min-h-[44px] min-w-[44px] p-2 rounded-xl bg-[#F4EFE2] hover:bg-[#FFB703] text-[#1E1B18] border-2 border-[#1E1B18] shadow-[0_2px_0_#1E1B18] active:translate-y-[1px] transition flex items-center justify-center cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <p className="text-xs text-[#57514A] font-medium mb-4">
            Collect complementary ingredients across rounds to unlock massive endgame score bonuses!
          </p>

          {/* Combos list */}
          <div className="space-y-3.5">
            {COMBO_DEFINITIONS.map((combo) => (
              <div
                key={combo.id}
                data-testid={`combo-card-${combo.id}`}
                className="p-3.5 rounded-2xl border-2 border-[#1E1B18] bg-[#FFFDF7] shadow-[0_3px_0_#1E1B18]"
              >
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <span className="font-extrabold font-display text-sm text-[#1E1B18] flex items-center gap-1.5">
                    <Flame className="w-4 h-4 text-[#E63946]" />
                    <span>{combo.name}</span>
                  </span>
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-black bg-[#FFB703] text-[#1E1B18] border border-[#1E1B18] shadow-[0_1px_0_#1E1B18]">
                    +{combo.points} pts
                  </span>
                </div>

                <p className="text-xs text-[#57514A] leading-relaxed">{combo.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Footer info */}
        <div className="mt-6 pt-4 border-t-2 border-[#1E1B18] text-center">
          <p className="text-[11px] font-bold text-[#57514A]">
            💡 Tip: Even if you collide and lose, you keep your money for later rounds!
          </p>
        </div>
      </div>
    </div>
  );
};
