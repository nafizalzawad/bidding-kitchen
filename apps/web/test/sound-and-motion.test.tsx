import React from 'react';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { soundEngine, SoundEngine } from '../src/audio/sound-engine';
import {
  getResolveAnimationPhase,
  getFinalRevealStep,
} from '../src/tokens/motion-tokens';
import { SoundToggle } from '../src/components/ui/SoundToggle';
import { BudgetBar } from '../src/components/ui/BudgetBar';
import { BidFlipCompare } from '../src/components/game/BidFlipCompare';
import { FinalRevealScreen } from '../src/screens/FinalRevealScreen';
import { MOCK_HARNESS_STATES } from '../src/fixtures/mock-match-states';

class MockStorage implements Storage {
  private store = new Map<string, string>();
  get length() {
    return this.store.size;
  }
  clear() {
    this.store.clear();
  }
  getItem(key: string) {
    return this.store.get(key) ?? null;
  }
  key(index: number) {
    return Array.from(this.store.keys())[index] ?? null;
  }
  removeItem(key: string) {
    this.store.delete(key);
  }
  setItem(key: string, value: string) {
    this.store.set(key, String(value));
  }
}

const mockLocal = new MockStorage();
Object.defineProperty(window, 'localStorage', { value: mockLocal, writable: true });

describe('SoundEngine & Audio Synthesis Unit Tests', () => {
  let testEngine: SoundEngine;

  beforeEach(() => {
    localStorage.clear();
    testEngine = new SoundEngine();
  });

  afterEach(() => {
    soundEngine.clearSoundLog();
  });

  it('initializes unmuted by default and reads stored preference', () => {
    expect(testEngine.isMuted()).toBe(false);

    localStorage.setItem('bk_sound_muted', 'true');
    const mutedEngine = new SoundEngine();
    expect(mutedEngine.isMuted()).toBe(true);
  });

  it('toggles mute and persists to localStorage', () => {
    const isMutedNow = testEngine.toggleMute();
    expect(isMutedNow).toBe(true);
    expect(testEngine.isMuted()).toBe(true);
    expect(localStorage.getItem('bk_sound_muted')).toBe('true');

    testEngine.toggleMute();
    expect(testEngine.isMuted()).toBe(false);
    expect(localStorage.getItem('bk_sound_muted')).toBe('false');
  });

  it('records played cues into soundLog without crashing in headless/jsdom environment', () => {
    testEngine.clearSoundLog();
    testEngine.playCue('cardSlide');
    testEngine.playCue('bidTick');
    testEngine.playCue('bidLockDing');
    testEngine.playCue('cardFlipWhoosh');
    testEngine.playCue('cashRegisterChime');
    testEngine.playCue('ingredientSlapSizzle');
    testEngine.playCue('fallbackBoop');
    testEngine.playCue('victoryFanfare');

    expect(testEngine.getSoundLog()).toEqual([
      'cardSlide',
      'bidTick',
      'bidLockDing',
      'cardFlipWhoosh',
      'cashRegisterChime',
      'ingredientSlapSizzle',
      'fallbackBoop',
      'victoryFanfare',
    ]);
  });
});

describe('Motion Tokens & Timeline Phase Transitions', () => {
  it('computes exact resolve timeline phases across all checkpoints', () => {
    // Checkpoint 1 (100ms): face-down cards, no outcome badge, waiting dish slap
    const cp1 = getResolveAnimationPhase(100, false);
    expect(cp1.cardFlipPhase).toBe('face-down');
    expect(cp1.showOutcomeBadge).toBe(false);
    expect(cp1.dishSlapPhase).toBe('waiting');
    expect(cp1.budgetDrainProgress).toBe(0);

    // Flipping transition (300ms)
    const flipping = getResolveAnimationPhase(300, false);
    expect(flipping.cardFlipPhase).toBe('flipping');
    expect(flipping.showOutcomeBadge).toBe(false);

    // Checkpoint 2 (700ms): face-up cards, outcome badge visible
    const cp2 = getResolveAnimationPhase(700, false);
    expect(cp2.cardFlipPhase).toBe('face-up');
    expect(cp2.showOutcomeBadge).toBe(true);
    expect(cp2.dishSlapPhase).toBe('waiting');
    expect(cp2.budgetDrainProgress).toBe(0);

    // Mid-slap (1000ms): slapping active
    const slapping = getResolveAnimationPhase(1000, false);
    expect(slapping.dishSlapPhase).toBe('slapping');

    // Budget draining (1325ms)
    const draining = getResolveAnimationPhase(1325, false);
    expect(draining.dishSlapPhase).toBe('slapping');
    expect(draining.budgetDrainProgress).toBeGreaterThan(0.4);
    expect(draining.budgetDrainProgress).toBeLessThan(0.6);

    // Checkpoint 3 (1600ms): landed on burger, budget fully drained
    const cp3 = getResolveAnimationPhase(1600, false);
    expect(cp3.cardFlipPhase).toBe('face-up');
    expect(cp3.showOutcomeBadge).toBe(true);
    expect(cp3.dishSlapPhase).toBe('landed');
    expect(cp3.budgetDrainProgress).toBe(1);
  });

  it('forces instant final state when prefersReducedMotion is active', () => {
    const reduced = getResolveAnimationPhase(50, true);
    expect(reduced.cardFlipPhase).toBe('face-up');
    expect(reduced.showOutcomeBadge).toBe(true);
    expect(reduced.dishSlapPhase).toBe('landed');
    expect(reduced.budgetDrainProgress).toBe(1);
  });

  it('computes stepwise progression for FinalRevealScreen (Steps 1 through 5)', () => {
    expect(getFinalRevealStep(300, false)).toBe(1); // Checkpoint 4
    expect(getFinalRevealStep(900, false)).toBe(2);
    expect(getFinalRevealStep(1500, false)).toBe(3);
    expect(getFinalRevealStep(2100, false)).toBe(4);
    expect(getFinalRevealStep(3000, false)).toBe(5); // Checkpoint 5

    // Reduced motion always skips to Step 5
    expect(getFinalRevealStep(100, true)).toBe(5);
  });
});

