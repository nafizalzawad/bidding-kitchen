import React from 'react';
import type { RoundResolution, PublicPlayerView } from '@bidding-kitchen/shared';
import { IngredientArt } from './IngredientArt.js';
import { Sparkles, Swords, CheckCircle2, ShieldAlert } from 'lucide-react';

export interface BidFlipCompareProps {
  resolution: RoundResolution;
  p1: PublicPlayerView;
  p2: PublicPlayerView;
  myPlayerId: string;
  className?: string;
}

export const BidFlipCompare: React.FC<BidFlipCompareProps> = ({
  resolution,
  p1,
  p2,
  myPlayerId,
  className = '',
}) => {
  const isCollision = resolution.outcomeType !== 'NO_COLLISION';

  const p1Bid = resolution.bidsByPlayer[p1.id];
  const p2Bid = resolution.bidsByPlayer[p2.id];

  const p1Award = resolution.awardsByPlayer[p1.id];
  const p2Award = resolution.awardsByPlayer[p2.id];

  const renderPlayerBidCard = (
    player: PublicPlayerView,
    bid: typeof p1Bid,
    award: typeof p1Award,
  ) => {
    const isMe = player.id === myPlayerId;
    const isWinner = award?.wonVia === 'HIGH_BID' || award?.wonVia === 'UNCONTESTED' || award?.wonVia === 'TIEBREAK_BUDGET' || award?.wonVia === 'TIEBREAK_COINFLIP';
    const isFallbackLoss = award?.wonVia === 'FALLBACK_LOSS';

    return (
      <div
        data-testid={`bid-reveal-card-${player.id}`}
        className={`flex-1 p-3 sm:p-4 rounded-2xl border-2 border-[#1E1B18] shadow-[0_4px_0_#1E1B18] flex flex-col items-center justify-between text-center relative ${
          isWinner ? 'bg-[#FFFDF7] ring-3 ring-[#1D7A4C]' : 'bg-[#FFFFFF]'
        }`}
      >
        {/* Top badge */}
        <div className="flex items-center gap-1.5 mb-2">
          <span className="text-xs font-black font-display text-[#1E1B18]">
            {player.nickname} {isMe && '(You)'}
          </span>
        </div>

        {/* Targeted Ingredient Art & Name */}
        {award?.ingredient && (
          <div className="flex flex-col items-center gap-1 my-1">
            <IngredientArt ingredientId={award.ingredient.id} size={48} />
            <span className="text-xs font-extrabold font-display text-[#1E1B18] leading-tight">
              {award.ingredient.name}
            </span>
          </div>
        )}

        {/* Bid amount */}
        <div className="my-2 px-3 py-1 rounded-xl bg-[#F4EFE2] border border-[#1E1B18] text-xs font-bold text-[#1E1B18]">
          Bid: <span className="text-sm font-black text-[#E63946] tabular-nums">${bid?.amount ?? 0}</span>
        </div>

        {/* Outcome Badge */}
        <div className="mt-1">
          {isWinner && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-black bg-[#1D7A4C] text-[#FFFFFF] border border-[#1E1B18]">
              <CheckCircle2 className="w-3 h-3" />
              <span>Won for ${award?.pricePaid}!</span>
            </span>
          )}
          {isFallbackLoss && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#FFB703] text-[#1E1B18] border border-[#1E1B18]">
              <ShieldAlert className="w-3 h-3 text-[#DC2626]" />
              <span>Free Basic ($0)</span>
            </span>
          )}
        </div>
      </div>
    );
  };

  return (
    <div
      data-testid="bid-flip-compare"
      className={`w-full p-4 bg-[#FFFFFF] rounded-3xl border-3 border-[#1E1B18] shadow-[0_6px_0_#1E1B18] flex flex-col gap-3 ${className}`}
    >
      {/* Clash Header */}
      <div className="flex items-center justify-center gap-2 pb-2 border-b-2 border-[#1E1B18] text-center">
        {isCollision ? (
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#DC2626] text-[#FFFFFF] border border-[#1E1B18] font-black text-xs uppercase tracking-wider animate-pulse">
            <Swords className="w-4 h-4" />
            <span>Collision Clash! Same Ingredient!</span>
          </div>
        ) : (
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#1D7A4C] text-[#FFFFFF] border border-[#1E1B18] font-bold text-xs">
            <Sparkles className="w-4 h-4 text-[#FFB703]" />
            <span>Uncontested Bids!</span>
          </div>
        )}
      </div>

      {/* Side-by-side player bid cards */}
      <div className="flex items-stretch gap-3">
        {renderPlayerBidCard(p1, p1Bid, p1Award)}
        <div className="flex items-center justify-center font-black font-display text-sm text-[#57514A] px-1">
          VS
        </div>
        {renderPlayerBidCard(p2, p2Bid, p2Award)}
      </div>
    </div>
  );
};
