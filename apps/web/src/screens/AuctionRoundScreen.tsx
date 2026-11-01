import React, { useState, useEffect, useRef } from 'react';
import {
  PublicMatchView,
  Ingredient,
  getResolutionCueForPlayer,
} from '@bidding-kitchen/shared';
import { TimerBar } from '../components/ui/TimerBar.js';
import { BudgetBar } from '../components/ui/BudgetBar.js';
import { OpponentStatusHeader } from '../components/game/OpponentStatusHeader.js';
import { DishVisualizer } from '../components/game/DishVisualizer.js';
import { IngredientCard } from '../components/game/IngredientCard.js';
import { BidControls } from '../components/game/BidControls.js';
import { BidFlipCompare } from '../components/game/BidFlipCompare.js';
import { ConnectionBanner } from '../components/layout/ConnectionBanner.js';
import { Layers } from 'lucide-react';
import { useSound } from '../hooks/useSound.js';
import { useHaptics } from '../hooks/useHaptics.js';
import { useReducedMotion } from '../hooks/useReducedMotion.js';
import { getResolveAnimationPhase } from '../tokens/motion-tokens.js';

export interface AuctionRoundScreenProps {
  match: PublicMatchView;
  myPlayerId: string;
  countdownSeconds?: number;
  forcedElapsedMs?: number;
  onLockBid?: (ingredientId: string, amount: number) => void;
}