describe('Animation Components & Visual Indicators', () => {
  it('renders SoundToggle and toggles soundEngine mute state', () => {
    soundEngine.setMuted(false);
    render(<SoundToggle />);

    const toggleBtn = screen.getByTestId('sound-toggle-btn');
    expect(toggleBtn).toHaveAttribute('aria-label', 'Mute game sounds');

    fireEvent.click(toggleBtn);
    expect(soundEngine.isMuted()).toBe(true);
    expect(toggleBtn).toHaveAttribute('aria-label', 'Unmute game sounds');
  });

  it('renders BudgetBar with floating deduction pill when budget decreases', () => {
    const { rerender } = render(
      <BudgetBar budget={20} maxBudget={20} label="Budget" />,
    );
    expect(screen.queryByTestId('budget-deduction-pill')).not.toBeInTheDocument();

    // With deduction
    rerender(
      <BudgetBar
        budget={14}
        previousBudget={20}
        deductionAmount={6}
        drainProgress={0.5}
        maxBudget={20}
      />,
    );
    const pill = screen.getByTestId('budget-deduction-pill');
    expect(pill).toBeInTheDocument();
    expect(pill).toHaveTextContent('-$6');
  });

  it('renders BidFlipCompare mystery sealed vault at 100ms and revealed cards at 700ms', () => {
    const match = MOCK_HARNESS_STATES.ROUND_RESOLVE_COLLISION.match!;
    const p1 = match.players[0]!;
    const p2 = match.players[1]!;
    const resolution = match.currentRound!.resolution!;

    // Checkpoint 1 (100ms)
    const { unmount } = render(
      <BidFlipCompare
        resolution={resolution}
        p1={p1}
        p2={p2}
        myPlayerId={p1.id}
        elapsedMs={100}
      />,
    );

    const cardP0 = screen.getByTestId('bid-reveal-card-p1');
    expect(cardP0).toHaveAttribute('data-flip-phase', 'face-down');
    expect(screen.getByTestId('sealed-bid-badge-p0')).toBeInTheDocument();
    expect(screen.queryByTestId('bid-outcome-winner-p0')).not.toBeInTheDocument();

    unmount();

    // Checkpoint 2 (700ms)
    render(
      <BidFlipCompare
        resolution={resolution}
        p1={p1}
        p2={p2}
        myPlayerId={p1.id}
        elapsedMs={700}
      />,
    );

    const cardP0Flipped = screen.getByTestId('bid-reveal-card-p1');
    expect(cardP0Flipped).toHaveAttribute('data-flip-phase', 'face-up');
    expect(screen.queryByTestId('sealed-bid-badge-p0')).not.toBeInTheDocument();
  });

  it('renders FinalRevealScreen at Step 1 and Step 5 with proper step indicators', () => {
    const match = MOCK_HARNESS_STATES.FINAL_REVEAL.match!;

    // Step 1 (300ms)
    const { unmount } = render(
      <FinalRevealScreen match={match} myPlayerId="p1" forcedElapsedMs={300} />,
    );
    const step1Indicator = screen.getByTestId('final-reveal-step');
    expect(step1Indicator).toHaveAttribute('data-step', '1');
    unmount();

    // Step 5 (3000ms)
    render(
      <FinalRevealScreen match={match} myPlayerId="p1" forcedElapsedMs={3000} />,
    );
    const step5Indicator = screen.getByTestId('final-reveal-step');
    expect(step5Indicator).toHaveAttribute('data-step', '5');
  });
});
