import type { ErrorCode } from '../types/errors.js';
import type { Bid, Match } from '../types/models.js';

export interface BidValidationResult {
  valid: boolean;
  error?: ErrorCode;
  message?: string;
}

/**
 * Validates a submitted bid against the match state and player budget.
 * Pure function: returns { valid: true } or { valid: false, error, message }.
 */
export function validateBid(match: Match, playerId: string, bid: Bid): BidValidationResult {
  if (match.state !== 'BIDDING') {
    return {
      valid: false,
      error: 'INVALID_STATE_ACTION',
      message: `Match is in state ${match.state}, bids are only accepted in BIDDING`,
    };
  }

  if (bid.roundIndex !== match.roundIndex) {
    return {
      valid: false,
      error: 'INVALID_ROUND_INDEX',
      message: `Bid round index ${bid.roundIndex} does not match match round index ${match.roundIndex}`,
    };
  }

  const player = match.players.find((p) => p?.id === playerId);
  if (!player || player.id !== bid.playerId) {
    return {
      valid: false,
      error: 'UNAUTHORIZED_RECONNECT',
      message: `Player ${playerId} is not a valid seated player for this bid`,
    };
  }

  const currentRound = match.rounds[match.roundIndex];
  if (!currentRound) {
    return {
      valid: false,
      error: 'INVALID_ROUND_INDEX',
      message: `Round ${match.roundIndex} does not exist in match`,
    };
  }

  if (currentRound.bidsLockedByPlayer[playerId]) {
    return {
      valid: false,
      error: 'BID_ALREADY_LOCKED',
      message: `Player ${playerId} has already locked a bid for round ${match.roundIndex}`,
    };
  }

  if (!Number.isInteger(bid.amount) || bid.amount < 0) {
    return {
      valid: false,
      error: 'BID_NOT_INTEGER',
      message: `Bid amount must be a non-negative integer, received ${bid.amount}`,
    };
  }

  const ingredient = currentRound.availableIngredients.find((i) => i.id === bid.ingredientId);
  if (!ingredient || ingredient.slot !== currentRound.slot) {
    return {
      valid: false,
      error: 'INVALID_INGREDIENT',
      message: `Ingredient ${bid.ingredientId} is not available in slot ${currentRound.slot}`,
    };
  }

  if (bid.amount < ingredient.basePrice) {
    return {
      valid: false,
      error: 'BID_BELOW_BASE_PRICE',
      message: `Bid amount $${bid.amount} is below base price $${ingredient.basePrice}`,
    };
  }

  if (bid.amount > player.budget) {
    return {
      valid: false,
      error: 'BID_EXCEEDS_BUDGET',
      message: `Bid amount $${bid.amount} exceeds player budget $${player.budget}`,
    };
  }

  return { valid: true };
}
