import { describe, it, expect } from 'vitest';
import {
  BISTRO_INGREDIENTS,
  CHEFS_TABLE_INGREDIENTS,
  TIERS,
  DEFAULT_V15_MATCH_CONFIG,
  getIngredientsBySlot,
  getBasicIngredientForSlot,
  createMatch,
  addPlayerToMatch,
  startRound,
  submitBid,
  resolveRound,
  transitionState,
  finalizeMatch,
  evaluateCustomerOrder,
  CUSTOMER_ORDERS,
  type CustomerOrder,
} from '../src/index.js';

describe('Phase 8 v1.5 Tiers, Ingredients, Customer Orders & Chef\'s Tip Unit Tests', () => {
  it('validates BISTRO tier dataset: 19 Pizza variants, 5 slots, $30 budget, $32 max sum', () => {
    expect(BISTRO_INGREDIENTS).toHaveLength(19);
    const slots = TIERS.BISTRO.slots;
    expect(slots).toEqual(['DOUGH', 'PIZZA_SAUCE', 'PIZZA_CHEESE', 'MAIN_TOPPING', 'FINISH']);
    expect(TIERS.BISTRO.mvpEnabled).toBe(true);

    let maxBaseSum = 0;
    for (const slot of slots) {
      const variants = getIngredientsBySlot('BISTRO', slot);
      expect(variants.length).toBeGreaterThanOrEqual(3);

      const basics = variants.filter((v) => v.isBasic);
      expect(basics).toHaveLength(1);
      expect(basics[0]!.basePrice).toBe(0);

      const maxPrice = Math.max(...variants.map((v) => v.basePrice));
      maxBaseSum += maxPrice;

      const basic = getBasicIngredientForSlot('BISTRO', slot);
      expect(basic.isBasic).toBe(true);
      expect(basic.slot).toBe(slot);
    }

    expect(maxBaseSum).toBe(32);
    expect(maxBaseSum).toBeGreaterThan(TIERS.BISTRO.startingBudget);
  });

  it('validates CHEFS_TABLE tier dataset: 23 Steak variants, 6 slots, $40 budget, $44 max sum', () => {
    expect(CHEFS_TABLE_INGREDIENTS).toHaveLength(23);
    const slots = TIERS.CHEFS_TABLE.slots;
    expect(slots).toEqual(['CUT', 'SIDE', 'STEAK_SAUCE', 'GARNISH', 'DRINK', 'DESSERT']);
    expect(TIERS.CHEFS_TABLE.mvpEnabled).toBe(true);

    let maxBaseSum = 0;
    for (const slot of slots) {
      const variants = getIngredientsBySlot('CHEFS_TABLE', slot);
      expect(variants.length).toBeGreaterThanOrEqual(3);

      const basics = variants.filter((v) => v.isBasic);
      expect(basics).toHaveLength(1);
      expect(basics[0]!.basePrice).toBe(0);

      const maxPrice = Math.max(...variants.map((v) => v.basePrice));
      maxBaseSum += maxPrice;

      const basic = getBasicIngredientForSlot('CHEFS_TABLE', slot);
      expect(basic.isBasic).toBe(true);
      expect(basic.slot).toBe(slot);
    }

    expect(maxBaseSum).toBe(44);
    expect(maxBaseSum).toBeGreaterThan(TIERS.CHEFS_TABLE.startingBudget);
  });

  it('executes a full 5-round BISTRO match ($30 Pizza) with Customer Orders to FINAL_REVEAL', () => {
    let match = createMatch({
      roomCode: 'PIZZ42',
      tier: 'BISTRO',
      seed: 8888,
      config: DEFAULT_V15_MATCH_CONFIG,
    });

    expect(match.config.enableCustomerOrders).toBe(true);
    expect(match.config.enableChefsTip).toBe(true);

    match = addPlayerToMatch(match, { id: 'p0', nickname: 'Mario' });
    match = addPlayerToMatch(match, { id: 'p1', nickname: 'Luigi' });

    expect(match.players[0]!.budget).toBe(30);
    expect(match.players[1]!.budget).toBe(30);
    expect(match.players[0]!.secretOrder).not.toBeNull();
    expect(match.players[1]!.secretOrder).not.toBeNull();

    match = transitionState(match, 'TIER_CONFIRMED');
    match = transitionState(match, 'MATCH_INTRO');

    for (let r = 0; r < 5; r++) {
      match = { ...match, roundIndex: r };
      match = transitionState(match, 'ROUND_REVEAL');
      match = startRound(match, r, Date.now());

      const round = match.rounds[r]!;
      const ing0 = round.availableIngredients[1]!;
      const ing1 = round.availableIngredients[0]!; // basic $0

      match = submitBid(match, 'p0', {
        roundIndex: r,
        ingredientId: ing0.id,
        amount: ing0.basePrice,
        idempotencyKey: `bid_p0_${r}`,
        clientTime: Date.now(),
      }).match;

      match = submitBid(match, 'p1', {
        roundIndex: r,
        ingredientId: ing1.id,
        amount: 0,
        idempotencyKey: `bid_p1_${r}`,
        clientTime: Date.now(),
      }).match;

      if (match.state !== 'LOCKED') {
        if (match.state !== 'LOCKED') {
        match = transitionState(match, 'LOCKED');
      }
      }
      const { updatedMatch } = resolveRound(match);
      match = transitionState(updatedMatch, 'RESOLVE');
      match = transitionState(match, 'ROUND_END');
    }

    match = finalizeMatch(match);
    match = transitionState(match, 'FINAL_REVEAL');
    expect(match.result).not.toBeNull();
    expect(match.result!.roundHistory).toHaveLength(5);
  });

  it('executes a full 6-round CHEFS_TABLE match ($40 Steak Dinner) through all 6 slots', () => {
    let match = createMatch({
      roomCode: 'STEAK6',
      tier: 'CHEFS_TABLE',
      seed: 9999,
      config: DEFAULT_V15_MATCH_CONFIG,
    });

    match = addPlayerToMatch(match, { id: 'p0', nickname: 'Chef Ramsay' });
    match = addPlayerToMatch(match, { id: 'p1', nickname: 'Chef Keller' });

    expect(match.players[0]!.budget).toBe(40);
    expect(match.rounds).toHaveLength(6);

    match = transitionState(match, 'TIER_CONFIRMED');
    match = transitionState(match, 'MATCH_INTRO');

    for (let r = 0; r < 6; r++) {
      match = { ...match, roundIndex: r };
      match = transitionState(match, 'ROUND_REVEAL');
      match = startRound(match, r, Date.now());

      const round = match.rounds[r]!;
      const ing0 = round.availableIngredients[0]!;
      const ing1 = round.availableIngredients[0]!;

      match = submitBid(match, 'p0', {
        roundIndex: r,
        ingredientId: ing0.id,
        amount: 0,
        idempotencyKey: `b0_${r}`,
        clientTime: Date.now(),
      }).match;

      match = submitBid(match, 'p1', {
        roundIndex: r,
        ingredientId: ing1.id,
        amount: 0,
        idempotencyKey: `b1_${r}`,
        clientTime: Date.now(),
      }).match;

      if (match.state !== 'LOCKED') {
        if (match.state !== 'LOCKED') {
        match = transitionState(match, 'LOCKED');
      }
      }
      const { updatedMatch } = resolveRound(match);
      match = transitionState(updatedMatch, 'RESOLVE');
      match = transitionState(match, 'ROUND_END');
    }

    match = finalizeMatch(match);
    match = transitionState(match, 'FINAL_REVEAL');
    expect(match.result!.roundHistory).toHaveLength(6);
  });

  it('evaluates Customer Orders correctly across tag requirements and dairy-free restrictions', () => {
    const spicyOrder: CustomerOrder = CUSTOMER_ORDERS.find((o) => o.id === 'order_spicy_kick')!;
    const dishNoSpicy = [
      getBasicIngredientForSlot('BISTRO', 'DOUGH'),
      getBasicIngredientForSlot('BISTRO', 'PIZZA_SAUCE'),
    ];
    expect(evaluateCustomerOrder(spicyOrder, dishNoSpicy).completed).toBe(false);

    const arrabbiata = getIngredientsBySlot('BISTRO', 'PIZZA_SAUCE').find((i) => i.tags.includes('SPICY'))!;
    const hotHoney = getIngredientsBySlot('BISTRO', 'FINISH').find((i) => i.tags.includes('SPICY'))!;
    const dishTwoSpicy = [arrabbiata, hotHoney];

    const result = evaluateCustomerOrder(spicyOrder, dishTwoSpicy);
    expect(result.completed).toBe(true);
    expect(result.bonusPoints).toBe(5);

    // Forbidden cheese order
    const noCheeseOrder = CUSTOMER_ORDERS.find((o) => o.id === 'order_no_cheese_purist')!;
    const dishWithGratedParm = [getBasicIngredientForSlot('BISTRO', 'PIZZA_CHEESE')];
    expect(evaluateCustomerOrder(noCheeseOrder, dishWithGratedParm).completed).toBe(true);

    const burrata = getIngredientsBySlot('BISTRO', 'PIZZA_CHEESE').find((i) => !i.isBasic)!;
    expect(evaluateCustomerOrder(noCheeseOrder, [burrata]).completed).toBe(false);
  });

  it('triggers Chef\'s Tip (+$2 budget) after Round 3 when trailing by >= 3 taste points', () => {
    let match = createMatch({
      roomCode: 'CHEFSTIP',
      tier: 'CHEFS_TABLE',
      seed: 7777,
      config: { ...DEFAULT_V15_MATCH_CONFIG, enableChefsTip: true },
    });

    match = addPlayerToMatch(match, { id: 'p0', nickname: 'Alice' });
    match = addPlayerToMatch(match, { id: 'p1', nickname: 'Bob' });

    match = transitionState(match, 'TIER_CONFIRMED');
    match = transitionState(match, 'MATCH_INTRO');

    // Play Rounds 0, 1, 2 (Round 3)
    // p0 wins high-taste items, p1 takes $0 basic items
    for (let r = 0; r <= 2; r++) {
      match = { ...match, roundIndex: r };
      match = transitionState(match, 'ROUND_REVEAL');
      match = startRound(match, r, Date.now());

      const round = match.rounds[r]!;
      const nonBasic = round.availableIngredients.find((i) => !i.isBasic && i.tasteScore >= 8)!;
      const basic = round.availableIngredients.find((i) => i.isBasic)!;

      match = submitBid(match, 'p0', {
        roundIndex: r,
        ingredientId: nonBasic.id,
        amount: nonBasic.basePrice,
        idempotencyKey: `p0_${r}`,
        clientTime: Date.now(),
      }).match;

      match = submitBid(match, 'p1', {
        roundIndex: r,
        ingredientId: basic.id,
        amount: 0,
        idempotencyKey: `p1_${r}`,
        clientTime: Date.now(),
      }).match;

      if (match.state !== 'LOCKED') {
        match = transitionState(match, 'LOCKED');
      }
      const { updatedMatch, resolution } = resolveRound(match);
      match = transitionState(updatedMatch, 'RESOLVE');

      if (r === 2) {
        // Round 3 resolution must trigger Chef's Tip for p1!
        expect(resolution.chefsTipAwardedToPlayerId).toBe('p1');
        expect(match.players[1]!.chefsTipGranted).toBe(true);
        // p1 started with $40, spent $0, received +$2 tip -> $42!
        expect(match.players[1]!.budget).toBe(42);
      } else {
        expect(resolution.chefsTipAwardedToPlayerId).toBeNull();
      }

      match = transitionState(match, 'ROUND_END');
    }
  });
});
