import { describe, expect, it } from 'vitest';
import { resolveRound } from '../src/engine/bid-resolver.js';
import { generateDishName, generateWinnerTitle } from '../src/engine/dish-namer.js';
import {
  addPlayerToMatch,
  createMatch,
  finalizeMatch,
  setPlayerReady,
  startRound,
  transitionState,
} from '../src/engine/match-engine.js';
import { coinFlip, createPrng, pickDeterministicCustomerOrders } from '../src/engine/prng.js';
import { validateBid } from '../src/engine/validators.js';
import type { AwardedIngredient, Bid, Match, ScoreBreakdown } from '../src/types/models.js';

describe('Engine Coverage Boost & Edge Cases', () => {
  it('PRNG & Deterministic Customer Orders', () => {
    const prng = createPrng(12345);
    const val = prng();
    expect(val).toBeGreaterThanOrEqual(0);
    expect(val).toBeLessThan(1);

    const flip = coinFlip(12345, 0, 1);
    expect([0, 1]).toContain(flip);

    const orders = pickDeterministicCustomerOrders(2026, 2);
    expect(orders.length).toBe(2);
    expect(orders[0]?.id).not.toBe(orders[1]?.id);

    const ordersEmpty = pickDeterministicCustomerOrders(2026, 0);
    expect(ordersEmpty.length).toBe(0);
  });

  it('Dish Namer: covers all title and dish name branches', () => {
    const baseScore: ScoreBreakdown = {
      playerId: 'p0',
      tastePoints: 10,
      combos: [],
      comboPoints: 0,
      orderCompleted: false,
      orderBonusPoints: 0,
      leftoverBudget: 0,
      leftoverMoneyRawBonus: 0,
      leftoverMoneyBonus: 0,
      totalSpent: 10,
      finalScore: 10,
      generatedDishName: '',
    };

    expect(generateWinnerTitle({ ...baseScore, orderCompleted: true, comboPoints: 6 })).toBe('Grand Master Chef');
    expect(generateWinnerTitle({ ...baseScore, comboPoints: 6 })).toBe('Flavor Alchemist');
    expect(generateWinnerTitle({ ...baseScore, leftoverMoneyBonus: 3, orderCompleted: true })).toBe('Efficiency Virtuoso');
    expect(generateWinnerTitle({ ...baseScore, leftoverMoneyBonus: 3 })).toBe('Frugal Gourmet');
    expect(generateWinnerTitle({ ...baseScore, tastePoints: 22 })).toBe('Taste Monarch');
    expect(generateWinnerTitle({ ...baseScore, orderCompleted: true })).toBe('Customer Favorite');
    expect(generateWinnerTitle(baseScore)).toBe('Burger Champion');

    // Dish names
    expect(generateDishName([])).toBe('The Humble Street Burger');

    // Wagyu + Brioche
    const wagyuBrioche: AwardedIngredient[] = [
      { roundIndex: 0, slot: 'BUN', ingredient: { id: 'street_bun_brioche', tier: 'STREET', slot: 'BUN', name: 'Brioche', basePrice: 4, tasteScore: 6, tags: ['RICH'], stock: 2, isBasic: false, iconKey: '' }, pricePaid: 4, wonVia: 'UNCONTESTED' },
      { roundIndex: 1, slot: 'PATTY', ingredient: { id: 'street_patty_wagyu', tier: 'STREET', slot: 'PATTY', name: 'Wagyu', basePrice: 8, tasteScore: 10, tags: ['RICH'], stock: 1, isBasic: false, iconKey: '' }, pricePaid: 8, wonVia: 'UNCONTESTED' },
    ];
    expect(generateDishName(wagyuBrioche)).toBe('The Imperial Wagyu Deluxe');

    // Bacon + Smash + Cheddar
    const baconSmashCheddar: AwardedIngredient[] = [
      { roundIndex: 0, slot: 'PATTY', ingredient: { id: 'street_patty_smash', tier: 'STREET', slot: 'PATTY', name: 'Smash', basePrice: 5, tasteScore: 7, tags: ['SMOKY'], stock: 2, isBasic: false, iconKey: '' }, pricePaid: 5, wonVia: 'UNCONTESTED' },
      { roundIndex: 1, slot: 'CHEESE', ingredient: { id: 'street_cheese_cheddar', tier: 'STREET', slot: 'CHEESE', name: 'Cheddar', basePrice: 2, tasteScore: 4, tags: ['SMOKY'], stock: 2, isBasic: false, iconKey: '' }, pricePaid: 2, wonVia: 'UNCONTESTED' },
      { roundIndex: 2, slot: 'TOPPING', ingredient: { id: 'street_topping_bacon', tier: 'STREET', slot: 'TOPPING', name: 'Bacon', basePrice: 3, tasteScore: 5, tags: ['SMOKY'], stock: 1, isBasic: false, iconKey: '' }, pricePaid: 3, wonVia: 'UNCONTESTED' },
    ];
    expect(generateDishName(baconSmashCheddar)).toBe('The Bacon Smash Royale');

    // Jalapeno + Spicy Mayo
    const fieryJalapeno: AwardedIngredient[] = [
      { roundIndex: 0, slot: 'SAUCE', ingredient: { id: 'street_sauce_spicy_mayo', tier: 'STREET', slot: 'SAUCE', name: 'Spicy Mayo', basePrice: 2, tasteScore: 4, tags: ['SPICY'], stock: 2, isBasic: false, iconKey: '' }, pricePaid: 2, wonVia: 'UNCONTESTED' },
      { roundIndex: 1, slot: 'TOPPING', ingredient: { id: 'street_topping_jalapeno', tier: 'STREET', slot: 'TOPPING', name: 'Jalapeno', basePrice: 2, tasteScore: 4, tags: ['SPICY'], stock: 2, isBasic: false, iconKey: '' }, pricePaid: 2, wonVia: 'UNCONTESTED' },
    ];
    expect(generateDishName(fieryJalapeno)).toBe('The Fiery Jalapeno Inferno');

    // Blue cheese + Bacon
    const blueBeast: AwardedIngredient[] = [
      { roundIndex: 0, slot: 'CHEESE', ingredient: { id: 'street_cheese_blue', tier: 'STREET', slot: 'CHEESE', name: 'Blue', basePrice: 3, tasteScore: 5, tags: ['RICH'], stock: 2, isBasic: false, iconKey: '' }, pricePaid: 3, wonVia: 'UNCONTESTED' },
      { roundIndex: 1, slot: 'TOPPING', ingredient: { id: 'street_topping_bacon', tier: 'STREET', slot: 'TOPPING', name: 'Bacon', basePrice: 3, tasteScore: 5, tags: ['SMOKY'], stock: 1, isBasic: false, iconKey: '' }, pricePaid: 3, wonVia: 'UNCONTESTED' },
    ];
    expect(generateDishName(blueBeast)).toBe('The Smoky Blue Beast');

    // Crispy + Smash
    const crispySmash: AwardedIngredient[] = [
      { roundIndex: 0, slot: 'PATTY', ingredient: { id: 'street_patty_chicken', tier: 'STREET', slot: 'PATTY', name: 'Chicken', basePrice: 4, tasteScore: 6, tags: ['CRISPY'], stock: 2, isBasic: false, iconKey: '' }, pricePaid: 4, wonVia: 'UNCONTESTED' },
      { roundIndex: 1, slot: 'PATTY', ingredient: { id: 'street_patty_smash', tier: 'STREET', slot: 'PATTY', name: 'Smash', basePrice: 5, tasteScore: 7, tags: ['SMOKY'], stock: 2, isBasic: false, iconKey: '' }, pricePaid: 5, wonVia: 'UNCONTESTED' },
    ];
    expect(generateDishName(crispySmash)).toBe('The Crispy Crunch Smash');

    // 2 Spicy tags
    const twoSpicy: AwardedIngredient[] = [
      { roundIndex: 0, slot: 'TOPPING', ingredient: { id: 'street_topping_jalapeno', tier: 'STREET', slot: 'TOPPING', name: 'Jalapeno', basePrice: 2, tasteScore: 4, tags: ['SPICY'], stock: 2, isBasic: false, iconKey: '' }, pricePaid: 2, wonVia: 'UNCONTESTED' },
      { roundIndex: 1, slot: 'TOPPING', ingredient: { id: 'other_spicy', tier: 'STREET', slot: 'TOPPING', name: 'Other', basePrice: 2, tasteScore: 4, tags: ['SPICY'], stock: 2, isBasic: false, iconKey: '' }, pricePaid: 2, wonVia: 'UNCONTESTED' },
    ];
    expect(generateDishName(twoSpicy)).toBe('The Firebrand Pepper Burger');

    // 2 Crispy tags
    const twoCrispy: AwardedIngredient[] = [
      { roundIndex: 0, slot: 'PATTY', ingredient: { id: 'street_patty_chicken', tier: 'STREET', slot: 'PATTY', name: 'Chicken', basePrice: 4, tasteScore: 6, tags: ['CRISPY'], stock: 2, isBasic: false, iconKey: '' }, pricePaid: 4, wonVia: 'UNCONTESTED' },
      { roundIndex: 1, slot: 'TOPPING', ingredient: { id: 'other_crispy', tier: 'STREET', slot: 'TOPPING', name: 'Other', basePrice: 2, tasteScore: 4, tags: ['CRISPY'], stock: 2, isBasic: false, iconKey: '' }, pricePaid: 2, wonVia: 'UNCONTESTED' },
    ];
    expect(generateDishName(twoCrispy)).toBe('The Crisp & Golden Cruncher');

    // Brioche alone
    const briocheAlone: AwardedIngredient[] = [
      { roundIndex: 0, slot: 'BUN', ingredient: { id: 'street_bun_brioche', tier: 'STREET', slot: 'BUN', name: 'Brioche', basePrice: 4, tasteScore: 6, tags: ['RICH'], stock: 2, isBasic: false, iconKey: '' }, pricePaid: 4, wonVia: 'UNCONTESTED' },
    ];
    expect(generateDishName(briocheAlone)).toBe('The Golden Brioche Classic');

    // Plain default
    const plainDefault: AwardedIngredient[] = [
      { roundIndex: 0, slot: 'BUN', ingredient: { id: 'street_bun_sesame', tier: 'STREET', slot: 'BUN', name: 'Sesame', basePrice: 2, tasteScore: 4, tags: [], stock: 2, isBasic: false, iconKey: '' }, pricePaid: 2, wonVia: 'UNCONTESTED' },
    ];
    expect(generateDishName(plainDefault)).toBe('The Signature Artisan Burger');
  });

  it('Bid Resolver & Match Engine: error checks, pricing modes, and tiebreaks', () => {
    const emptyMatch = createMatch();
    expect(() => resolveRound(emptyMatch)).toThrow('Both players must be present');

    let match = createMatch();
    match = addPlayerToMatch(match, { id: 'p0', nickname: 'Alice' });
    match = addPlayerToMatch(match, { id: 'p1', nickname: 'Bob' });

    // Ready player 1 first (line 101 in match-engine.ts)
    match = setPlayerReady(match, 'p1');
    expect(match.players[1]?.ready).toBe(true);

    // Adding 3rd player throws
    expect(() => addPlayerToMatch(match, { id: 'p2', nickname: 'Charlie' })).toThrow('Room is full');

    // Finalize match without both players throws
    expect(() => finalizeMatch(emptyMatch)).toThrow('Cannot finalize match without both players');

    // Invalid state transition throws
    expect(() => transitionState(match, 'FINAL_REVEAL')).toThrow('Invalid state transition');

    // Start round out of bounds throws
    expect(() => startRound(match, 99)).toThrow('Invalid round index');

    // ValidateBid: match in BIDDING but round does not exist (lines 42-47 in validators.ts)
    const matchNoRound: Match = { ...match, state: 'BIDDING', roundIndex: 99 };
    const bid: Bid = {
      playerId: 'p0',
      roundIndex: 99,
      ingredientId: 'street_bun_plain',
      amount: 0,
      lockedAt: 0,
      isAutoTimeoutBid: false,
    };
    expect(validateBid(matchNoRound, 'p0', bid)).toEqual({
      valid: false,
      error: 'INVALID_ROUND_INDEX',
      message: 'Round 99 does not exist in match',
    });

    // Uncontested bids with uncontestedPaysBasePrice = false (lines 117 & 123 in bid-resolver.ts)
    let nonBasePriceMatch = createMatch({ config: { uncontestedPaysBasePrice: false } });
    nonBasePriceMatch = addPlayerToMatch(nonBasePriceMatch, { id: 'p0', nickname: 'Alice' });
    nonBasePriceMatch = addPlayerToMatch(nonBasePriceMatch, { id: 'p1', nickname: 'Bob' });
    nonBasePriceMatch = startRound(nonBasePriceMatch, 0);
    const nonBaseRes = resolveRound(nonBasePriceMatch, [
      { playerId: 'p0', roundIndex: 0, ingredientId: 'street_bun_brioche', amount: 5, lockedAt: 0, isAutoTimeoutBid: false },
      { playerId: 'p1', roundIndex: 0, ingredientId: 'street_bun_sesame', amount: 3, lockedAt: 0, isAutoTimeoutBid: false },
    ]);
    expect(nonBaseRes.resolution.awardsByPlayer.p0?.pricePaid).toBe(5);
    expect(nonBaseRes.resolution.awardsByPlayer.p1?.pricePaid).toBe(3);

    // P0 wins budget tiebreak (p0.budget > p1.budget)
    match.players[0]!.budget = 18;
    match.players[1]!.budget = 7;
    match = startRound(match, 2);
    const { resolution } = resolveRound(match, [
      { playerId: 'p0', roundIndex: 2, ingredientId: 'street_sauce_truffle', amount: 3, lockedAt: 0, isAutoTimeoutBid: false },
      { playerId: 'p1', roundIndex: 2, ingredientId: 'street_sauce_truffle', amount: 3, lockedAt: 0, isAutoTimeoutBid: false },
    ]);
    expect(resolution.awardsByPlayer.p0?.wonVia).toBe('TIEBREAK_BUDGET');

    // Chef's tip when P1 trails P0
    let tipMatch = createMatch({ config: { enableChefsTip: true } });
    tipMatch = addPlayerToMatch(tipMatch, { id: 'p0', nickname: 'Alice' });
    tipMatch = addPlayerToMatch(tipMatch, { id: 'p1', nickname: 'Bob' });
    tipMatch = startRound(tipMatch, 0);
    tipMatch = resolveRound(tipMatch, [
      { playerId: 'p0', roundIndex: 0, ingredientId: 'street_bun_brioche', amount: 4, lockedAt: 0, isAutoTimeoutBid: false },
      { playerId: 'p1', roundIndex: 0, ingredientId: 'street_bun_plain', amount: 0, lockedAt: 0, isAutoTimeoutBid: false },
    ]).updatedMatch;
    tipMatch = startRound(tipMatch, 1);
    tipMatch = resolveRound(tipMatch, [
      { playerId: 'p0', roundIndex: 1, ingredientId: 'street_patty_wagyu', amount: 8, lockedAt: 0, isAutoTimeoutBid: false },
      { playerId: 'p1', roundIndex: 1, ingredientId: 'street_patty_basic', amount: 0, lockedAt: 0, isAutoTimeoutBid: false },
    ]).updatedMatch;
    tipMatch = startRound(tipMatch, 2);
    const tipRes = resolveRound(tipMatch, [
      { playerId: 'p0', roundIndex: 2, ingredientId: 'street_sauce_truffle', amount: 3, lockedAt: 0, isAutoTimeoutBid: false },
      { playerId: 'p1', roundIndex: 2, ingredientId: 'street_sauce_none', amount: 0, lockedAt: 0, isAutoTimeoutBid: false },
    ]);
    expect(tipRes.resolution.chefsTipAwardedToPlayerId).toBe('p1');
    expect(tipRes.updatedMatch.players[1]?.budget).toBe(22);
  });
});
