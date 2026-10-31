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