export const AuctionRoundScreen: React.FC<AuctionRoundScreenProps> = ({
  match,
  myPlayerId,
  countdownSeconds,
  forcedElapsedMs,
  onLockBid,
}) => {
  const { playCue } = useSound();
  const { triggerHaptic } = useHaptics();
  const prefersReducedMotion = useReducedMotion();

  const p0 = match.players[0];
  const p1 = match.players[1];

  const me = (p0?.id === myPlayerId ? p0 : p1?.id === myPlayerId ? p1 : p0) ?? {
    id: myPlayerId,
    nickname: 'Chef',
    seat: 0 as const,
    ready: true,
    connected: true,
    disconnectedAt: null,
    budget: 20,
    dish: [],
    secretOrder: null,
    chefsTipGranted: false,
  };

  const opponent = (me.id === p0?.id ? p1 : p0) ?? {
    id: 'opponent',
    nickname: 'Opponent Chef',
    seat: 1 as const,
    ready: true,
    connected: true,
    disconnectedAt: null,
    budget: 20,
    dish: [],
    secretOrder: null,
    chefsTipGranted: false,
  };

  const currentRound = match.currentRound;
  const isResolve = match.state === 'RESOLVE';
  const isRoundEnd = match.state === 'ROUND_END';

  // Check if I have already locked a bid
  const myLocked = currentRound?.bidsLockedByPlayer?.[me.id] ?? false;
  const opponentLocked = currentRound?.bidsLockedByPlayer?.[opponent.id] ?? false;

  // Selected ingredient state
  const available = currentRound?.availableIngredients ?? [];
  const defaultSelection =
    available.find((i) => i.id === currentRound?.myLockedBid?.ingredientId) ??
    available[0] ??
    null;

  const [selectedIngredient, setSelectedIngredient] = useState<Ingredient | null>(defaultSelection);
  const [bidAmount, setBidAmount] = useState<number>(() => {
    if (currentRound?.myLockedBid) return currentRound.myLockedBid.amount;
    if (defaultSelection) return defaultSelection.basePrice;
    return 0;
  });

  const myBudget = me.budget ?? 0;

  // Track elapsed time during RESOLVE for deterministic animation steps
  const [liveElapsedMs, setLiveElapsedMs] = useState<number>(0);
  const resolveStartTimeRef = useRef<number>(Date.now());
  const firedCuesRef = useRef<Set<string>>(new Set());

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
    if (match.state === 'RESOLVE') {
      resolveStartTimeRef.current = Date.now();
      setLiveElapsedMs(0);
      firedCuesRef.current.clear();

      const timer = setInterval(() => {
        setLiveElapsedMs(Date.now() - resolveStartTimeRef.current);
      }, 16);

      return () => clearInterval(timer);
    } else {
      firedCuesRef.current.clear();
    }
  }, [match.state, match.roundIndex]);

  // Audio & Haptic trigger synchronization
  useEffect(() => {
    if (match.state !== 'RESOLVE') return;

    // 1. At 0ms: cardFlipWhoosh
    if (!firedCuesRef.current.has('whoosh') && effectiveElapsedMs >= 0) {
      firedCuesRef.current.add('whoosh');
      playCue('cardFlipWhoosh');
      triggerHaptic('medium');
    }

    // 2. At 600ms: Resolution outcome cue
    if (!firedCuesRef.current.has('outcome') && effectiveElapsedMs >= 600) {
      firedCuesRef.current.add('outcome');
      if (currentRound?.resolution) {
        const cue = getResolutionCueForPlayer(currentRound.resolution, me.id);
        if (cue.soundCue === 'CASH_WIN') {
          playCue('cashRegisterChime');
          triggerHaptic('light');
        } else {
          playCue('fallbackBoop');
          triggerHaptic('light');
        }
      }
    }

    // 3. At 950ms: Ingredient slap and sizzle
    if (!firedCuesRef.current.has('slap') && effectiveElapsedMs >= 950) {
      firedCuesRef.current.add('slap');
      playCue('ingredientSlapSizzle');
      triggerHaptic('heavy');
    }
  }, [match.state, effectiveElapsedMs, currentRound?.resolution, me.id, playCue, triggerHaptic]);

  // Animation phase calculations
  const animPhase = getResolveAnimationPhase(effectiveElapsedMs, prefersReducedMotion);

  // Keep selection synchronized when round or fixture changes
  useEffect(() => {
    if (currentRound?.myLockedBid) {
      const lockedIng = available.find((i) => i.id === currentRound.myLockedBid?.ingredientId);
      if (lockedIng) {
        setSelectedIngredient(lockedIng);
        setBidAmount(currentRound.myLockedBid.amount);
        return;
      }
    }
    if (available.length > 0 && (!selectedIngredient || !available.find((i) => i.id === selectedIngredient.id))) {
      const first = available[0]!;
      setSelectedIngredient(first);
      setBidAmount(first.basePrice);
    }
  }, [currentRound, available]);

  const handleSelectIngredient = (ingredient: Ingredient) => {
    if (myLocked) return;
    playCue('cardSlide');
    triggerHaptic('light');
    setSelectedIngredient(ingredient);
    if (ingredient.isBasic || ingredient.basePrice === 0) {
      setBidAmount(0);
    } else {
      setBidAmount(Math.max(ingredient.basePrice, Math.min(bidAmount, myBudget)));
    }
  };

  const handleLockBid = () => {
    if (!selectedIngredient || myLocked) return;
    const finalAmount = selectedIngredient.isBasic ? 0 : bidAmount;
    onLockBid?.(selectedIngredient.id, finalAmount);
  };

  const slotName = currentRound?.slot ?? 'INGREDIENT';
  const roundNum = (currentRound?.roundIndex ?? match.roundIndex) + 1;
  const timeRemainingMs = countdownSeconds
    ? countdownSeconds * 1000
    : currentRound
    ? Math.max(0, currentRound.deadlineAt - match.serverNow)
    : 15000;

  // Deductions for BudgetBar during RESOLVE
  const myAward = currentRound?.resolution?.awardsByPlayer?.[me.id];
  const deductionAmount = myAward?.pricePaid ?? 0;
  const currentBudget = me.budget ?? 0;
  const previousBudget = currentBudget + deductionAmount;

  return (
    <div
      data-testid="screen-auction-round"
      data-match-state={match.state}
      className="flex-1 flex flex-col justify-between max-w-lg mx-auto w-full gap-3 py-1 sm:py-2 animate-fade-in"
    >
      {/* 1. Connection Alert Banner (if disconnected) */}
      <ConnectionBanner
        opponentDisconnected={!opponent.connected}
        countdownSeconds={countdownSeconds ?? 28}
      />

      {/* 2. Top Header HUD: Opponent Status & Timer */}
      <div className="space-y-2 shrink-0">
        <OpponentStatusHeader opponent={opponent} isLocked={opponentLocked} />
        <TimerBar timeRemainingMs={timeRemainingMs} />
      </div>

      {/* 3. Dish Visualizer Canvas (Reserved min-height to prevent layout shift) */}
      <div className="shrink-0">
        <DishVisualizer
          dish={me.dish}
          chefName={me.nickname}
          dishName={`Your Burger (${me.dish.length}/5 Layers)`}
          elapsedMs={isResolve ? effectiveElapsedMs : undefined}
          dishSlapPhase={isResolve ? animPhase.dishSlapPhase : undefined}
        />
      </div>

      {/* 4. Main Interactive Area: Bidding or Round Resolution or Breather */}
      {isResolve && currentRound?.resolution && p0 && p1 ? (
        <div className="flex-1 flex flex-col justify-center gap-3">
          {/* Animated Budget Bar during Resolution */}
          <BudgetBar
            budget={currentBudget}
            previousBudget={previousBudget}
            deductionAmount={deductionAmount}
            drainProgress={animPhase.budgetDrainProgress}
            label="Remaining Budget"
          />

          <BidFlipCompare
            resolution={currentRound.resolution}
            p1={p0}
            p2={p1}
            myPlayerId={me.id}
            elapsedMs={effectiveElapsedMs}
          />
        </div>
      ) : isRoundEnd ? (
        <div className="flex-1 flex flex-col items-center justify-center p-6 bg-[#FFFFFF] rounded-3xl border-3 border-[#1E1B18] shadow-[0_6px_0_#1E1B18] text-center">
          <span className="px-3 py-1 rounded-full bg-[#FFB703] border border-[#1E1B18] font-black text-xs uppercase mb-2">
            Round {roundNum} Complete!
          </span>
          <h3 className="text-xl font-black font-display text-[#1E1B18] mb-1">
            Ingredients Plated!
          </h3>
          <p className="text-xs text-[#57514A] font-bold">
            Preparing Round {roundNum + 1} auction in 3s...
          </p>
        </div>
      ) : (
        <>
          {/* Slot Header Title */}
          <div className="flex items-center justify-between px-1 shrink-0">
            <span className="text-xs font-black font-display text-[#1E1B18] flex items-center gap-1.5 uppercase tracking-wide">
              <Layers className="w-4 h-4 text-[#FFB703]" />
              <span>
                Round {roundNum} of 5: {slotName}
              </span>
            </span>
            <span className="text-[11px] font-bold text-[#57514A]">
              Your Budget: <strong className="text-[#1D7A4C]">${myBudget}</strong>
            </span>
          </div>

          {/* Ingredient Variants Grid (2x2 on mobile, responsive) */}
          <div
            data-testid="variants-grid"
            className="grid grid-cols-2 gap-2 sm:gap-3 flex-1 overflow-y-auto min-h-0"
          >
            {available.map((ingredient, idx) => {
              const cannotAfford = ingredient.basePrice > myBudget && !ingredient.isBasic;
              const isSelected = selectedIngredient?.id === ingredient.id;

              return (
                <IngredientCard
                  key={ingredient.id}
                  ingredient={ingredient}
                  index={idx}
                  selected={isSelected}
                  disabled={cannotAfford || myLocked}
                  disabledReason={cannotAfford ? 'Need more $' : undefined}
                  onSelect={handleSelectIngredient}
                />
              );
            })}
          </div>

          {/* 5. Sticky BidControls Dock in lower 60% of viewport */}
          <div className="sticky bottom-0 z-20 shrink-0 pt-1">
            <BidControls
              selectedIngredient={selectedIngredient}
              bidAmount={bidAmount}
              budget={myBudget}
              isLocked={myLocked}
              onChangeBid={setBidAmount}
              onLockBid={handleLockBid}
            />
          </div>
        </>
      )}
    </div>
  );
};
