import React, { useEffect } from 'react';
import { Coins, Sparkles } from 'lucide-react';
import { soundEngine } from '../../audio/sound-engine.js';
import { useHaptics } from '../../hooks/useHaptics.js';

export interface ChefsTipBannerProps {
  awardedToMe: boolean;
  className?: string;
}

/**
 * ChefsTipBanner displays a celebration banner when the trailing player
 * is awarded the +$2 rubber-band Chef's Tip after Round 3.
 */
export const ChefsTipBanner: React.FC<ChefsTipBannerProps> = ({
  awardedToMe,
  className = '',
}) => {
  const { triggerHaptic } = useHaptics();

  useEffect(() => {
    if (awardedToMe) {
      soundEngine.playCue('cashRegisterChime');
      triggerHaptic('success');
    }
  }, [awardedToMe, triggerHaptic]);

  if (!awardedToMe) return null;

  return (
    <div
      data-testid="chefs-tip-banner"
      className={`w-full rounded-2xl bg-gradient-to-r from-[#FFD166] via-[#F4A261] to-[#E76F51] border-2 border-[#1E1B18] shadow-[0_4px_0_#1E1B18] p-3 text-white flex items-center justify-between gap-3 animate-bounce ${className}`}
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="w-9 h-9 rounded-xl bg-white/25 border-1.5 border-[#1E1B18] flex items-center justify-center shrink-0 text-[#1E1B18]">
          <Coins className="w-5 h-5 text-white" />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-black uppercase tracking-wider text-[#1E1B18] bg-white/90 px-1.5 py-0.5 rounded-md">
              Chef's Tip!
            </span>
            <Sparkles className="w-3.5 h-3.5 text-white shrink-0" />
          </div>
          <p className="text-xs font-bold text-white drop-shadow-xs mt-0.5 truncate">
            Trailing by 3+ points at Round 3 — Kitchen Boost awarded!
          </p>
        </div>
      </div>

      <div className="shrink-0 px-2.5 py-1 rounded-xl bg-[#1E1B18] text-[#FFD166] font-black text-sm border-2 border-white/40 shadow-xs">
        +$2 CASH
      </div>
    </div>
  );
};
