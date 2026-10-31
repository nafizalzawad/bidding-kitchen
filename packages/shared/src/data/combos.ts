import type { ComboAward, ComboId } from '../types/models.js';

export const COMBO_DEFINITIONS: ComboAward[] = [
  {
    id: 'SMOKEHOUSE',
    name: 'Smokehouse',
    points: 4,
    description: 'Two or more Smoky items',
  },
  {
    id: 'HOT_AND_DECADENT',
    name: 'Hot and Decadent',
    points: 3,
    description: 'At least one Spicy and one Rich item',
  },
  {
    id: 'CRUNCH_CONTRAST',
    name: 'Crunch Contrast',
    points: 3,
    description: 'At least one Crispy and one Fresh item',
  },
  {
    id: 'CHEFS_PRIDE',
    name: "Chef's Pride",
    points: 3,
    description: 'Complete dish with zero Basic fallback items used',
  },
];

export const COMBOS: Record<ComboId, ComboAward> = {
  SMOKEHOUSE: COMBO_DEFINITIONS[0]!,
  HOT_AND_DECADENT: COMBO_DEFINITIONS[1]!,
  CRUNCH_CONTRAST: COMBO_DEFINITIONS[2]!,
  CHEFS_PRIDE: COMBO_DEFINITIONS[3]!,
};

export const COMBO_LIST = COMBO_DEFINITIONS;
