import { useCallback } from 'react';
import { useReducedMotion } from './useReducedMotion';

export type HapticPattern = 'light' | 'medium' | 'heavy' | 'success';

const HAPTIC_PATTERNS: Record<HapticPattern, number | number[]> = {
  light: 10,
  medium: 25,
  heavy: [40, 60, 40],
  success: [30, 50, 60],
};

export function useHaptics() {
  const prefersReducedMotion = useReducedMotion();

  const triggerHaptic = useCallback(
    (pattern: HapticPattern) => {
      if (prefersReducedMotion) return;
      if (typeof window === 'undefined' || typeof navigator === 'undefined') return;
      if (typeof navigator.vibrate !== 'function') return;

      try {
        navigator.vibrate(HAPTIC_PATTERNS[pattern]);
      } catch {
        // Suppress errors on unsupported platforms
      }
    },
    [prefersReducedMotion]
  );

  return { triggerHaptic };
}
