import React, { useState, useEffect, useRef } from 'react';
import {
  PublicMatchView,
  Ingredient,
  TIERS,
  getResolutionCueForPlayer,
} from '@bidding-kitchen/shared';
import { TimerBar } from '../components/ui/TimerBar.js';
import { BudgetBar } from '../components/ui/BudgetBar.js';
import { OpponentStatusHeader } from '../components/game/OpponentStatusHeader.js';
import { DishVisualizer } from '../components/game/DishVisualizer.js';
import { CustomerOrderBanner } from '../components/game/CustomerOrderBanner.js';
import { ChefsTipBanner } from '../components/game/ChefsTipBanner.js';
import { IngredientCard } from '../components/game/IngredientCard.js';
import { BidControls } from '../components/game/BidControls.js';
import { BidFlipCompare } from '../components/game/BidFlipCompare.js';
import { ConnectionBanner } from '../components/layout/ConnectionBanner.js';
import { Layers, Sparkles, Lock } from 'lucide-react';
import { useSound } from '../hooks/useSound.js';
import { useHaptics } from '../hooks/useHaptics.js';
import { useReducedMotion } from '../hooks/useReducedMotion.js';
import { getResolveAnimationPhase } from '../tokens/motion-tokens.js';

export interface AuctionRoundScreenProps {
  match: PublicMatchView;
  myPlayerId: string;
  countdownSeconds?: number;
  stateRemainingMs?: number;
  forcedElapsedMs?: number;
  onLockBid?: (ingredientId: string, amount: number) => void;
}

export const AuctionRoundScreen: React.FC<AuctionRoundScreenProps> = ({
  match,
  myPlayerId,
  countdownSeconds,
  stateRemainingMs,
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
  const isRoundReveal = match.state === 'ROUND_REVEAL';
  const isLockedState = match.state === 'LOCKED';
  const totalBiddingDuration = match.config?.biddingDurationMs ?? 30000;

  const timeRemainingMs =
    match.state === 'BIDDING' && stateRemainingMs !== undefined
      ? stateRemainingMs
      : countdownSeconds
      ? countdownSeconds * 1000
      : currentRound
      ? Math.max(0, currentRound.deadlineAt - match.serverNow)
      : totalBiddingDuration;

  // Deductions for BudgetBar during RESOLVE
  const myAward = currentRound?.resolution?.awardsByPlayer?.[me.id];
  const deductionAmount = myAward?.pricePaid ?? 0;
  const currentBudget = me.budget ?? 0;
  const previousBudget = currentBudget + deductionAmount;

  const liveAnnouncement = (() => {
    if (isResolve && currentRound?.resolution) {
      const myAward = currentRound.resolution.awardsByPlayer[me.id];
      const name = myAward?.ingredient?.name ?? 'an ingredient';
      const outcome = currentRound.resolution.outcomeType;
      return `Round resolved! Outcome: ${outcome}. You received ${name}.`;
    }
    if (isRoundEnd) {
      return `Round ${roundNum} complete. Ingredients plated.`;
    }
    if (myLocked) {
      return `Your bid of $${bidAmount} is locked. Waiting for opponent.`;
    }
    return `Round ${roundNum} of 5: ${slotName} auction. Remaining budget: $${myBudget}.`;
  })();

  return (
    <div
      data-testid="screen-auction-round"
      data-match-state={match.state}
      className="flex-1 flex flex-col justify-between max-w-lg mx-auto w-full gap-3 py-1 sm:py-2 animate-fade-in"
    >
      {/* Screen Reader Live Announcer */}
      <div className="sr-only" aria-live="polite" aria-atomic="true" data-testid="sr-live-announcer">
        {liveAnnouncement}
      </div>
      {/* 1. Connection Alert Banner (if disconnected) */}
      <ConnectionBanner
        opponentDisconnected={!opponent.connected}
        countdownSeconds={countdownSeconds ?? 28}
      />

      {/* 2. Top Header HUD: Opponent Status & Timer / Round State Banners */}
      <div className="space-y-2 shrink-0">
        <OpponentStatusHeader opponent={opponent} isLocked={opponentLocked} />

        {isRoundReveal ? (
          <div
            data-testid="round-reveal-banner"
            className="flex items-center justify-between px-3.5 py-2 rounded-2xl bg-[#FFB703] border-2 border-[#1E1B18] shadow-[0_3px_0_#1E1B18] text-xs font-black text-[#1E1B18]"
          >
            <span className="flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-[#1E1B18]" />
              <span>Round {roundNum} of 5: {slotName} Auction</span>
            </span>
            <span className="bg-[#FFFFFF] px-2.5 py-0.5 rounded-full border border-[#1E1B18] tabular-nums">
              Bidding opens in {countdownSeconds ?? 2}s...
            </span>
          </div>
        ) : isLockedState ? (
          <div
            data-testid="bids-locked-banner"
            className="w-full py-2 px-3.5 rounded-2xl bg-[#1E1B18] text-[#FFFFFF] text-xs font-black flex items-center justify-center gap-2 shadow-[0_3px_0_#1E1B18]"
          >
            <Lock className="w-4 h-4 text-[#FFB703]" />
            <span>All Bids Locked! Revealing cards...</span>
          </div>
        ) : isResolve ? (
          <div
            data-testid="round-resolving-banner"
            className="w-full py-2 px-3.5 rounded-2xl bg-[#FFFDF7] border-2 border-[#1E1B18] text-[#1E1B18] text-xs font-black flex items-center justify-between shadow-[0_3px_0_#1E1B18]"
          >
            <span className="flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-[#1D7A4C]" />
              <span>Resolving Round Outcome</span>
            </span>
            <span className="text-[11px] font-bold text-[#57514A]">
              Revealing Bids & Awards...
            </span>
          </div>
        ) : isRoundEnd ? (
          <div
            data-testid="round-end-banner"
            className="w-full py-2 px-3.5 rounded-2xl bg-[#FFFDF7] border-2 border-[#1E1B18] text-[#1E1B18] text-xs font-black flex items-center justify-between shadow-[0_3px_0_#1E1B18]"
          >
            <span className="flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-[#FFB703]" />
              <span>Round {roundNum} Complete</span>
            </span>
            <span className="text-[11px] font-bold text-[#57514A]">
              Next round in {countdownSeconds ?? 3}s...
            </span>
          </div>
        ) : (
          <TimerBar timeRemainingMs={timeRemainingMs} totalDurationMs={totalBiddingDuration} />
        )}
      </div>

      {/* Customer Secret Order Objective */}
      <CustomerOrderBanner order={me.secretOrder} dish={me.dish} />

      {/* Chef's Tip Celebration Banner */}
      <ChefsTipBanner
        awardedToMe={Boolean(
          currentRound?.resolution?.chefsTipAwardedToPlayerId === me.id ||
          (isResolve && currentRound?.roundIndex === 2 && me.chefsTipGranted)
        )}
      />

      {/* 3. Dish Visualizer Canvas (Reserved min-height to prevent layout shift) */}
      <div className="shrink-0">
        <DishVisualizer
          dish={me.dish}
          tier={match.tier}
          chefName={me.nickname}
          dishName={`Your Dish (${me.dish.length}/${TIERS[match.tier].roundsCount} Courses)`}
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
