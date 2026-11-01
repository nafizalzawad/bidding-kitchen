import type { MatchConfig, MatchState } from './models.js';

export const STATE_TIMEOUTS_MS: Record<MatchState, number> = {
  LOBBY: 600000,
  TIER_CONFIRMED: 3000,
  MATCH_INTRO: 5000,
  ROUND_REVEAL: 2000,
  BIDDING: 15000,
  LOCKED: 500,
  RESOLVE: 4000,
  ROUND_END: 3000,
  FINAL_REVEAL: 8000,
  POST_MATCH: 300000,
} as const;

export const TUTORIAL_MATCH_INTRO_TIMEOUT_MS = 22000;
export const RECONNECT_WINDOW_MS = 30000;

export const ALLOWED_STATE_TRANSITIONS: Record<MatchState, readonly MatchState[]> = {
  LOBBY: ['TIER_CONFIRMED'],
  TIER_CONFIRMED: ['MATCH_INTRO', 'LOBBY'],
  MATCH_INTRO: ['ROUND_REVEAL', 'POST_MATCH'],
  ROUND_REVEAL: ['BIDDING', 'POST_MATCH'],
  BIDDING: ['LOCKED', 'POST_MATCH'],
  LOCKED: ['RESOLVE', 'POST_MATCH'],
  RESOLVE: ['ROUND_END', 'POST_MATCH'],
  ROUND_END: ['ROUND_REVEAL', 'FINAL_REVEAL', 'POST_MATCH'],
  FINAL_REVEAL: ['POST_MATCH'],
  POST_MATCH: ['TIER_CONFIRMED', 'LOBBY'],
} as const;

export const STATE_TRANSITIONS = ALLOWED_STATE_TRANSITIONS;

export function canTransition(from: MatchState, to: MatchState): boolean {
  const allowed = ALLOWED_STATE_TRANSITIONS[from];
  return allowed ? allowed.includes(to) : false;
}

export const isValidTransition = canTransition;

export function getStateTimeout(state: MatchState): number {
  return STATE_TIMEOUTS_MS[state];
}

export const DEFAULT_MVP_MATCH_CONFIG: MatchConfig = {
  stockMode: 'ALL_COLLISIONS_CONTEST',
  uncontestedPaysBasePrice: true,
  enableCustomerOrders: false,
  enableChefsTip: false,
  showOpponentBudget: true,
  biddingDurationMs: 15000,
  reconnectWindowMs: 30000,
};

export const DEFAULT_V15_MATCH_CONFIG: MatchConfig = {
  stockMode: 'ALL_COLLISIONS_CONTEST',
  uncontestedPaysBasePrice: true,
  enableCustomerOrders: true,
  enableChefsTip: true,
  showOpponentBudget: true,
  biddingDurationMs: 15000,
  reconnectWindowMs: 30000,
};
