import { COMBO_DEFINITIONS } from '../data/combos.js';
import type {
  AwardedIngredient,
  ComboAward,
  Ingredient,
  PublicMatchView,
  PublicPlayerView,
} from '../types/models.js';

/**
 * Returns the viewer's PublicPlayerView from PublicMatchView.
 * Throws if the player is not found.
 */
export function getMyPlayerFromView(view: PublicMatchView): PublicPlayerView {
  const player = view.players.find((p) => p !== null && p.id === view.myPlayerId);
  if (!player) {
    throw new Error(`Player with id "${view.myPlayerId}" not found in match view`);
  }
  return player;
}

/**
 * Returns the opponent PublicPlayerView from PublicMatchView, or null if the seat is empty.
 */
export function getOpponentPlayerFromView(view: PublicMatchView): PublicPlayerView | null {
  const opponent = view.players.find((p) => p !== null && p.id !== view.myPlayerId);
  return opponent ?? null;
}

/**
 * Computes remaining milliseconds for the current match state, neutralizing clock drift.
 * Math.max(0, view.stateDeadlineAt - (clientNowMs + clockOffsetMs))
 */
export function getRemainingStateMs(
  view: PublicMatchView,
  clientNowMs: number,
  clockOffsetMs: number,
): number {
  const estimatedServerNow = clientNowMs + clockOffsetMs;
  return Math.max(0, view.stateDeadlineAt - estimatedServerNow);
}

/**
 * Evaluates live progress toward all 4 canonical Street combos for a given dish.
 */
export function getComboProgressForDish(
  dish: AwardedIngredient[],
  expectedRoundsCount = 5,
): Array<{ combo: ComboAward; earned: boolean; progressText: string }> {
  const ingredients = dish.map((d) => d.ingredient);
  const tags = ingredients.flatMap((i) => i.tags);

  return COMBO_DEFINITIONS.map((combo) => {
    switch (combo.id) {
      case 'SMOKEHOUSE': {
        const smokyCount = tags.filter((t) => t === 'SMOKY').length;
        const earned = smokyCount >= 2;
        return {
          combo,
          earned,
          progressText: `Smoky: ${smokyCount}/2`,
        };
      }
      case 'HOT_AND_DECADENT': {
        const hasSpicy = tags.includes('SPICY');
        const hasRich = tags.includes('RICH');
        const earned = hasSpicy && hasRich;
        return {
          combo,
          earned,
          progressText: `Spicy: ${hasSpicy ? 'Yes' : 'No'}, Rich: ${hasRich ? 'Yes' : 'No'}`,
        };
      }
      case 'CRUNCH_CONTRAST': {
        const hasCrispy = tags.includes('CRISPY');
        const hasFresh = tags.includes('FRESH');
        const earned = hasCrispy && hasFresh;
        return {
          combo,
          earned,
          progressText: `Crispy: ${hasCrispy ? 'Yes' : 'No'}, Fresh: ${hasFresh ? 'Yes' : 'No'}`,
        };
      }
      case 'CHEFS_PRIDE': {
        const basicCount = ingredients.filter((i) => i.isBasic).length;
        const isComplete = dish.length >= expectedRoundsCount;
        const earned = isComplete && basicCount === 0;
        return {
          combo,
          earned,
          progressText: `Basic used: ${basicCount}`,
        };
      }
      default: {
        return {
          combo,
          earned: false,
          progressText: 'In progress',
        };
      }
    }
  });
}

/**
 * Checks whether an ingredient is affordable with the given budget.
 */
export function isVariantAffordable(variant: Ingredient, budget: number): boolean {
  if (variant.isBasic) return true;
  return budget >= variant.basePrice;
}
