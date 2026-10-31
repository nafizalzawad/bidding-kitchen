import { describe, expect, it } from 'vitest';
import { STREET_INGREDIENTS } from '../src/data/ingredients-street.js';
import {
  calculateMatchResult,
  calculatePlayerScore,
  evaluateCombos,
  evaluateCustomerOrder,
} from '../src/engine/scorer.js';
import type { AwardedIngredient, CustomerOrder, Match, Player } from '../src/types/models.js';

function getIngredient(id: string) {
  const ing = STREET_INGREDIENTS.find((i) => i.id === id);
  if (!ing) throw new Error(`Missing ${id}`);
  return ing;
}

function makeAward(id: string, pricePaid: number): AwardedIngredient {
  const ing = getIngredient(id);
  return {
    roundIndex: 0,
    slot: ing.slot,
    ingredient: ing,
    pricePaid,
    wonVia: 'UNCONTESTED',
  };
}

describe('Scorer Engine & Combos', () => {
  it('Worked Example 4: Complex scoring with 3 combos and leftover money bonus', () => {
    // Player B: Sesame, Smash Beef, Truffle Mayo, Cheddar, Jalapeno
    const dish: AwardedIngredient[] = [
      makeAward('street_bun_sesame', 2),
      makeAward('street_patty_smash', 5),
      makeAward('street_sauce_truffle', 3),
      makeAward('street_cheese_cheddar', 2),
      makeAward('street_topping_jalapeno', 2),
    ];

    const player: Player = {
      id: 'p1',
      nickname: 'Bob',
      reconnectToken: 'tok1',
      seat: 1,
      ready: true,
      connected: true,
      disconnectedAt: null,
      budget: 6, // $6 leftover
      dish,
      secretOrder: null,
      chefsTipGranted: false,
    };

    const breakdown = calculatePlayerScore(player);

    // Taste points: 4 (Sesame) + 7 (Smash) + 5 (Truffle) + 4 (Cheddar) + 4 (Jalapeno) = 24
    expect(breakdown.tastePoints).toBe(24);

    // Combos:
    // Smokehouse (Smash + Cheddar = 2 Smoky) -> 4
    // Hot and Decadent (Jalapeno Spicy + Truffle Rich) -> 3
    // Chef's Pride (zero basic items) -> 3
    expect(breakdown.combos.map((c) => c.id).sort()).toEqual([
      'CHEFS_PRIDE',
      'HOT_AND_DECADENT',
      'SMOKEHOUSE',
    ]);
    expect(breakdown.comboPoints).toBe(10);

    // Leftover budget bonus: round(6 * 0.5) = 3
    expect(breakdown.leftoverMoneyBonus).toBe(3);

    // Final score: 24 + 10 + 0 + 3 = 37
    expect(breakdown.finalScore).toBe(37);
  });

  it('Calculates leftover money bonus rounding correctly (round(budget * 0.5))', () => {
    const testCases: [number, number][] = [
      [0, 0],
      [1, 1], // 0.5 rounds to 1
      [2, 1],
      [3, 2], // 1.5 rounds to 2
      [4, 2],
      [5, 3], // 2.5 rounds to 3
      [6, 3],
      [7, 4], // 3.5 rounds to 4
      [20, 10],
    ];

    for (const [budget, expectedBonus] of testCases) {
      const player: Player = {
        id: 'p0',
        nickname: 'Alice',
        reconnectToken: 'tok0',
        seat: 0,
        ready: true,
        connected: true,
        disconnectedAt: null,
        budget,
        dish: [],
        secretOrder: null,
        chefsTipGranted: false,
      };

      const breakdown = calculatePlayerScore(player);
      expect(breakdown.leftoverMoneyBonus).toBe(expectedBonus);
    }
  });

  it('Evaluates customer orders: tag requirement and forbidden slot', () => {
    const spicyOrder: CustomerOrder = {
      id: 'order_spicy',
      title: 'Spicy Kick',
      description: 'Needs 2 spicy',
      bonusPoints: 5,
      requiredTags: ['SPICY'],
      minTagCount: 2,
    };

    const dishWithOneSpicy = [makeAward('street_topping_jalapeno', 2)];
    expect(evaluateCustomerOrder(spicyOrder, dishWithOneSpicy).completed).toBe(false);

    const dishWithTwoSpicy = [
      makeAward('street_topping_jalapeno', 2),
      makeAward('street_sauce_spicy_mayo', 2),
    ];
    const spicyResult = evaluateCustomerOrder(spicyOrder, dishWithTwoSpicy);
    expect(spicyResult.completed).toBe(true);
    expect(spicyResult.bonusPoints).toBe(5);

    // Forbidden slot: dairy-free customer wants basic cheese fallback
    const noCheeseOrder: CustomerOrder = {
      id: 'order_no_cheese',
      title: 'Dairy Free',
      description: 'Requires basic cheese',
      bonusPoints: 5,
      forbiddenSlotNonBasic: 'CHEESE',
    };

    const dishWithCheddar = [makeAward('street_cheese_cheddar', 2)];
    expect(evaluateCustomerOrder(noCheeseOrder, dishWithCheddar).completed).toBe(false);

    const dishWithBasicCheese = [makeAward('street_cheese_none', 0)];
    expect(evaluateCustomerOrder(noCheeseOrder, dishWithBasicCheese).completed).toBe(true);
  });

  it('Evaluates Crunch Contrast combo (Crispy + Fresh)', () => {
    const dish = [
      makeAward('street_patty_chicken', 4), // CRISPY
      makeAward('street_topping_lettuce', 1), // FRESH
    ];

    const combos = evaluateCombos(dish);
    expect(combos.some((c) => c.id === 'CRUNCH_CONTRAST')).toBe(true);
  });

  it('Resolves match tiebreaks: lower total spent breaks tied final scores', () => {
    const p0: Player = {
      id: 'p0',
      nickname: 'Alice',
      reconnectToken: 'tok0',
      seat: 0,
      ready: true,
      connected: true,
      disconnectedAt: null,
      budget: 8,
      dish: [makeAward('street_bun_brioche', 4)],
      secretOrder: null,
      chefsTipGranted: false,
    };
    const p1: Player = {
      id: 'p1',
      nickname: 'Bob',
      reconnectToken: 'tok1',
      seat: 1,
      ready: true,
      connected: true,
      disconnectedAt: null,
      budget: 4,
      dish: [makeAward('street_bun_brioche', 8)],
      secretOrder: null,
      chefsTipGranted: false,
    };

    const mockMatch: Match = {
      id: 'm1',
      roomCode: 'BKIT',
      seed: 2026,
      tier: 'STREET',
      state: 'FINAL_REVEAL',
      config: {
        stockMode: 'ALL_COLLISIONS_CONTEST',
        uncontestedPaysBasePrice: true,
        enableCustomerOrders: false,
        enableChefsTip: false,
        showOpponentBudget: true,
        biddingDurationMs: 15000,
        reconnectWindowMs: 30000,
      },
      roundIndex: 4,
      players: [p0, p1],
      rounds: [],
      remainingStock: {},
      result: null,
      stateEnteredAt: 0,
      stateDeadlineAt: 0,
      createdAt: 0,
    };

    const p0Score = calculatePlayerScore(p0);
    const p1Score = calculatePlayerScore(p1);
    // Force identical final scores
    p0Score.finalScore = 30;
    p1Score.finalScore = 30;
    p0Score.totalSpent = 12;
    p1Score.totalSpent = 16;

    const result = calculateMatchResult(mockMatch, p0Score, p1Score, 2026);

    expect(result.winnerId).toBe('p0');
    expect(result.winReason).toBe('SPENT_LESS_TIEBREAK');
  });

  it('Resolves match tiebreaks: coinflip breaks score and spent deadlock', () => {
    const p0: Player = {
      id: 'p0',
      nickname: 'Alice',
      reconnectToken: 'tok0',
      seat: 0,
      ready: true,
      connected: true,
      disconnectedAt: null,
      budget: 10,
      dish: [],
      secretOrder: null,
      chefsTipGranted: false,
    };
    const p1: Player = {
      id: 'p1',
      nickname: 'Bob',
      reconnectToken: 'tok1',
      seat: 1,
      ready: true,
      connected: true,
      disconnectedAt: null,
      budget: 10,
      dish: [],
      secretOrder: null,
      chefsTipGranted: false,
    };

    const mockMatch: Match = {
      id: 'm1',
      roomCode: 'BKIT',
      seed: 2026,
      tier: 'STREET',
      state: 'FINAL_REVEAL',
      config: {
        stockMode: 'ALL_COLLISIONS_CONTEST',
        uncontestedPaysBasePrice: true,
        enableCustomerOrders: false,
        enableChefsTip: false,
        showOpponentBudget: true,
        biddingDurationMs: 15000,
        reconnectWindowMs: 30000,
      },
      roundIndex: 4,
      players: [p0, p1],
      rounds: [],
      remainingStock: {},
      result: null,
      stateEnteredAt: 0,
      stateDeadlineAt: 0,
      createdAt: 0,
    };

    const p0Score = calculatePlayerScore(p0);
    const p1Score = calculatePlayerScore(p1);
    p0Score.finalScore = 30;
    p1Score.finalScore = 30;
    p0Score.totalSpent = 10;
    p1Score.totalSpent = 10;

    const result = calculateMatchResult(mockMatch, p0Score, p1Score, 2026);

    expect(result.winReason).toBe('COINFLIP_TIEBREAK');
    expect(['p0', 'p1']).toContain(result.winnerId);
  });
});
