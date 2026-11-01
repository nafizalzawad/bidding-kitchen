import { COMBO_DEFINITIONS } from '../data/combos.js';
import type {
  AwardedIngredient,
  Bid,
  ComboAward,
  Ingredient,
  PublicMatchView,
  PublicPlayerView,
  RoundResolution,
} from '../types/models.js';

export interface ResolutionCue {
  myBid: Bid | undefined;
  opponentBid: Bid | undefined;
  myAward: AwardedIngredient | undefined;
  opponentAward: AwardedIngredient | undefined;
  budgetDelta: number;
  isCollision: boolean;
  didIWinCollision: boolean;
  soundCue: 'CASH_WIN' | 'FALLBACK_BOOP' | 'BASIC_FREE';
  bannerTitle: string;
  bannerSubtitle: string;
}

/**
 * Computes round-over-round animation deltas, outcome category, sound cue,
 * and presentation banner microcopy for a given player based on RoundResolution.
 */
export function getResolutionCueForPlayer(
  resolution: RoundResolution,
  playerId: string,
): ResolutionCue {
  const myBid = resolution.bidsByPlayer[playerId];
  const opponentPlayerId = Object.keys(resolution.bidsByPlayer).find((id) => id !== playerId);
  const opponentBid = opponentPlayerId ? resolution.bidsByPlayer[opponentPlayerId] : undefined;

  const myAward = resolution.awardsByPlayer[playerId];
  const opponentAward = opponentPlayerId ? resolution.awardsByPlayer[opponentPlayerId] : undefined;

  const budgetBefore = resolution.budgetsBeforeRound[playerId] ?? 0;
  const budgetAfter = resolution.budgetsAfterRound[playerId] ?? 0;
  const budgetDelta = budgetAfter - budgetBefore;

  const isCollision = resolution.outcomeType !== 'NO_COLLISION';
  const didIWinCollision =
    isCollision &&
    Boolean(
      myAward &&
        (myAward.wonVia === 'HIGH_BID' ||
          myAward.wonVia === 'TIEBREAK_BUDGET' ||
          myAward.wonVia === 'TIEBREAK_COINFLIP'),
    );

  let soundCue: 'CASH_WIN' | 'FALLBACK_BOOP' | 'BASIC_FREE';
  if (myAward?.wonVia === 'FALLBACK_LOSS' || myAward?.wonVia === 'TIMEOUT_BASIC') {
    soundCue = 'FALLBACK_BOOP';
  } else if (myAward?.ingredient.isBasic && myAward.pricePaid === 0) {
    soundCue = 'BASIC_FREE';
  } else {
    soundCue = 'CASH_WIN';
  }

  let bannerTitle = '';
  let bannerSubtitle = '';

  if (isCollision) {
    if (didIWinCollision) {
      bannerTitle = 'You Outbid Opponent!';
      bannerSubtitle = `Won ${myAward?.ingredient.name ?? 'Ingredient'} for $${myAward?.pricePaid ?? 0}!`;
    } else {
      const oppItemName = opponentAward?.ingredient.name ?? 'Ingredient';
      bannerTitle = `Outbid on ${oppItemName}!`;
      const fallbackName = myAward?.ingredient.name ?? 'Item';
      const fallbackLabel = fallbackName.toLowerCase().startsWith('basic')
        ? fallbackName
        : `Basic ${fallbackName}`;
      bannerSubtitle = `Kept your cash & took free ${fallbackLabel} ($0).`;
    }
  } else {
    if (myAward?.ingredient.isBasic) {
      bannerTitle = 'Basic Item Claimed';
      bannerSubtitle = `Plated ${myAward.ingredient.name} for $0.`;
    } else {
      bannerTitle = 'Uncontested Win!';
      bannerSubtitle = `Won ${myAward?.ingredient.name ?? 'Ingredient'} for $${myAward?.pricePaid ?? 0}!`;
    }
  }

  if (resolution.chefsTipAwardedToPlayerId === playerId) {
    bannerSubtitle += " + $2 Chef's Tip!";
  }

  return {
    myBid,
    opponentBid,
    myAward,
    opponentAward,
    budgetDelta,
    isCollision,
    didIWinCollision,
    soundCue,
    bannerTitle,
    bannerSubtitle,
  };
}

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
