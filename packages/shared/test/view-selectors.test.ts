import { describe, it, expect } from 'vitest';
import {
  getMyPlayerFromView,
  getOpponentPlayerFromView,
  getRemainingStateMs,
  getComboProgressForDish,
  isVariantAffordable,
  getResolutionCueForPlayer,
  STREET_INGREDIENTS,
  type AwardedIngredient,
  type PublicMatchView,
  type PublicPlayerView,
  type RoundResolution,
} from '../src/index.js';

describe('View Selectors and Client Helpers', () => {
  const p0: PublicPlayerView = {
    id: 'p0',
    nickname: 'ChefAlice',
    seat: 0,
    ready: true,
    connected: true,
    disconnectedAt: null,
    budget: 15,
    dish: [],
    secretOrder: null,
    chefsTipGranted: false,
  };

  const p1: PublicPlayerView = {
    id: 'p1',
    nickname: 'ChefBob',
    seat: 1,
    ready: false,
    connected: true,
    disconnectedAt: null,
    budget: 18,
    dish: [],
    secretOrder: null,
    chefsTipGranted: false,
  };

  const baseView: PublicMatchView = {
    id: 'm_test',
    roomCode: 'BURG42',
    tier: 'STREET',
    state: 'BIDDING',
    config: {
      stockMode: 'ALL_COLLISIONS_CONTEST',
      uncontestedPaysBasePrice: true,
      enableCustomerOrders: false,
      enableChefsTip: false,
      showOpponentBudget: true,
      biddingDurationMs: 15000,
      reconnectWindowMs: 30000,
    },
    roundIndex: 0,
    myPlayerId: 'p0',
    players: [p0, p1],
    currentRound: null,
    remainingStock: {},
    result: null,
    serverNow: 1700000005000,
    stateEnteredAt: 1700000000000,
    stateDeadlineAt: 1700000020000,
  };

  it('getMyPlayerFromView returns my player and throws if missing', () => {
    const me = getMyPlayerFromView(baseView);
    expect(me.id).toBe('p0');
    expect(me.nickname).toBe('ChefAlice');

    expect(() =>
      getMyPlayerFromView({ ...baseView, myPlayerId: 'non_existent' }),
    ).toThrow('Player with id "non_existent" not found');
  });

  it('getOpponentPlayerFromView returns opponent or null if empty seat', () => {
    const opp = getOpponentPlayerFromView(baseView);
    expect(opp).not.toBeNull();
    expect(opp?.id).toBe('p1');
    expect(opp?.nickname).toBe('ChefBob');

    const singlePlayerView: PublicMatchView = {
      ...baseView,
      players: [p0, null],
    };
    expect(getOpponentPlayerFromView(singlePlayerView)).toBeNull();
  });

  it('getRemainingStateMs neutralizes clock offset accurately and clamps to 0', () => {
    // Worked Example from spec:
    // serverNow: 1700000005000, clientNow: 1700000004500 -> offset = +500
    // stateDeadlineAt: 1700000020000
    // at clientNow = 1700000009500 -> estimated server time = 1700000010000
    // remaining = 1700000020000 - 1700000010000 = 10000 ms
    const clockOffsetMs = 500;
    const clientNowMs = 1700000009500;
    const remaining = getRemainingStateMs(baseView, clientNowMs, clockOffsetMs);
    expect(remaining).toBe(10000);

    // If deadline is in the past, clamps to 0
    const pastView: PublicMatchView = {
      ...baseView,
      stateDeadlineAt: 1700000000000,
    };
    expect(getRemainingStateMs(pastView, clientNowMs, clockOffsetMs)).toBe(0);
  });

  it('getComboProgressForDish tracks progress for all 4 combos correctly', () => {
    const brioche = STREET_INGREDIENTS.find((i) => i.id === 'street_bun_brioche')!; // RICH
    const smash = STREET_INGREDIENTS.find((i) => i.id === 'street_patty_smash')!; // SMOKY
    const spicyMayo = STREET_INGREDIENTS.find((i) => i.id === 'street_sauce_spicy_mayo')!; // SPICY
    const cheddar = STREET_INGREDIENTS.find((i) => i.id === 'street_cheese_cheddar')!; // SMOKY
    const jalapeno = STREET_INGREDIENTS.find((i) => i.id === 'street_topping_jalapeno')!; // SPICY

    const mockDish: AwardedIngredient[] = [
      { roundIndex: 0, slot: 'BUN', ingredient: brioche, pricePaid: 4, wonVia: 'UNCONTESTED' },
      { roundIndex: 1, slot: 'PATTY', ingredient: smash, pricePaid: 5, wonVia: 'UNCONTESTED' },
      { roundIndex: 2, slot: 'SAUCE', ingredient: spicyMayo, pricePaid: 2, wonVia: 'UNCONTESTED' },
      { roundIndex: 3, slot: 'CHEESE', ingredient: cheddar, pricePaid: 2, wonVia: 'UNCONTESTED' },
      { roundIndex: 4, slot: 'TOPPING', ingredient: jalapeno, pricePaid: 2, wonVia: 'UNCONTESTED' },
    ];

    const progress = getComboProgressForDish(mockDish);
    expect(progress).toHaveLength(4);

    // SMOKEHOUSE (2 smoky: smash, cheddar) -> earned
    const smokehouse = progress.find((p) => p.combo.id === 'SMOKEHOUSE')!;
    expect(smokehouse.earned).toBe(true);
    expect(smokehouse.progressText).toBe('Smoky: 2/2');

    // HOT_AND_DECADENT (Spicy: spicyMayo/jalapeno, Rich: brioche) -> earned
    const hotDecadent = progress.find((p) => p.combo.id === 'HOT_AND_DECADENT')!;
    expect(hotDecadent.earned).toBe(true);
    expect(hotDecadent.progressText).toBe('Spicy: Yes, Rich: Yes');

    // CHEFS_PRIDE (5 non-basic ingredients) -> earned
    const chefsPride = progress.find((p) => p.combo.id === 'CHEFS_PRIDE')!;
    expect(chefsPride.earned).toBe(true);
    expect(chefsPride.progressText).toBe('Basic used: 0');
  });

  it('isVariantAffordable checks budget constraints accurately', () => {
    const plainBasic = STREET_INGREDIENTS.find((i) => i.isBasic)!;
    const wagyu = STREET_INGREDIENTS.find((i) => i.id === 'street_patty_wagyu')!; // basePrice 8

    expect(isVariantAffordable(plainBasic, 0)).toBe(true);
    expect(isVariantAffordable(wagyu, 8)).toBe(true);
    expect(isVariantAffordable(wagyu, 10)).toBe(true);
    expect(isVariantAffordable(wagyu, 7)).toBe(false);
  });

  it('getResolutionCueForPlayer computes animation deltas, sound cues, and microcopy correctly', () => {
    const wagyu = STREET_INGREDIENTS.find((i) => i.id === 'street_patty_wagyu')!;
    const basicBeef = STREET_INGREDIENTS.find((i) => i.id === 'street_patty_basic')!;

    // Worked Example 2: Collision on Wagyu where p0 bids $9 and p1 bids $8
    const collisionResolution: RoundResolution = {
      roundIndex: 1,
      slot: 'PATTY',
      bidsByPlayer: {
        p0: { playerId: 'p0', roundIndex: 1, ingredientId: 'street_patty_wagyu', amount: 9, lockedAt: 1000, isAutoTimeoutBid: false },
        p1: { playerId: 'p1', roundIndex: 1, ingredientId: 'street_patty_wagyu', amount: 8, lockedAt: 1000, isAutoTimeoutBid: false },
      },
      outcomeType: 'COLLISION_HIGH_BID',
      awardsByPlayer: {
        p0: { roundIndex: 1, slot: 'PATTY', ingredient: wagyu, pricePaid: 9, wonVia: 'HIGH_BID' },
        p1: { roundIndex: 1, slot: 'PATTY', ingredient: basicBeef, pricePaid: 0, wonVia: 'FALLBACK_LOSS' },
      },
      budgetsBeforeRound: { p0: 16, p1: 18 },
      budgetsAfterRound: { p0: 7, p1: 18 },
      chefsTipAwardedToPlayerId: null,
    };

    // p0: Winner
    const p0Cue = getResolutionCueForPlayer(collisionResolution, 'p0');
    expect(p0Cue.budgetDelta).toBe(-9);
    expect(p0Cue.isCollision).toBe(true);
    expect(p0Cue.didIWinCollision).toBe(true);
    expect(p0Cue.soundCue).toBe('CASH_WIN');
    expect(p0Cue.bannerTitle).toBe('You Outbid Opponent!');
    expect(p0Cue.bannerSubtitle).toBe('Won Wagyu for $9!');

    // p1: Loser taking Basic Beef fallback
    const p1Cue = getResolutionCueForPlayer(collisionResolution, 'p1');
    expect(p1Cue.budgetDelta).toBe(0);
    expect(p1Cue.isCollision).toBe(true);
    expect(p1Cue.didIWinCollision).toBe(false);
    expect(p1Cue.soundCue).toBe('FALLBACK_BOOP');
    expect(p1Cue.bannerTitle).toBe('Outbid on Wagyu!');
    expect(p1Cue.bannerSubtitle).toBe('Kept your cash & took free Basic Beef ($0).');

    // Uncontested win with Chef's tip
    const brioche = STREET_INGREDIENTS.find((i) => i.id === 'street_bun_brioche')!;
    const uncontestedResolution: RoundResolution = {
      roundIndex: 0,
      slot: 'BUN',
      bidsByPlayer: {
        p0: { playerId: 'p0', roundIndex: 0, ingredientId: 'street_bun_brioche', amount: 4, lockedAt: 500, isAutoTimeoutBid: false },
      },
      outcomeType: 'NO_COLLISION',
      awardsByPlayer: {
        p0: { roundIndex: 0, slot: 'BUN', ingredient: brioche, pricePaid: 4, wonVia: 'UNCONTESTED' },
      },
      budgetsBeforeRound: { p0: 20 },
      budgetsAfterRound: { p0: 16 },
      chefsTipAwardedToPlayerId: 'p0',
    };

    const uncontestedCue = getResolutionCueForPlayer(uncontestedResolution, 'p0');
    expect(uncontestedCue.budgetDelta).toBe(-4);
    expect(uncontestedCue.isCollision).toBe(false);
    expect(uncontestedCue.soundCue).toBe('CASH_WIN');
    expect(uncontestedCue.bannerTitle).toBe('Uncontested Win!');
    expect(uncontestedCue.bannerSubtitle).toBe("Won Brioche for $4! + $2 Chef's Tip!");
  });
});
