import React from 'react';
import type { PublicPlayerView } from '@bidding-kitchen/shared';
import { Lock, Clock, WifiOff, Coins } from 'lucide-react';

export interface OpponentStatusHeaderProps {
  opponent: PublicPlayerView;
  isLocked?: boolean;
  className?: string;
}

export const OpponentStatusHeader: React.FC<OpponentStatusHeaderProps> = ({
  opponent,
  isLocked = false,
  className = '',
}) => {
  return (
    <div
      data-testid="opponent-status-header"
      className={`w-full min-h-[44px] px-3.5 py-2 bg-[#FFFFFF] rounded-2xl border-2 border-[#1E1B18] shadow-[0_3px_0_#1E1B18] flex items-center justify-between gap-2 ${className}`}
    >
      {/* Left: Avatar & Name */}
      <div className="flex items-center gap-2 min-w-0">
        <div className="w-8 h-8 rounded-full bg-[#FFB703] border-2 border-[#1E1B18] flex items-center justify-center font-black text-xs shrink-0 shadow-[0_1px_0_#1E1B18]">
          👨‍🍳
        </div>
        <div className="min-w-0">
          <h3 className="text-xs sm:text-sm font-extrabold font-display text-[#1E1B18] truncate leading-tight">
            {opponent.nickname}
          </h3>
          <div className="flex items-center gap-1 text-[11px] font-bold text-[#57514A]">
            <Coins className="w-3 h-3 text-[#FFB703]" />
            <span className="tabular-nums">${opponent.budget} Left</span>
          </div>
        </div>
      </div>

      {/* Right: State indicator badge */}
      <div className="shrink-0">
        {!opponent.connected ? (
          <span
            data-testid="opponent-disconnected-badge"
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-[#DC2626] text-[#FFFFFF] border border-[#1E1B18] shadow-[0_1px_0_#1E1B18]"
          >
            <WifiOff className="w-3 h-3" />
            <span>Disconnected</span>
          </span>
        ) : isLocked ? (
          <span
            data-testid="opponent-locked-badge"
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-[#1D7A4C] text-[#FFFFFF] border border-[#1E1B18] shadow-[0_1px_0_#1E1B18]"
          >
            <Lock className="w-3 h-3 text-[#FFB703]" />
            <span>Locked In!</span>
          </span>
        ) : (
          <span
            data-testid="opponent-thinking-badge"
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-[#F4EFE2] text-[#1E1B18] border border-[#1E1B18] animate-pulse"
          >
            <Clock className="w-3 h-3" />
            <span>Deciding...</span>
          </span>
        )}
      </div>
    </div>
  );
};
