import { describe, it, expect } from 'vitest';
import {
  STREET_INGREDIENTS,
  TIERS,
  TIER_LIST,
  COMBO_DEFINITIONS,
  CUSTOMER_ORDERS,
  STATE_TIMEOUTS_MS,
  ALLOWED_STATE_TRANSITIONS,
  canTransition,
  getIngredientsBySlot,
  getBasicIngredientForSlot,
  DEFAULT_MVP_MATCH_CONFIG,
  RECONNECT_WINDOW_MS,
  TUTORIAL_MATCH_INTRO_TIMEOUT_MS,
  type FlavorTag,
} from '../src/index.js';

describe('@bidding-kitchen/shared Contracts & Invariants', () => {
  const VALID_TAGS: FlavorTag[] = ['SMOKY', 'SPICY', 'RICH', 'CRISPY', 'FRESH'];

  it('contains exactly 19 canonical Street Tier ingredients across 5 slots', () => {
    expect(STREET_INGREDIENTS).toHaveLength(19);
    expect(getIngredientsBySlot('STREET', 'BUN')).toHaveLength(3);
    expect(getIngredientsBySlot('STREET', 'PATTY')).toHaveLength(4);
    expect(getIngredientsBySlot('STREET', 'SAUCE')).toHaveLength(4);
    expect(getIngredientsBySlot('STREET', 'CHEESE')).toHaveLength(4);
    expect(getIngredientsBySlot('STREET', 'TOPPING')).toHaveLength(4);
  });

  it('ensures every Street Tier slot has exactly one Basic fallback with basePrice 0 and stock 99', () => {
    for (const slot of TIERS.STREET.slots) {
      const basic = getBasicIngredientForSlot('STREET', slot);
      expect(basic.isBasic).toBe(true);
      expect(basic.basePrice).toBe(0);
      expect(basic.stock).toBe(99);
    }
  });

  it('ensures limited-stock Street items have stock 1 and others have stock 2', () => {
    const limitedIds = ['street_patty_wagyu', 'street_sauce_truffle', 'street_topping_bacon'];
    for (const item of STREET_INGREDIENTS) {
      if (item.isBasic) {
        expect(item.stock).toBe(99);
      } else if (limitedIds.includes(item.id)) {
        expect(item.stock).toBe(1);
      } else {
        expect(item.stock).toBe(2);
      }
    }
  });

  it('proves economic scarcity: maximum base-price sum equals $21 which is > $20 budget', () => {
    const maxCost = TIERS.STREET.slots.reduce((sum, slot) => {
      const slotMax = Math.max(...getIngredientsBySlot('STREET', slot).map((i) => i.basePrice));
      return sum + slotMax;
    }, 0);
    expect(maxCost).toBe(21);
    expect(maxCost).toBeGreaterThan(TIERS.STREET.startingBudget);
  });

  it('ensures all flavor tags belong to canonical FlavorTag set', () => {
    for (const item of STREET_INGREDIENTS) {
      for (const tag of item.tags) {
        expect(VALID_TAGS).toContain(tag);
      }
    }
  });

  it('defines 3 tiers with correct budgets and rounds count', () => {
    expect(TIER_LIST).toHaveLength(3);
    expect(TIERS.STREET.startingBudget).toBe(20);
    expect(TIERS.STREET.roundsCount).toBe(5);
    expect(TIERS.STREET.dishName).toBe('Burger');
    expect(TIERS.BISTRO.startingBudget).toBe(30);
    expect(TIERS.CHEFS_TABLE.startingBudget).toBe(40);
  });

  it('defines exactly 4 canonical combos with points 4, 3, 3, 3', () => {
    expect(COMBO_DEFINITIONS).toHaveLength(4);
    expect(COMBO_DEFINITIONS.map((c) => c.points)).toEqual([4, 3, 3, 3]);
  });

  it('defines exactly 6 Customer Orders with 5 bonus points each', () => {
    expect(CUSTOMER_ORDERS).toHaveLength(6);
    for (const order of CUSTOMER_ORDERS) {
      expect(order.bonusPoints).toBe(5);
    }
  });

  it('validates state transitions with canTransition', () => {
    expect(ALLOWED_STATE_TRANSITIONS.LOBBY).toContain('TIER_CONFIRMED');
    expect(canTransition('BIDDING', 'LOCKED')).toBe(true);
    expect(canTransition('BIDDING', 'RESOLVE')).toBe(false);
    expect(canTransition('LOCKED', 'RESOLVE')).toBe(true);
    expect(canTransition('LOBBY', 'TIER_CONFIRMED')).toBe(true);
    expect(canTransition('LOBBY', 'RESOLVE')).toBe(false);
  });

  it('exports exact timeout constants and default MVP match config', () => {
    expect(STATE_TIMEOUTS_MS.LOBBY).toBe(600000);
    expect(STATE_TIMEOUTS_MS.ROUND_REVEAL).toBe(2000);
    expect(STATE_TIMEOUTS_MS.LOCKED).toBe(500);
    expect(STATE_TIMEOUTS_MS.FINAL_REVEAL).toBe(8000);
    expect(TUTORIAL_MATCH_INTRO_TIMEOUT_MS).toBe(22000);
    expect(RECONNECT_WINDOW_MS).toBe(30000);
    expect(DEFAULT_MVP_MATCH_CONFIG.stockMode).toBe('ALL_COLLISIONS_CONTEST');
    expect(DEFAULT_MVP_MATCH_CONFIG.uncontestedPaysBasePrice).toBe(true);
  });

  it('throws descriptive error if getBasicIngredientForSlot called on slot with no basic', () => {
    expect(() => getBasicIngredientForSlot('STREET', 'DOUGH' as any)).toThrow(
      'No basic ingredient found for tier/slot'
    );
  });
});
