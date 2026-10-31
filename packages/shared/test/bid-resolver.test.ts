import { describe, expect, it } from 'vitest';
import {
  createAutoTimeoutBid,
  resolveRound,
} from '../src/engine/bid-resolver.js';
import { addPlayerToMatch, createMatch, startRound } from '../src/engine/match-engine.js';
import type { Bid, Match } from '../src/types/models.js';

function setupMatch(options?: { seed?: number; enableChefsTip?: boolean }): Match {
  let match = createMatch({
    seed: options?.seed ?? 2026,
    config: { enableChefsTip: options?.enableChefsTip ?? false },
  });
  match = addPlayerToMatch(match, { id: 'p0', nickname: 'Alice' });
  match = addPlayerToMatch(match, { id: 'p1', nickname: 'Bob' });
  return match;
}

describe('Bid Resolver & Collision Engine', () => {
  it('Worked Example 1: No collision, uncontested pays base price', () => {
    let match = setupMatch();
    match = startRound(match, 0); // Slot: BUN

    const bid0: Bid = {
      playerId: 'p0',
      roundIndex: 0,
      ingredientId: 'street_bun_brioche',
      amount: 4,
      lockedAt: 100,
      isAutoTimeoutBid: false,
    };
    const bid1: Bid = {
      playerId: 'p1',
      roundIndex: 0,
      ingredientId: 'street_bun_sesame',
      amount: 3, // Bids $3, but base price is $2
      lockedAt: 100,
      isAutoTimeoutBid: false,
    };

    const { updatedMatch, resolution } = resolveRound(match, [bid0, bid1]);

    expect(resolution.outcomeType).toBe('NO_COLLISION');

    // Player 0 receives Brioche, pays $4 (base price is 4)
    const award0 = resolution.awardsByPlayer.p0;
    expect(award0?.ingredient.id).toBe('street_bun_brioche');
    expect(award0?.pricePaid).toBe(4);
    expect(award0?.wonVia).toBe('UNCONTESTED');

    // Player 1 receives Sesame, pays base price $2 (uncontestedPaysBasePrice = true)
    const award1 = resolution.awardsByPlayer.p1;
    expect(award1?.ingredient.id).toBe('street_bun_sesame');
    expect(award1?.pricePaid).toBe(2);
    expect(award1?.wonVia).toBe('UNCONTESTED');

    // Budgets correctly updated
    expect(updatedMatch.players[0]?.budget).toBe(16); // 20 - 4
    expect(updatedMatch.players[1]?.budget).toBe(18); // 20 - 2
  });

  it('Worked Example 2: Collision High Bid on Wagyu ($8)', () => {
    let match = setupMatch();
    match = startRound(match, 1); // Slot: PATTY

    const bid0: Bid = {
      playerId: 'p0',
      roundIndex: 1,
      ingredientId: 'street_patty_wagyu',
      amount: 9,
      lockedAt: 100,
      isAutoTimeoutBid: false,
    };
    const bid1: Bid = {
      playerId: 'p1',
      roundIndex: 1,
      ingredientId: 'street_patty_wagyu',
      amount: 8,
      lockedAt: 100,
      isAutoTimeoutBid: false,
    };

    const { updatedMatch, resolution } = resolveRound(match, [bid0, bid1]);

    expect(resolution.outcomeType).toBe('COLLISION_HIGH_BID');

    // Player 0 wins Wagyu for $9
    const award0 = resolution.awardsByPlayer.p0;
    expect(award0?.ingredient.id).toBe('street_patty_wagyu');
    expect(award0?.pricePaid).toBe(9);
    expect(award0?.wonVia).toBe('HIGH_BID');

    // Player 1 loses collision, gets Basic Beef fallback for $0, keeps full budget
    const award1 = resolution.awardsByPlayer.p1;
    expect(award1?.ingredient.id).toBe('street_patty_basic');
    expect(award1?.pricePaid).toBe(0);
    expect(award1?.wonVia).toBe('FALLBACK_LOSS');

    expect(updatedMatch.players[0]?.budget).toBe(11); // 20 - 9
    expect(updatedMatch.players[1]?.budget).toBe(20); // 20 - 0 (kept full budget)
  });

  it('Worked Example 3: Collision Tiebreak Budget on Truffle Aioli ($3)', () => {
    let match = setupMatch();
    // Simulate asymmetric budgets before round
    match.players[0]!.budget = 7;
    match.players[1]!.budget = 18;
    match = startRound(match, 2); // Slot: SAUCE

    const bid0: Bid = {
      playerId: 'p0',
      roundIndex: 2,
      ingredientId: 'street_sauce_truffle',
      amount: 3,
      lockedAt: 100,
      isAutoTimeoutBid: false,
    };
    const bid1: Bid = {
      playerId: 'p1',
      roundIndex: 2,
      ingredientId: 'street_sauce_truffle',
      amount: 3,
      lockedAt: 100,
      isAutoTimeoutBid: false,
    };

    const { updatedMatch, resolution } = resolveRound(match, [bid0, bid1]);

    expect(resolution.outcomeType).toBe('COLLISION_TIE_BUDGET');

    // Player 1 has higher pre-round budget ($18 vs $7) -> wins Truffle
    const award1 = resolution.awardsByPlayer.p1;
    expect(award1?.ingredient.id).toBe('street_sauce_truffle');
    expect(award1?.pricePaid).toBe(3);
    expect(award1?.wonVia).toBe('TIEBREAK_BUDGET');

    // Player 0 receives basic fallback sauce for $0
    const award0 = resolution.awardsByPlayer.p0;
    expect(award0?.ingredient.id).toBe('street_sauce_none');
    expect(award0?.pricePaid).toBe(0);
    expect(award0?.wonVia).toBe('FALLBACK_LOSS');

    expect(updatedMatch.players[0]?.budget).toBe(7);
    expect(updatedMatch.players[1]?.budget).toBe(15);
  });

  it('Collision Tiebreak Coinflip on equal bids and equal budgets', () => {
    let match = setupMatch({ seed: 2026 });
    match.players[0]!.budget = 15;
    match.players[1]!.budget = 15;
    match = startRound(match, 2); // Slot: SAUCE

    const bid0: Bid = {
      playerId: 'p0',
      roundIndex: 2,
      ingredientId: 'street_sauce_truffle',
      amount: 3,
      lockedAt: 100,
      isAutoTimeoutBid: false,
    };
    const bid1: Bid = {
      playerId: 'p1',
      roundIndex: 2,
      ingredientId: 'street_sauce_truffle',
      amount: 3,
      lockedAt: 100,
      isAutoTimeoutBid: false,
    };

    const { resolution } = resolveRound(match, [bid0, bid1]);

    expect(resolution.outcomeType).toBe('COLLISION_TIE_COINFLIP');
    const award0 = resolution.awardsByPlayer.p0!;
    const award1 = resolution.awardsByPlayer.p1!;

    const oneWon =
      (award0.wonVia === 'TIEBREAK_COINFLIP' && award1.wonVia === 'FALLBACK_LOSS') ||
      (award1.wonVia === 'TIEBREAK_COINFLIP' && award0.wonVia === 'FALLBACK_LOSS');
    expect(oneWon).toBe(true);
  });

  it('Basic-on-Basic has unlimited stock and is NEVER a collision', () => {
    let match = setupMatch();
    match = startRound(match, 0); // Slot: BUN

    const bid0: Bid = {
      playerId: 'p0',
      roundIndex: 0,
      ingredientId: 'street_bun_plain',
      amount: 0,
      lockedAt: 100,
      isAutoTimeoutBid: false,
    };
    const bid1: Bid = {
      playerId: 'p1',
      roundIndex: 0,
      ingredientId: 'street_bun_plain',
      amount: 0,
      lockedAt: 100,
      isAutoTimeoutBid: false,
    };

    const { resolution } = resolveRound(match, [bid0, bid1]);

    expect(resolution.outcomeType).toBe('NO_COLLISION');
    expect(resolution.awardsByPlayer.p0?.ingredient.id).toBe('street_bun_plain');
    expect(resolution.awardsByPlayer.p0?.pricePaid).toBe(0);
    expect(resolution.awardsByPlayer.p1?.ingredient.id).toBe('street_bun_plain');
    expect(resolution.awardsByPlayer.p1?.pricePaid).toBe(0);
  });

  it('Auto-timeout bid generates $0 basic fallback with TIMEOUT_BASIC', () => {
    let match = setupMatch();
    match = startRound(match, 0); // Slot: BUN

    const autoBid = createAutoTimeoutBid(match, 'p0', 500);
    expect(autoBid.ingredientId).toBe('street_bun_plain');
    expect(autoBid.amount).toBe(0);
    expect(autoBid.isAutoTimeoutBid).toBe(true);

    const normalBid: Bid = {
      playerId: 'p1',
      roundIndex: 0,
      ingredientId: 'street_bun_brioche',
      amount: 4,
      lockedAt: 100,
      isAutoTimeoutBid: false,
    };

    const { resolution } = resolveRound(match, [autoBid, normalBid]);
    expect(resolution.awardsByPlayer.p0?.wonVia).toBe('TIMEOUT_BASIC');
    expect(resolution.awardsByPlayer.p0?.pricePaid).toBe(0);
  });

  it("Chef's Tip awards +$2 budget to trailing player after Round 3 if trailing by >= 3 taste points", () => {
    let match = setupMatch({ enableChefsTip: true });

    // Round 0
    match = startRound(match, 0);
    match = resolveRound(match, [
      { playerId: 'p0', roundIndex: 0, ingredientId: 'street_bun_plain', amount: 0, lockedAt: 0, isAutoTimeoutBid: false },
      { playerId: 'p1', roundIndex: 0, ingredientId: 'street_bun_brioche', amount: 4, lockedAt: 0, isAutoTimeoutBid: false },
    ]).updatedMatch;

    // Round 1
    match = startRound(match, 1);
    match = resolveRound(match, [
      { playerId: 'p0', roundIndex: 1, ingredientId: 'street_patty_basic', amount: 0, lockedAt: 0, isAutoTimeoutBid: false },
      { playerId: 'p1', roundIndex: 1, ingredientId: 'street_patty_wagyu', amount: 8, lockedAt: 0, isAutoTimeoutBid: false },
    ]).updatedMatch;

    // Round 2 (Round 3 in 1-based indexing)
    match = startRound(match, 2);
    const { updatedMatch, resolution } = resolveRound(match, [
      { playerId: 'p0', roundIndex: 2, ingredientId: 'street_sauce_none', amount: 0, lockedAt: 0, isAutoTimeoutBid: false },
      { playerId: 'p1', roundIndex: 2, ingredientId: 'street_sauce_truffle', amount: 3, lockedAt: 0, isAutoTimeoutBid: false },
    ]);

    // p1 taste: Brioche(6) + Wagyu(10) + Truffle(5) = 21
    // p0 taste: Plain(2) + BasicBeef(3) + None(0) = 5
    // Difference is 16 >= 3 -> p0 gets Chef's Tip
    expect(resolution.chefsTipAwardedToPlayerId).toBe('p0');
    expect(updatedMatch.players[0]?.budget).toBe(22); // 20 starting + 2 tip - 0 spent = 22
    expect(updatedMatch.players[0]?.chefsTipGranted).toBe(true);
  });
});
