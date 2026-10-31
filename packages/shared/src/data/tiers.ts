import type { TierDefinition, TierId } from '../types/models.js';

export const TIERS: Record<TierId, TierDefinition> = {
  STREET: {
    id: 'STREET',
    name: 'Street',
    dishName: 'Burger',
    startingBudget: 20,
    slots: ['BUN', 'PATTY', 'SAUCE', 'CHEESE', 'TOPPING'],
    roundsCount: 5,
    mvpEnabled: true,
  },
  BISTRO: {
    id: 'BISTRO',
    name: 'Bistro',
    dishName: 'Pizza',
    startingBudget: 30,
    slots: ['DOUGH', 'PIZZA_SAUCE', 'PIZZA_CHEESE', 'MAIN_TOPPING', 'FINISH'],
    roundsCount: 5,
    mvpEnabled: false,
  },
  CHEFS_TABLE: {
    id: 'CHEFS_TABLE',
    name: "Chef's Table",
    dishName: 'Steak Dinner',
    startingBudget: 40,
    slots: ['CUT', 'SIDE', 'STEAK_SAUCE', 'GARNISH', 'DRINK', 'DESSERT'],
    roundsCount: 6,
    mvpEnabled: false,
  },
} as const;

export const TIER_LIST: TierDefinition[] = Object.values(TIERS);
