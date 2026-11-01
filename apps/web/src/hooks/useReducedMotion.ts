import { useState, useEffect } from 'react';

/**
 * Hook to detect whether reduced motion is requested.
 * Checks system preferences (prefers-reduced-motion: reduce)
 * and URL parameter (?reducedMotion=true) for deterministic testing and visual QA.
 */
export function useReducedMotion(): boolean {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;

    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('reducedMotion') === 'true' || urlParams.get('reducedMotion') === '1') {
      return true;
    }

    const mediaQuery = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    return mediaQuery ? mediaQuery.matches : false;
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('reducedMotion') === 'true' || urlParams.get('reducedMotion') === '1') {
      setPrefersReducedMotion(true);
      return;
    }

    const mediaQuery = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    if (!mediaQuery) return;

    const handleChange = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  return prefersReducedMotion;
}
