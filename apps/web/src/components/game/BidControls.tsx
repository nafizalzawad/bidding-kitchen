import React from 'react';
import type { Ingredient } from '@bidding-kitchen/shared';
import { Button } from '../ui/Button.js';
import { Lock, Plus, Minus, CheckCircle2 } from 'lucide-react';

export interface BidControlsProps {
  selectedIngredient: Ingredient | null;
  bidAmount: number;
  budget: number;
  isLocked?: boolean;
  onChangeBid: (amount: number) => void;
  onLockBid: () => void;
  className?: string;
}

export const BidControls: React.FC<BidControlsProps> = ({
  selectedIngredient,
  bidAmount,
  budget,
  isLocked = false,
  onChangeBid,
  onLockBid,
  className = '',
}) => {
  if (!selectedIngredient) {
    return (
      <div
        data-testid="bid-controls-container"
        className={`w-full min-h-[116px] p-4 bg-[#FFFFFF] rounded-2xl border-2 border-[#1E1B18] shadow-[0_4px_0_#1E1B18] flex flex-col items-center justify-center text-center ${className}`}
      >
        <p className="text-sm font-bold text-[#57514A]">
          Select an ingredient above to place your secret bid
        </p>
      </div>
    );
  }

  const isBasic = selectedIngredient.isBasic || selectedIngredient.basePrice === 0;
  const minBid = isBasic ? 0 : selectedIngredient.basePrice;
  const maxBid = isBasic ? 0 : budget;

  const canDecrement = !isLocked && !isBasic && bidAmount > minBid;
  const canIncrement = !isLocked && !isBasic && bidAmount < maxBid;

  const handleDecrement = () => {
    if (canDecrement) {
      onChangeBid(bidAmount - 1);
    }
  };

  const handleIncrement = () => {
    if (canIncrement) {
      onChangeBid(bidAmount + 1);
    }
  };

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!isLocked && !isBasic) {
      onChangeBid(Number(e.target.value));
    }
  };

  return (
    <div
      data-testid="bid-controls-container"
      className={`w-full min-h-[116px] p-3 sm:p-4 bg-[#FFFFFF] rounded-2xl border-2 border-[#1E1B18] shadow-[0_4px_0_#1E1B18] flex flex-col justify-between gap-3 ${className}`}
    >
      {isLocked ? (
        <div className="flex flex-col items-center justify-center py-2 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#1D7A4C] text-[#FFFFFF] border-2 border-[#1E1B18] shadow-[0_3px_0_#1E1B18] font-bold text-sm">
            <Lock className="w-4 h-4 text-[#FFB703]" />
            <span>
              Bid Locked: ${bidAmount} on {selectedIngredient.name}
            </span>
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <p className="text-xs text-[#57514A] font-bold mt-2 animate-pulse">
            Waiting for opponent to lock in their bid...
          </p>
        </div>
      ) : (
        <>
          {/* Stepper Row: - $1, Slider / Value, + $1 */}
          <div className="flex items-center justify-between gap-2.5">
            <button
              type="button"
              data-testid="bid-decrement-btn"
              onClick={handleDecrement}
              disabled={!canDecrement}
              aria-label="Decrease bid by $1"
              className="min-h-[44px] min-w-[44px] rounded-xl border-2 border-[#1E1B18] bg-[#F4EFE2] hover:bg-[#FFB703] disabled:opacity-40 disabled:hover:bg-[#F4EFE2] disabled:cursor-not-allowed shadow-[0_3px_0_#1E1B18] active:translate-y-[1px] active:shadow-[0_1px_0_#1E1B18] transition flex items-center justify-center cursor-pointer font-bold text-sm shrink-0"
            >
              <Minus className="w-5 h-5 text-[#1E1B18]" />
            </button>

            {/* Middle slider & bid display */}
            <div className="flex-1 flex flex-col items-center px-2">
              <div className="flex items-center gap-2 text-sm font-extrabold font-display text-[#1E1B18]">
                <span>Your Bid:</span>
                <span
                  data-testid="bid-amount-display"
                  className="text-lg font-black text-[#E63946] tabular-nums"
                >
                  ${isBasic ? 0 : bidAmount}
                </span>
                {isBasic && (
                  <span className="text-xs text-[#1D7A4C] font-bold">(Free Basic)</span>
                )}
              </div>

              <div className="w-full h-3 mt-1.5 flex items-center">
                {isBasic ? (
                  <div className="w-full h-2 bg-[#F4EFE2] rounded-lg border border-[#57514A]/30 opacity-60" />
                ) : (
                  <input
                    type="range"
                    data-testid="bid-slider"
                    min={minBid}
                    max={maxBid}
                    value={bidAmount}
                    onChange={handleSliderChange}
                    aria-label="Bid amount slider"
                    className="w-full h-2 bg-[#F4EFE2] rounded-lg appearance-none cursor-pointer accent-[#E63946] border border-[#1E1B18]"
                  />
                )}
              </div>
            </div>

            <button
              type="button"
              data-testid="bid-increment-btn"
              onClick={handleIncrement}
              disabled={!canIncrement}
              aria-label="Increase bid by $1"
              className="min-h-[44px] min-w-[44px] rounded-xl border-2 border-[#1E1B18] bg-[#F4EFE2] hover:bg-[#FFB703] disabled:opacity-40 disabled:hover:bg-[#F4EFE2] disabled:cursor-not-allowed shadow-[0_3px_0_#1E1B18] active:translate-y-[1px] active:shadow-[0_1px_0_#1E1B18] transition flex items-center justify-center cursor-pointer font-bold text-sm shrink-0"
            >
              <Plus className="w-5 h-5 text-[#1E1B18]" />
            </button>
          </div>

          {/* Primary Lock In Bid CTA */}
          <Button
            type="button"
            data-testid="lock-bid-btn"
            variant="primary"
            size="lg"
            fullWidth
            onClick={onLockBid}
            icon={<Lock className="w-5 h-5" />}
          >
            {isBasic
              ? `Lock In Free Basic ($0)`
              : `Lock In Bid ($${bidAmount} on ${selectedIngredient.name})`}
          </Button>
        </>
      )}
    </div>
  );
};
