import React, { useState, useEffect, useRef } from 'react';
import type { PublicMatchView } from '@bidding-kitchen/shared';
import { generateDishName } from '@bidding-kitchen/shared';
import confetti from 'canvas-confetti';
import { DishVisualizer } from '../components/game/DishVisualizer.js';
import { Button } from '../components/ui/Button.js';
import { Card } from '../components/ui/Card.js';
import { Trophy, Sparkles, Flame, Coins, ArrowRight, Star } from 'lucide-react';
import { useSound } from '../hooks/useSound.js';
import { useHaptics } from '../hooks/useHaptics.js';
import { useReducedMotion } from '../hooks/useReducedMotion.js';
import { getFinalRevealStep } from '../tokens/motion-tokens.js';

export interface FinalRevealScreenProps {
  match: PublicMatchView;
  myPlayerId: string;
  forcedElapsedMs?: number;
  onProceed?: () => void;
}

export const FinalRevealScreen: React.FC<FinalRevealScreenProps> = ({
  match,
  myPlayerId: _myPlayerId,
  forcedElapsedMs,
  onProceed,
}) => {
  const { playCue } = useSound();
  const { triggerHaptic } = useHaptics();
  const prefersReducedMotion = useReducedMotion();

  const result = match.result;
  const p0 = match.players[0]!;
  const p1 = match.players[1]!;

  const p0Score = result?.scoresByPlayer[p0.id];
  const p1Score = result?.scoresByPlayer[p1.id];

  const winner = (p0.id === result?.winnerId ? p0 : p1) ?? p1;

  const p0DishName = p0Score?.generatedDishName ?? generateDishName(p0.dish);
  const p1DishName = p1Score?.generatedDishName ?? generateDishName(p1.dish);

  // Time tracking for stepwise tally
  const [liveElapsedMs, setLiveElapsedMs] = useState<number>(0);
  const startTimeRef = useRef<number>(Date.now());
  const confettiFiredRef = useRef<boolean>(false);

  // Parse ?animStepMs= from URL if present
  const parsedAnimStepMs = (() => {
    if (typeof window === 'undefined') return undefined;
    try {
      const param = new URLSearchParams(window.location.search).get('animStepMs');
      return param !== null ? Number(param) : undefined;
    } catch {
      return undefined;
    }
  })();

  const effectiveElapsedMs = forcedElapsedMs ?? parsedAnimStepMs ?? liveElapsedMs;

  useEffect(() => {
    startTimeRef.current = Date.now();
    const interval = setInterval(() => {
      setLiveElapsedMs(Date.now() - startTimeRef.current);
    }, 16);
    return () => clearInterval(interval);
  }, []);

  const step = getFinalRevealStep(effectiveElapsedMs, prefersReducedMotion);

  // Trigger fanfare and confetti at Step 5
  useEffect(() => {
    if (step === 5 && !confettiFiredRef.current) {
      confettiFiredRef.current = true;
      playCue('victoryFanfare');
      triggerHaptic('success');

      if (
        !prefersReducedMotion &&
        typeof window !== 'undefined' &&
        typeof HTMLCanvasElement !== 'undefined' &&
        typeof HTMLCanvasElement.prototype.getContext === 'function'
      ) {
        try {
          const res = confetti({
            particleCount: 80,
            spread: 70,
            origin: { y: 0.6 },
            colors: ['#FFB703', '#E63946', '#1D7A4C', '#FB923C', '#2A9D8F'],
          });
          if (res && typeof res.catch === 'function') {
            res.catch(() => {});
          }
        } catch {
          // Non-fatal if canvas or window is unsupported
        }
      }
    }
  }, [step, prefersReducedMotion, playCue, triggerHaptic]);

  // Compute displayed values according to step
  const showTaste = step >= 1;
  const showCombos = step >= 2;
  const showOrder = step >= 3;
  const showCash = step >= 4;
  const showTotal = step >= 5;

  return (
    <div
      data-testid="screen-final-reveal"
      className="flex-1 flex flex-col items-center justify-between max-w-lg mx-auto w-full py-2 animate-fade-in text-center"
    >
      {/* Hidden/Active Step Indicator for DOM testing & visual QA */}
      <div
        data-testid="final-reveal-step"
        data-step={step}
        className="sr-only"
        aria-live="polite"
      >
        Step {step} of 5
      </div>

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
            {p0.nickname}:{' '}
            <strong className="text-base text-[#1E1B18]">
              {showTotal ? `${p0Score?.finalScore ?? 0} pts` : `${p0Score?.tastePoints ?? 0} pts...`}
            </strong>
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
            {p1.nickname}:{' '}
            <strong className="text-base text-[#1D7A4C]">
              {showTotal ? `${p1Score?.finalScore ?? 0} pts 👑` : `${p1Score?.tastePoints ?? 0} pts...`}
            </strong>
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
          {/* Step 1: Base Taste */}
          <div
            data-testid="score-row-taste"
            className={`flex items-center justify-between transition-opacity duration-200 ${
              showTaste ? 'opacity-100 font-black' : 'opacity-30'
            }`}
          >
            <span className="text-[#57514A]">Ingredient Taste Points:</span>
            <span className="tabular-nums font-black">
              {showTaste ? (
                <>
                  {p0Score?.tastePoints ?? 0} vs{' '}
                  <strong className="text-[#1D7A4C]">{p1Score?.tastePoints ?? 0}</strong>
                </>
              ) : (
                '...'
              )}
            </span>
          </div>

          {/* Step 2: Combos */}
          <div
            data-testid="score-row-combos"
            className={`flex items-center justify-between transition-opacity duration-200 ${
              showCombos ? 'opacity-100 font-black' : 'opacity-30'
            }`}
          >
            <span className="flex items-center gap-1 text-[#57514A]">
              <Flame className="w-3.5 h-3.5 text-[#E63946]" />
              <span>Combo Bonuses:</span>
            </span>
            <span className="tabular-nums font-black text-[#E63946]">
              {showCombos ? `+${p0Score?.comboPoints ?? 0} vs +${p1Score?.comboPoints ?? 0}` : '...'}
            </span>
          </div>

          {/* Step 3: Customer Orders / Secret Bonus */}
          <div
            data-testid="score-row-order"
            className={`flex items-center justify-between transition-opacity duration-200 ${
              showOrder ? 'opacity-100 font-black' : 'opacity-30'
            }`}
          >
            <span className="flex items-center gap-1 text-[#57514A]">
              <Star className="w-3.5 h-3.5 text-[#2A9D8F]" />
              <span>Customer Order Bonus:</span>
            </span>
            <span className="tabular-nums font-black text-[#2A9D8F]">
              {showOrder
                ? `+${p0Score?.orderBonusPoints ?? 0} vs +${p1Score?.orderBonusPoints ?? 0}`
                : '...'}
            </span>
          </div>

          {/* Step 4: Leftover money */}
          <div
            data-testid="score-row-cash"
            className={`flex items-center justify-between transition-opacity duration-200 ${
              showCash ? 'opacity-100 font-black' : 'opacity-30'
            }`}
          >
            <span className="flex items-center gap-1 text-[#57514A]">
              <Coins className="w-3.5 h-3.5 text-[#FFB703]" />
              <span>Leftover Cash Bonus:</span>
            </span>
            <span className="tabular-nums font-black text-[#FFB703]">
              {showCash
                ? `+${p0Score?.leftoverMoneyBonus ?? 0} vs +${p1Score?.leftoverMoneyBonus ?? 0}`
                : '...'}
            </span>
          </div>

          {/* Step 5: Total */}
          <div
            data-testid="score-row-total"
            className={`flex items-center justify-between pt-2 border-t border-[#F4EFE2] text-sm font-black transition-opacity duration-300 ${
              showTotal ? 'opacity-100' : 'opacity-40'
            }`}
          >
            <span>Final Tally:</span>
            <span className="tabular-nums">
              {showTotal ? (
                <>
                  {p0Score?.finalScore ?? 0} pts vs{' '}
                  <strong className="text-base text-[#1D7A4C]">
                    {p1Score?.finalScore ?? 0} pts
                  </strong>
                </>
              ) : (
                'Tallying...'
              )}
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
