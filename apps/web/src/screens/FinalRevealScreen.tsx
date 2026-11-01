import React from 'react';
import type { PublicMatchView } from '@bidding-kitchen/shared';
import { generateDishName } from '@bidding-kitchen/shared';
import { DishVisualizer } from '../components/game/DishVisualizer.js';
import { Button } from '../components/ui/Button.js';
import { Card } from '../components/ui/Card.js';
import { Trophy, Sparkles, Flame, Coins, ArrowRight } from 'lucide-react';

export interface FinalRevealScreenProps {
  match: PublicMatchView;
  myPlayerId: string;
  onProceed?: () => void;
}

export const FinalRevealScreen: React.FC<FinalRevealScreenProps> = ({
  match,
  myPlayerId: _myPlayerId,
  onProceed,
}) => {
  const result = match.result;
  const p0 = match.players[0]!;
  const p1 = match.players[1]!;

  const p0Score = result?.scoresByPlayer[p0.id];
  const p1Score = result?.scoresByPlayer[p1.id];

  const winner = (p0.id === result?.winnerId ? p0 : p1) ?? p1;

  const p0DishName = p0Score?.generatedDishName ?? generateDishName(p0.dish);
  const p1DishName = p1Score?.generatedDishName ?? generateDishName(p1.dish);

  return (
    <div
      data-testid="screen-final-reveal"
      className="flex-1 flex flex-col items-center justify-between max-w-lg mx-auto w-full py-2 animate-fade-in text-center"
    >
      {/* Title Header */}
      <div className="mb-3">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FFB703] border-2 border-[#1E1B18] text-xs font-black font-display shadow-[0_2px_0_#1E1B18] uppercase tracking-wider mb-2">
          <Trophy className="w-3.5 h-3.5" />
          <span>The Grand Tasting</span>
        </span>
        <h2 className="text-2xl sm:text-3xl font-black font-display text-[#1E1B18]">
          {winner.nickname} Wins the Match!
        </h2>
        <p className="text-xs text-[#57514A] font-bold mt-1">
          {result?.winnerTitle ?? 'Master Chef'} • {result?.keyMomentText ?? 'Golden Spatula Champion!'}
        </p>
      </div>

      {/* Side-by-side Finished Burger Plates */}
      <div className="w-full grid grid-cols-2 gap-2 sm:gap-3 mb-4">
        {/* P0 Plate */}
        <div className="flex flex-col items-center">
          <DishVisualizer
            dish={p0.dish}
            chefName={p0.nickname}
            dishName={p0DishName}
            className="w-full"
          />
          <span className="text-xs font-black font-display text-[#1E1B18] mt-1.5">
            {p0.nickname}: <strong className="text-base text-[#1E1B18]">{p0Score?.finalScore ?? 0} pts</strong>
          </span>
        </div>

        {/* P1 Plate */}
        <div className="flex flex-col items-center">
          <DishVisualizer
            dish={p1.dish}
            chefName={p1.nickname}
            dishName={p1DishName}
            className="w-full"
          />
          <span className="text-xs font-black font-display text-[#1E1B18] mt-1.5">
            {p1.nickname}: <strong className="text-base text-[#1D7A4C]">{p1Score?.finalScore ?? 0} pts 👑</strong>
          </span>
        </div>
      </div>

      {/* Score Breakdown Tally Card */}
      <Card padding="sm" className="w-full mb-4 text-left">
        <div className="flex items-center justify-between pb-2 mb-2 border-b-2 border-[#1E1B18]">
          <span className="text-xs font-black font-display uppercase tracking-wider text-[#1E1B18] flex items-center gap-1">
            <Sparkles className="w-4 h-4 text-[#FFB703]" />
            <span>Score Breakdown</span>
          </span>
          <span className="text-xs font-extrabold text-[#57514A]">
            {p0.nickname} vs {p1.nickname}
          </span>
        </div>

        <div className="space-y-2 text-xs font-bold text-[#1E1B18]">
          {/* Base Taste */}
          <div className="flex items-center justify-between">
            <span className="text-[#57514A]">Ingredient Taste Points:</span>
            <span className="tabular-nums font-black">
              {p0Score?.tastePoints ?? 0} vs <strong className="text-[#1D7A4C]">{p1Score?.tastePoints ?? 0}</strong>
            </span>
          </div>

          {/* Combos */}
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1 text-[#57514A]">
              <Flame className="w-3.5 h-3.5 text-[#E63946]" />
              <span>Combo Bonuses:</span>
            </span>
            <span className="tabular-nums font-black text-[#E63946]">
              +{p0Score?.comboPoints ?? 0} vs +{p1Score?.comboPoints ?? 0}
            </span>
          </div>

          {/* Leftover money */}
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1 text-[#57514A]">
              <Coins className="w-3.5 h-3.5 text-[#FFB703]" />
              <span>Leftover Cash Bonus:</span>
            </span>
            <span className="tabular-nums font-black text-[#FFB703]">
              +{p0Score?.leftoverMoneyBonus ?? 0} vs +{p1Score?.leftoverMoneyBonus ?? 0}
            </span>
          </div>

          {/* Total */}
          <div className="flex items-center justify-between pt-2 border-t border-[#F4EFE2] text-sm font-black">
            <span>Final Tally:</span>
            <span className="tabular-nums">
              {p0Score?.finalScore ?? 0} pts vs{' '}
              <strong className="text-base text-[#1D7A4C]">{p1Score?.finalScore ?? 0} pts</strong>
            </span>
          </div>
        </div>
      </Card>

      {/* Proceed CTA */}
      <div className="w-full mt-auto">
        <Button
          type="button"
          data-testid="proceed-post-match-btn"
          variant="primary"
          size="lg"
          fullWidth
          onClick={onProceed}
          icon={<ArrowRight className="w-5 h-5" />}
        >
          Proceed to Match Recap
        </Button>
      </div>
    </div>
  );
};
