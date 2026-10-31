import type {
  AwardedIngredient,
  Bid,
  CollisionOutcomeType,
  Match,
  Player,
  RoundResolution,
} from '../types/models.js';
import { coinFlip } from './prng.js';

/**
 * Creates an auto-timeout bid targeting the slot's $0 basic fallback ingredient.
 */
export function createAutoTimeoutBid(match: Match, playerId: string, now = 0): Bid {
  const currentRound = match.rounds[match.roundIndex];
  if (!currentRound) {
    throw new Error(`Round ${match.roundIndex} not found in match`);
  }
  const basic = currentRound.availableIngredients.find((i) => i.isBasic);
  if (!basic) {
    throw new Error(`No basic ingredient found in slot ${currentRound.slot}`);
  }

  return {
    playerId,
    roundIndex: match.roundIndex,
    ingredientId: basic.id,
    amount: basic.basePrice,
    lockedAt: now || currentRound.deadlineAt || 0,
    isAutoTimeoutBid: true,
  };
}

export interface ResolveRoundResult {
  updatedMatch: Match;
  resolution: RoundResolution;
}

/**
 * Pure, deterministic round resolution.
 * Takes the current match state (and optional explicit bids) and produces
 * the updated match and resolution breakdown.
 */
export function resolveRound(
  match: Match,
  explicitBids?: [Bid, Bid] | Record<string, Bid>,
): ResolveRoundResult {
  if (match.players[0] === null || match.players[1] === null) {
    throw new Error('Both players must be present to resolve a round');
  }

  const p0 = match.players[0];
  const p1 = match.players[1];
  const currentRound = match.rounds[match.roundIndex];
  if (!currentRound) {
    throw new Error(`Round ${match.roundIndex} does not exist`);
  }

  // Resolve bids
  let bid0: Bid | undefined;
  let bid1: Bid | undefined;

  if (Array.isArray(explicitBids)) {
    bid0 = explicitBids.find((b) => b.playerId === p0.id);
    bid1 = explicitBids.find((b) => b.playerId === p1.id);
  } else if (explicitBids) {
    bid0 = explicitBids[p0.id];
    bid1 = explicitBids[p1.id];
  } else {
    bid0 = currentRound.privateBids[p0.id];
    bid1 = currentRound.privateBids[p1.id];
  }

  if (!bid0) {
    bid0 = createAutoTimeoutBid(match, p0.id);
  }
  if (!bid1) {
    bid1 = createAutoTimeoutBid(match, p1.id);
  }

  const target0 = currentRound.availableIngredients.find((i) => i.id === bid0.ingredientId);
  const target1 = currentRound.availableIngredients.find((i) => i.id === bid1.ingredientId);
  const basicFallback = currentRound.availableIngredients.find((i) => i.isBasic);

  if (!target0 || !target1 || !basicFallback) {
    throw new Error(`Invalid ingredients in round ${match.roundIndex}`);
  }

  const budgetsBeforeRound: Record<string, number> = {
    [p0.id]: p0.budget,
    [p1.id]: p1.budget,
  };

  const remainingStock = { ...match.remainingStock };

  // Collision detection:
  // Same variant AND non-basic AND (stock mode contest OR stock <= 1)
  const isSameTarget = target0.id === target1.id;
  const isContestCandidate = !target0.isBasic;
  const hasLimitedStock = (remainingStock[target0.id] ?? 0) <= 1;
  const isCollision =
    isSameTarget &&
    isContestCandidate &&
    (match.config.stockMode === 'ALL_COLLISIONS_CONTEST' || hasLimitedStock);

  let outcomeType: CollisionOutcomeType;
  let award0: AwardedIngredient;
  let award1: AwardedIngredient;

  if (!isCollision) {
    outcomeType = 'NO_COLLISION';

    const price0 = target0.isBasic
      ? 0
      : match.config.uncontestedPaysBasePrice
        ? target0.basePrice
        : bid0.amount;

    const price1 = target1.isBasic
      ? 0
      : match.config.uncontestedPaysBasePrice
        ? target1.basePrice
        : bid1.amount;

    award0 = {
      roundIndex: match.roundIndex,
      slot: currentRound.slot,
      ingredient: target0,
      pricePaid: price0,
      wonVia: bid0.isAutoTimeoutBid ? 'TIMEOUT_BASIC' : 'UNCONTESTED',
    };

    award1 = {
      roundIndex: match.roundIndex,
      slot: currentRound.slot,
      ingredient: target1,
      pricePaid: price1,
      wonVia: bid1.isAutoTimeoutBid ? 'TIMEOUT_BASIC' : 'UNCONTESTED',
    };

    if (!target0.isBasic && remainingStock[target0.id] !== undefined) {
      remainingStock[target0.id] = Math.max(0, (remainingStock[target0.id] ?? 0) - 1);
    }
    if (!target1.isBasic && remainingStock[target1.id] !== undefined) {
      remainingStock[target1.id] = Math.max(0, (remainingStock[target1.id] ?? 0) - 1);
    }
  } else {
    // Collision resolution
    let winner: Player;
    let winnerWonVia: AwardedIngredient['wonVia'];

    if (bid0.amount > bid1.amount) {
      winner = p0;
      outcomeType = 'COLLISION_HIGH_BID';
      winnerWonVia = 'HIGH_BID';
    } else if (bid1.amount > bid0.amount) {
      winner = p1;
      outcomeType = 'COLLISION_HIGH_BID';
      winnerWonVia = 'HIGH_BID';
    } else {
      // Tiebreak 1: Pre-round budget
      if (p0.budget > p1.budget) {
        winner = p0;
        outcomeType = 'COLLISION_TIE_BUDGET';
        winnerWonVia = 'TIEBREAK_BUDGET';
      } else if (p1.budget > p0.budget) {
        winner = p1;
        outcomeType = 'COLLISION_TIE_BUDGET';
        winnerWonVia = 'TIEBREAK_BUDGET';
      } else {
        // Tiebreak 2: Seeded coin flip
        const flip = coinFlip(match.seed, match.roundIndex);
        winner = flip === 0 ? p0 : p1;
        outcomeType = 'COLLISION_TIE_COINFLIP';
        winnerWonVia = 'TIEBREAK_COINFLIP';
      }
    }

    const winnerBid = winner.id === p0.id ? bid0 : bid1;

    const winnerAward: AwardedIngredient = {
      roundIndex: match.roundIndex,
      slot: currentRound.slot,
      ingredient: target0,
      pricePaid: winnerBid.amount,
      wonVia: winnerWonVia,
    };

    const loserAward: AwardedIngredient = {
      roundIndex: match.roundIndex,
      slot: currentRound.slot,
      ingredient: basicFallback,
      pricePaid: 0,
      wonVia: 'FALLBACK_LOSS',
    };

    if (winner.id === p0.id) {
      award0 = winnerAward;
      award1 = loserAward;
    } else {
      award0 = loserAward;
      award1 = winnerAward;
    }

    if (remainingStock[target0.id] !== undefined) {
      remainingStock[target0.id] = Math.max(0, (remainingStock[target0.id] ?? 0) - 1);
    }
  }

  // Clone players and apply awards
  const updatedP0: Player = {
    ...p0,
    budget: p0.budget - award0.pricePaid,
    dish: [...p0.dish, award0],
  };

  const updatedP1: Player = {
    ...p1,
    budget: p1.budget - award1.pricePaid,
    dish: [...p1.dish, award1],
  };

  // Chef's Tip Check:
  // Triggers after Round 3 (roundIndex === 2) when enableChefsTip is active
  let chefsTipAwardedToPlayerId: string | null = null;
  if (match.config.enableChefsTip && match.roundIndex === 2) {
    const taste0 = updatedP0.dish.reduce((sum, d) => sum + d.ingredient.tasteScore, 0);
    const taste1 = updatedP1.dish.reduce((sum, d) => sum + d.ingredient.tasteScore, 0);

    if (taste1 - taste0 >= 3 && !updatedP0.chefsTipGranted) {
      updatedP0.budget += 2;
      updatedP0.chefsTipGranted = true;
      chefsTipAwardedToPlayerId = updatedP0.id;
    } else if (taste0 - taste1 >= 3 && !updatedP1.chefsTipGranted) {
      updatedP1.budget += 2;
      updatedP1.chefsTipGranted = true;
      chefsTipAwardedToPlayerId = updatedP1.id;
    }
  }

  const budgetsAfterRound: Record<string, number> = {
    [updatedP0.id]: updatedP0.budget,
    [updatedP1.id]: updatedP1.budget,
  };

  const resolution: RoundResolution = {
    roundIndex: match.roundIndex,
    slot: currentRound.slot,
    bidsByPlayer: {
      [p0.id]: bid0,
      [p1.id]: bid1,
    },
    outcomeType,
    awardsByPlayer: {
      [p0.id]: award0,
      [p1.id]: award1,
    },
    budgetsBeforeRound,
    budgetsAfterRound,
    chefsTipAwardedToPlayerId,
  };

  const updatedRounds = match.rounds.map((round, idx) => {
    if (idx !== match.roundIndex) return round;
    return {
      ...round,
      privateBids: {
        [p0.id]: bid0,
        [p1.id]: bid1,
      },
      bidsLockedByPlayer: {
        [p0.id]: true,
        [p1.id]: true,
      },
      resolution,
    };
  });

  const updatedMatch: Match = {
    ...match,
    players: [updatedP0, updatedP1],
    rounds: updatedRounds,
    remainingStock,
  };

  return {
    updatedMatch,
    resolution,
  };
}
