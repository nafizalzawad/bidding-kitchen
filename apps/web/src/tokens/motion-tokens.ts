export const MOTION_DURATIONS_MS = {
  instant: 0,
  reducedMotionFade: 120,
  microTap: 100,
  cardSlideIn: 350,
  bidLockPulse: 250,
  bidCardFlip: 550,
  ingredientSlap: 480,
  budgetBarDrain: 450,
  scoreStepCountUp: 650,
  confettiBurst: 2200,
} as const;

export const MOTION_SPRINGS = {
  bouncyKitchen: { type: 'spring', stiffness: 380, damping: 22, mass: 0.9 },
  heavySlap: { type: 'spring', stiffness: 520, damping: 18, mass: 1.1 },
  snappyFlip: { type: 'spring', stiffness: 300, damping: 26, mass: 1.0 },
} as const;

export const MOTION_EASINGS = {
  easeOutCubic: [0.22, 1, 0.36, 1] as const,
  easeInOutBack: [0.68, -0.6, 0.32, 1.6] as const,
};

/**
 * 4000ms RESOLVE state timeline breakdown
 */
export const RESOLVE_TIMELINE_MS = {
  total: 4000,
  bidReveal: 1000,
  collisionClash: 1200,
  winnerAward: 1000,
  budgetUpdate: 800,
} as const;

/**
 * 8000ms FINAL_REVEAL state step sequence
 */
export const FINAL_REVEAL_STEPS_MS = {
  total: 8000,
  tasteCount: 2000,
  comboBurst: 2500,
  orderBonus: 1500,
  winnerCrown: 2000,
} as const;

/**
 * Helper to interpolate linear or eased count-up animations
 */
export function interpolateCountUp(current: number, target: number, progress: number): number {
  const clampedProgress = Math.max(0, Math.min(1, progress));
  return Math.round(current + (target - current) * clampedProgress);
}

export type MotionKey = keyof typeof MOTION_DURATIONS_MS;

export function getTransitionConfig(key: MotionKey, prefersReducedMotion: boolean) {
  if (prefersReducedMotion) {
    return {
      duration: 0.12,
      ease: 'linear',
      animateProperty: 'opacity',
    };
  }

  const durationMs = MOTION_DURATIONS_MS[key];

  switch (key) {
    case 'ingredientSlap':
      return {
        ...MOTION_SPRINGS.heavySlap,
        durationMs,
      };
    case 'bidCardFlip':
      return {
        ...MOTION_SPRINGS.snappyFlip,
        durationMs,
      };
    case 'cardSlideIn':
    case 'bidLockPulse':
      return {
        ...MOTION_SPRINGS.bouncyKitchen,
        durationMs,
      };
    default:
      return {
        duration: durationMs / 1000,
        ease: MOTION_EASINGS.easeOutCubic,
        durationMs,
      };
  }
}

/**
 * Timer urgency thresholds and state mapping for bidding countdown
 */
export const TIMER_URGENCY_THRESHOLDS_MS = {
  CALM: 5000,
  WARNING: 3000,
  CRITICAL: 1000,
} as const;

export type TimerUrgencyState = 'calm' | 'warning' | 'critical';

export function getTimerUrgencyState(remainingMs: number): TimerUrgencyState {
  if (remainingMs <= TIMER_URGENCY_THRESHOLDS_MS.CRITICAL) {
    return 'critical';
  }
  if (remainingMs <= TIMER_URGENCY_THRESHOLDS_MS.WARNING) {
    return 'warning';
  }
  return 'calm';
}

/**
 * Framer-motion configuration for the 30-second disconnect/reconnect countdown banner
 */
export const CONNECTION_BANNER_MOTION = {
  initial: { opacity: 0, y: -20 },
  animate: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 400, damping: 25 } },
  exit: { opacity: 0, y: -20, transition: { duration: 0.2 } },
  pulse: {
    scale: [1, 1.02, 1],
    transition: { repeat: Infinity, duration: 1.2 },
  },
  urgentShake: {
    x: [0, -3, 3, -3, 3, 0],
    transition: { repeat: Infinity, duration: 0.4 },
  },
} as const;

export interface ResolveAnimationPhase {
  cardFlipPhase: 'face-down' | 'flipping' | 'face-up';
  showOutcomeBadge: boolean;
  dishSlapPhase: 'waiting' | 'slapping' | 'landed';
  budgetDrainProgress: number;
}

/**
 * Calculates deterministic visual animation phase flags for the 4000ms RESOLVE state timeline.
 */
export function getResolveAnimationPhase(
  elapsedMs: number,
  prefersReducedMotion: boolean,
): ResolveAnimationPhase {
  if (prefersReducedMotion) {
    return {
      cardFlipPhase: 'face-up',
      showOutcomeBadge: true,
      dishSlapPhase: 'landed',
      budgetDrainProgress: 1,
    };
  }

  // Card Flip: 0..200ms face-down, 201..549ms flipping, >= 550ms face-up
  let cardFlipPhase: 'face-down' | 'flipping' | 'face-up' = 'face-down';
  if (elapsedMs >= 550) {
    cardFlipPhase = 'face-up';
  } else if (elapsedMs > 200) {
    cardFlipPhase = 'flipping';
  }

  // Outcome badges (Winner ring / Fallback boop) appear at 600ms
  const showOutcomeBadge = elapsedMs >= 600;

  // Dish Slap: waiting < 950ms, slapping 950..1430ms, landed > 1430ms
  let dishSlapPhase: 'waiting' | 'slapping' | 'landed' = 'waiting';
  if (elapsedMs > 1430) {
    dishSlapPhase = 'landed';
  } else if (elapsedMs >= 950) {
    dishSlapPhase = 'slapping';
  }

  // Budget Drain: 0 < 1100ms, progress 0..1 from 1100..1550ms, 1 > 1550ms
  let budgetDrainProgress = 0;
  if (elapsedMs >= 1550) {
    budgetDrainProgress = 1;
  } else if (elapsedMs >= 1100) {
    budgetDrainProgress = Math.max(0, Math.min(1, (elapsedMs - 1100) / 450));
  }

  return {
    cardFlipPhase,
    showOutcomeBadge,
    dishSlapPhase,
    budgetDrainProgress,
  };
}

/**
 * Calculates current active step (1 to 5) for the Final Reveal scoreboard tally.
 */
export function getFinalRevealStep(
  elapsedMs: number,
  prefersReducedMotion: boolean,
): 1 | 2 | 3 | 4 | 5 {
  if (prefersReducedMotion) {
    return 5;
  }
  if (elapsedMs < 650) return 1;
  if (elapsedMs < 1300) return 2;
  if (elapsedMs < 1950) return 3;
  if (elapsedMs < 2600) return 4;
  return 5;
}
