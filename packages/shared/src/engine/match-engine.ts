import { STREET_INGREDIENTS, getIngredientsBySlot } from '../data/ingredients-street.js';
import { TIERS } from '../data/tiers.js';
import type {
  Bid,
  BotDifficulty,
  Match,
  MatchConfig,
  MatchState,
  Player,
  Round,
  TierId,
} from '../types/models.js';
import {
  canTransition,
  DEFAULT_MVP_MATCH_CONFIG,
  getStateTimeout,
} from '../types/state-machine.js';
import { createAutoTimeoutBid } from './bid-resolver.js';
import { pickDeterministicCustomerOrders } from './prng.js';
import { calculateMatchResult, calculatePlayerScore } from './scorer.js';
import { validateBid, type BidValidationResult } from './validators.js';

export interface CreateMatchOptions {
  id?: string;
  roomCode?: string;
  tier?: TierId;
  config?: Partial<MatchConfig>;
  seed?: number;
  now?: number;
}

/**
 * Creates a brand-new Match instance with initial state, empty rounds, and stock table.
 */
export function createMatch(options: CreateMatchOptions = {}): Match {
  const id = options.id ?? `match_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
  const roomCode = options.roomCode ?? 'BKIT';
  const tier: TierId = options.tier ?? (options.config as { tier?: TierId } | undefined)?.tier ?? 'STREET';
  const seed = options.seed ?? 2026;
  const now = options.now ?? 0;
  const tierDef = TIERS[tier];
  const config: MatchConfig = { ...DEFAULT_MVP_MATCH_CONFIG, ...options.config };

  // Initialize remaining stock from ingredients in this tier
  const remainingStock: Record<string, number> = {};
  for (const slot of tierDef.slots) {
    for (const ing of getIngredientsBySlot(tier, slot)) {
      remainingStock[ing.id] = ing.stock;
    }
  }

  // Initialize empty rounds based on tier slots
  const rounds: Round[] = tierDef.slots.map((slot, idx) => {
    const availableIngredients = getIngredientsBySlot(tier, slot);
    return {
      roundIndex: idx,
      slot,
      availableIngredients,
      bidsLockedByPlayer: {},
      privateBids: {},
      resolution: null,
      startedAt: 0,
      deadlineAt: 0,
    };
  });

  return {
    id,
    roomCode,
    seed,
    tier,
    state: 'LOBBY',
    config,
    roundIndex: 0,
    players: [null, null],
    rounds,
    remainingStock,
    result: null,
    stateEnteredAt: now,
    stateDeadlineAt: now + getStateTimeout('LOBBY'),
    createdAt: now,
  };
}

/**
 * Seats a player into the match.
 */
export function addPlayerToMatch(
  match: Match,
  playerInfo: {
    id: string;
    nickname: string;
    reconnectToken?: string;
    isBot?: boolean;
    botDifficulty?: BotDifficulty;
    ready?: boolean;
  },
): Match {
  let seat: 0 | 1;
  if (match.players[0] === null) {
    seat = 0;
  } else if (match.players[1] === null) {
    seat = 1;
  } else {
    throw new Error('Room is full');
  }

  const orders = match.config.enableCustomerOrders
    ? pickDeterministicCustomerOrders(match.seed, 2)
    : [];

  const secretOrder = match.config.enableCustomerOrders ? orders[seat] ?? null : null;

  const player: Player = {
    id: playerInfo.id,
    reconnectToken: playerInfo.reconnectToken ?? `tok_${playerInfo.id}`,
    nickname: playerInfo.nickname,
    seat,
    ready: playerInfo.ready ?? false,
    connected: true,
    disconnectedAt: null,
    budget: TIERS[match.tier].startingBudget,
    dish: [],
    secretOrder,
    chefsTipGranted: false,
    isBot: playerInfo.isBot ?? false,
    botDifficulty: playerInfo.botDifficulty,
  };

  const updatedPlayers: [Player | null, Player | null] = [...match.players];
  updatedPlayers[seat] = player;

  return {
    ...match,
    players: updatedPlayers,
  };
}

/**
 * Transitions match state if the transition is allowed by the state machine.
 */
export function transitionState(match: Match, nextState: MatchState, now = 0): Match {
  if (!canTransition(match.state, nextState)) {
    throw new Error(`Invalid state transition from ${match.state} to ${nextState}`);
  }

  const timeout = getStateTimeout(nextState);

  return {
    ...match,
    state: nextState,
    stateEnteredAt: now,
    stateDeadlineAt: now + timeout,
  };
}

/**
 * Sets a player's ready flag. When both seated players are ready, automatically transitions to TIER_CONFIRMED.
 */
export function setPlayerReady(match: Match, playerId: string, now = 0): Match {
  const updatedPlayers: [Player | null, Player | null] = [
    match.players[0] && match.players[0].id === playerId
      ? { ...match.players[0], ready: true }
      : match.players[0],
    match.players[1] && match.players[1].id === playerId
      ? { ...match.players[1], ready: true }
      : match.players[1],
  ];

  let nextMatch: Match = {
    ...match,
    players: updatedPlayers,
  };

  const bothReady =
    updatedPlayers[0] !== null &&
    updatedPlayers[1] !== null &&
    updatedPlayers[0].ready &&
    updatedPlayers[1].ready;

  if (bothReady && match.state === 'LOBBY') {
    nextMatch = transitionState(nextMatch, 'TIER_CONFIRMED', now);
  }

  return nextMatch;
}

/**
 * Starts a specific round, setting match state to BIDDING and starting deadlines.
 */
export function startRound(match: Match, roundIndex: number, now = 0): Match {
  if (roundIndex < 0 || roundIndex >= match.rounds.length) {
    throw new Error(`Invalid round index ${roundIndex}`);
  }

  const duration = match.config.biddingDurationMs;
  const updatedRounds = match.rounds.map((r, idx) => {
    if (idx !== roundIndex) return r;
    return {
      ...r,
      startedAt: now,
      deadlineAt: now + duration,
      bidsLockedByPlayer: {},
      privateBids: {},
    };
  });

  return {
    ...match,
    roundIndex,
    state: 'BIDDING',
    stateEnteredAt: now,
    stateDeadlineAt: now + duration,
    rounds: updatedRounds,
  };
}

export interface SubmitBidResult {
  match: Match;
  validation: BidValidationResult;
  bothLocked: boolean;
}

/**
 * Submits and locks a bid for a player.
 */
export function submitBid(
  match: Match,
  playerId: string,
  bidData: {
    roundIndex: number;
    ingredientId: string;
    amount: number;
    lockedAt?: number;
    isAutoTimeoutBid?: boolean;
  },
  now = 0,
): SubmitBidResult {
  const fullBid: Bid = {
    playerId,
    roundIndex: bidData.roundIndex,
    ingredientId: bidData.ingredientId,
    amount: bidData.amount,
    lockedAt: bidData.lockedAt ?? now,
    isAutoTimeoutBid: bidData.isAutoTimeoutBid ?? false,
  };

  const validation = validateBid(match, playerId, fullBid);
  if (!validation.valid) {
    return {
      match,
      validation,
      bothLocked: false,
    };
  }

  const currentRound = match.rounds[match.roundIndex]!;
  const updatedLocked = {
    ...currentRound.bidsLockedByPlayer,
    [playerId]: true,
  };
  const updatedPrivateBids = {
    ...currentRound.privateBids,
    [playerId]: fullBid,
  };

  const updatedRounds = match.rounds.map((r, idx) => {
    if (idx !== match.roundIndex) return r;
    return {
      ...r,
      bidsLockedByPlayer: updatedLocked,
      privateBids: updatedPrivateBids,
    };
  });

  const p0 = match.players[0];
  const p1 = match.players[1];
  const bothLocked =
    p0 !== null &&
    p1 !== null &&
    updatedLocked[p0.id] === true &&
    updatedLocked[p1.id] === true;

  let nextMatch: Match = {
    ...match,
    rounds: updatedRounds,
  };

  if (bothLocked && match.state === 'BIDDING') {
    nextMatch = transitionState(nextMatch, 'LOCKED', now);
  }

  return {
    match: nextMatch,
    validation: { valid: true },
    bothLocked,
  };
}

/**
 * Automatically locks basic $0 bids for any player who failed to submit before deadline.
 */
export function autoLockExpiredBids(match: Match, now = 0): Match {
  let currentMatch = match;
  const currentRound = currentMatch.rounds[currentMatch.roundIndex];
  if (!currentRound) return currentMatch;

  for (const player of currentMatch.players) {
    if (player && !currentRound.bidsLockedByPlayer[player.id]) {
      const autoBid = createAutoTimeoutBid(currentMatch, player.id, now);
      const res = submitBid(currentMatch, player.id, autoBid, now);
      if (res.validation.valid) {
        currentMatch = res.match;
      }
    }
  }

  return currentMatch;
}

/**
 * Finalizes the match after all rounds complete, computing scores and match result.
 */
export function finalizeMatch(match: Match): Match {
  if (!match.players[0] || !match.players[1]) {
    throw new Error('Cannot finalize match without both players');
  }

  const p0Score = calculatePlayerScore(match.players[0]);
  const p1Score = calculatePlayerScore(match.players[1]);
  const result = calculateMatchResult(match, p0Score, p1Score, match.seed);

  return {
    ...match,
    result,
  };
}

/**
 * Handles a player forfeit, awarding victory to the remaining player.
 */
export function forfeitMatch(match: Match, forfeitingPlayerId: string, now = 0): Match {
  const winner = match.players.find((p) => p && p.id !== forfeitingPlayerId);
  const forfeiter = match.players.find((p) => p && p.id === forfeitingPlayerId);

  const scoresByPlayer: Match['result'] extends null ? never : NonNullable<Match['result']>['scoresByPlayer'] = {};
  if (match.players[0]) {
    scoresByPlayer[match.players[0].id] = calculatePlayerScore(match.players[0]);
  }
  if (match.players[1]) {
    scoresByPlayer[match.players[1].id] = calculatePlayerScore(match.players[1]);
  }

  const roundHistory = match.rounds
    .map((r) => r.resolution)
    .filter((res): res is NonNullable<typeof res> => res !== null);

  const result: NonNullable<Match['result']> = {
    winnerId: winner ? winner.id : null,
    winReason: 'FORFEIT',
    forfeitedByPlayerId: forfeitingPlayerId,
    winnerTitle: 'Default Winner',
    scoresByPlayer,
    roundHistory,
    keyMomentText: `${forfeiter?.nickname ?? 'Player'} surrendered. ${winner?.nickname ?? 'Opponent'} is declared the winner.`,
  };

  return {
    ...match,
    state: 'POST_MATCH',
    stateEnteredAt: now,
    stateDeadlineAt: now + getStateTimeout('POST_MATCH'),
    result,
  };
}

/**
 * Resets match state for a post-match rematch:
 * Swaps player seats (0 <-> 1), resets budgets and dishes, assigns fresh secret orders,
 * re-initializes stock and rounds, and transitions state to TIER_CONFIRMED (or LOBBY if new tier).
 */
export function resetMatchForRematch(
  match: Match,
  newSeed: number,
  now: number,
  newTier?: TierId,
): Match {
  if (!match.players[0] || !match.players[1]) {
    throw new Error('Both players must be present for a rematch');
  }

  const p0 = match.players[0];
  const p1 = match.players[1];
  const tier = newTier ?? match.tier;
  const tierDef = TIERS[tier];

  const orders = match.config.enableCustomerOrders
    ? pickDeterministicCustomerOrders(newSeed, 2)
    : [];

  // Swap seats: p1 becomes seat 0, p0 becomes seat 1
  const swappedP0: Player = {
    ...p1,
    seat: 0,
    ready: false,
    budget: tierDef.startingBudget,
    dish: [],
    secretOrder: match.config.enableCustomerOrders ? orders[0] ?? null : null,
    chefsTipGranted: false,
  };

  const swappedP1: Player = {
    ...p0,
    seat: 1,
    ready: false,
    budget: tierDef.startingBudget,
    dish: [],
    secretOrder: match.config.enableCustomerOrders ? orders[1] ?? null : null,
    chefsTipGranted: false,
  };

  // Reset stock
  const remainingStock: Record<string, number> = {};
  for (const ing of STREET_INGREDIENTS) {
    if (ing.tier === tier) {
      remainingStock[ing.id] = ing.stock;
    }
  }

  // Reset rounds
  const rounds: Round[] = tierDef.slots.map((slot, idx) => ({
    roundIndex: idx,
    slot,
    availableIngredients: STREET_INGREDIENTS.filter(
      (ing) => ing.tier === tier && ing.slot === slot,
    ),
    bidsLockedByPlayer: {},
    privateBids: {},
    resolution: null,
    startedAt: 0,
    deadlineAt: 0,
  }));

  const nextState: MatchState = newTier && newTier !== match.tier ? 'LOBBY' : 'TIER_CONFIRMED';

  return {
    ...match,
    seed: newSeed,
    tier,
    state: nextState,
    roundIndex: 0,
    players: [swappedP0, swappedP1],
    rounds,
    remainingStock,
    result: null,
    stateEnteredAt: now,
    stateDeadlineAt: now + getStateTimeout(nextState),
  };
}

/**
 * Resets match state when a player leaves the room during LOBBY or TIER_CONFIRMED:
 * Removes leaving player, places remaining player into seat 0 with ready = false,
 * and resets match state to LOBBY.
 */
export function resetMatchOnLobbyLeave(
  match: Match,
  leavingPlayerId: string,
  now: number,
): Match {
  const remaining = match.players.find((p) => p && p.id !== leavingPlayerId);

  const updatedPlayers: [Player | null, Player | null] = remaining
    ? [{ ...remaining, seat: 0, ready: false }, null]
    : [null, null];

  return {
    ...match,
    state: 'LOBBY',
    roundIndex: 0,
    players: updatedPlayers,
    stateEnteredAt: now,
    stateDeadlineAt: now + getStateTimeout('LOBBY'),
  };
}
