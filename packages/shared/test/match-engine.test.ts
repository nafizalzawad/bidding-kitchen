import { describe, expect, it } from 'vitest';
import { resolveRound } from '../src/engine/bid-resolver.js';
import {
  addPlayerToMatch,
  autoLockExpiredBids,
  createMatch,
  finalizeMatch,
  forfeitMatch,
  setPlayerReady,
  startRound,
  submitBid,
  transitionState,
} from '../src/engine/match-engine.js';
import { validateBid } from '../src/engine/validators.js';
import type { Bid } from '../src/types/models.js';

describe('Match Engine Lifecycle & State Machine', () => {
  it('Transitions cleanly through the complete 5-round lifecycle to POST_MATCH', () => {
    let match = createMatch({ seed: 2026 });
    expect(match.state).toBe('LOBBY');

    match = addPlayerToMatch(match, { id: 'p0', nickname: 'Alice' });
    match = addPlayerToMatch(match, { id: 'p1', nickname: 'Bob' });

    // Readying transitions to TIER_CONFIRMED
    match = setPlayerReady(match, 'p0');
    expect(match.state).toBe('LOBBY');
    match = setPlayerReady(match, 'p1');
    expect(match.state).toBe('TIER_CONFIRMED');

    match = transitionState(match, 'MATCH_INTRO');
    expect(match.state).toBe('MATCH_INTRO');

    // 5 rounds
    for (let r = 0; r < 5; r++) {
      match = transitionState(match, 'ROUND_REVEAL');
      match = startRound(match, r);
      expect(match.state).toBe('BIDDING');

      const slot = match.rounds[r]!.slot;
      const ing = match.rounds[r]!.availableIngredients[0]!;

      const res0 = submitBid(match, 'p0', {
        roundIndex: r,
        ingredientId: ing.id,
        amount: ing.basePrice,
      });
      expect(res0.validation.valid).toBe(true);
      expect(res0.bothLocked).toBe(false);
      match = res0.match;

      const res1 = submitBid(match, 'p1', {
        roundIndex: r,
        ingredientId: ing.id,
        amount: ing.basePrice,
      });
      expect(res1.validation.valid).toBe(true);
      expect(res1.bothLocked).toBe(true);
      match = res1.match;
      expect(match.state).toBe('LOCKED');

      match = transitionState(match, 'RESOLVE');
      const resolveRes = resolveRound(match);
      match = resolveRes.updatedMatch;
      expect(resolveRes.resolution.slot).toBe(slot);

      match = transitionState(match, 'ROUND_END');
    }

    match = transitionState(match, 'FINAL_REVEAL');
    match = finalizeMatch(match);
    expect(match.result).not.toBeNull();
    expect(match.result?.scoresByPlayer.p0).toBeDefined();
    expect(match.result?.scoresByPlayer.p1).toBeDefined();

    match = transitionState(match, 'POST_MATCH');
    expect(match.state).toBe('POST_MATCH');
  });

  it('Enforces all 8 bid validation checks', () => {
    let match = createMatch({ seed: 2026 });
    match = addPlayerToMatch(match, { id: 'p0', nickname: 'Alice' });
    match = addPlayerToMatch(match, { id: 'p1', nickname: 'Bob' });

    const validBid: Bid = {
      playerId: 'p0',
      roundIndex: 0,
      ingredientId: 'street_bun_brioche',
      amount: 4,
      lockedAt: 0,
      isAutoTimeoutBid: false,
    };

    // 1. INVALID_STATE_ACTION: match is in LOBBY, not BIDDING
    expect(validateBid(match, 'p0', validBid)).toEqual({
      valid: false,
      error: 'INVALID_STATE_ACTION',
      message: expect.stringContaining('BIDDING'),
    });

    match = startRound(match, 0);

    // 2. INVALID_ROUND_INDEX: bid roundIndex != match roundIndex
    expect(validateBid(match, 'p0', { ...validBid, roundIndex: 1 })).toEqual({
      valid: false,
      error: 'INVALID_ROUND_INDEX',
      message: expect.stringContaining('does not match'),
    });

    // 3. UNAUTHORIZED_RECONNECT: unknown player
    expect(validateBid(match, 'unknown_player', { ...validBid, playerId: 'unknown_player' })).toEqual({
      valid: false,
      error: 'UNAUTHORIZED_RECONNECT',
      message: expect.stringContaining('not a valid seated player'),
    });

    // 4. BID_NOT_INTEGER: non-integer or negative bid amount
    expect(validateBid(match, 'p0', { ...validBid, amount: 4.5 })).toEqual({
      valid: false,
      error: 'BID_NOT_INTEGER',
      message: expect.stringContaining('non-negative integer'),
    });
    expect(validateBid(match, 'p0', { ...validBid, amount: -1 })).toEqual({
      valid: false,
      error: 'BID_NOT_INTEGER',
      message: expect.stringContaining('non-negative integer'),
    });

    // 5. INVALID_INGREDIENT: ingredient not available for this round
    expect(validateBid(match, 'p0', { ...validBid, ingredientId: 'street_patty_wagyu' })).toEqual({
      valid: false,
      error: 'INVALID_INGREDIENT',
      message: expect.stringContaining('not available'),
    });

    // 6. BID_BELOW_BASE_PRICE: bid amount < basePrice
    expect(validateBid(match, 'p0', { ...validBid, amount: 2 })).toEqual({
      valid: false,
      error: 'BID_BELOW_BASE_PRICE',
      message: expect.stringContaining('below base price'),
    });

    // 7. BID_EXCEEDS_BUDGET: bid amount > player budget
    match.players[0]!.budget = 3;
    expect(validateBid(match, 'p0', { ...validBid, amount: 4 })).toEqual({
      valid: false,
      error: 'BID_EXCEEDS_BUDGET',
      message: expect.stringContaining('exceeds player budget'),
    });

    // Reset budget to 20
    match.players[0]!.budget = 20;

    // Valid bid succeeds
    const submitRes = submitBid(match, 'p0', validBid);
    expect(submitRes.validation.valid).toBe(true);
    match = submitRes.match;

    // 8. BID_ALREADY_LOCKED: player has already locked a bid
    expect(validateBid(match, 'p0', validBid)).toEqual({
      valid: false,
      error: 'BID_ALREADY_LOCKED',
      message: expect.stringContaining('already locked'),
    });
  });

  it('Auto-locks expired bids with $0 basic fallback for unlocked players', () => {
    let match = createMatch({ seed: 2026 });
    match = addPlayerToMatch(match, { id: 'p0', nickname: 'Alice' });
    match = addPlayerToMatch(match, { id: 'p1', nickname: 'Bob' });
    match = startRound(match, 0);

    // p0 bids on Brioche
    match = submitBid(match, 'p0', {
      roundIndex: 0,
      ingredientId: 'street_bun_brioche',
      amount: 4,
    }).match;

    // p1 does not bid; timer expires -> autoLockExpiredBids
    match = autoLockExpiredBids(match, 15000);
    const round = match.rounds[0]!;

    expect(round.bidsLockedByPlayer.p0).toBe(true);
    expect(round.bidsLockedByPlayer.p1).toBe(true);
    expect(round.privateBids.p1?.ingredientId).toBe('street_bun_plain');
    expect(round.privateBids.p1?.amount).toBe(0);
    expect(round.privateBids.p1?.isAutoTimeoutBid).toBe(true);
    expect(match.state).toBe('LOCKED');
  });

  it('Cleanly terminates match on forfeit and declares remaining player winner', () => {
    let match = createMatch({ seed: 2026 });
    match = addPlayerToMatch(match, { id: 'p0', nickname: 'Alice' });
    match = addPlayerToMatch(match, { id: 'p1', nickname: 'Bob' });
    match = startRound(match, 0);

    match = forfeitMatch(match, 'p0', 5000);

    expect(match.state).toBe('POST_MATCH');
    expect(match.result?.winnerId).toBe('p1');
    expect(match.result?.winReason).toBe('FORFEIT');
    expect(match.result?.forfeitedByPlayerId).toBe('p0');
  });
});
