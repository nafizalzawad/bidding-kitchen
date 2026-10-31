import type { AwardedIngredient, Ingredient, ScoreBreakdown } from '../types/models.js';

/**
 * Extracts raw ingredients whether input is AwardedIngredient[] or Ingredient[].
 */
function extractIngredients(items: (AwardedIngredient | Ingredient)[]): Ingredient[] {
  return items.map((item) => ('ingredient' in item ? item.ingredient : item));
}

/**
 * Deterministically generates a flavorful culinary dish name from burger ingredients.
 */
export function generateDishName(items: (AwardedIngredient | Ingredient)[]): string {
  const ingredients = extractIngredients(items);
  const ids = new Set(ingredients.map((i) => i.id));
  const tags = ingredients.flatMap((i) => i.tags);

  const isWagyu = ids.has('street_patty_wagyu');
  const isSmash = ids.has('street_patty_smash');
  const isBrioche = ids.has('street_bun_brioche');
  const isTruffle = ids.has('street_sauce_truffle_mayo');
  const isBacon = ids.has('street_topping_bacon');
  const isCrispyOnions = ids.has('street_topping_crispy_onions');
  const isJalapeno = ids.has('street_topping_jalapenos');
  const isBlueCheese = ids.has('street_cheese_blue');
  const isCheddar = ids.has('street_cheese_cheddar');
  const isAllBasic = ingredients.every((i) => i.isBasic);

  if (isAllBasic) {
    return 'The Humble Street Burger';
  }

  if (isWagyu && isTruffle) {
    return 'The Truffle Wagyu Reserve';
  }

  if (isWagyu && isBrioche) {
    return 'The Imperial Wagyu Deluxe';
  }

  if (isBacon && isSmash && isCheddar) {
    return 'The Bacon Smash Royale';
  }

  if (isJalapeno && ids.has('street_sauce_spicy_bbq')) {
    return 'The Fiery Jalapeno Inferno';
  }

  if (isBlueCheese && isBacon) {
    return 'The Smoky Blue Beast';
  }

  if (isCrispyOnions && isSmash) {
    return 'The Crispy Crunch Smash';
  }

  if (tags.filter((t) => t === 'SMOKY').length >= 2) {
    return 'The Smokehouse Kingpin';
  }

  if (tags.filter((t) => t === 'RICH').length >= 2) {
    return 'The Rich Gilded Stack';
  }

  if (tags.filter((t) => t === 'SPICY').length >= 2) {
    return 'The Firebrand Pepper Burger';
  }

  if (tags.filter((t) => t === 'CRISPY').length >= 2) {
    return 'The Crisp & Golden Cruncher';
  }

  if (isBrioche) {
    return 'The Golden Brioche Classic';
  }

  return 'The Signature Artisan Burger';
}

/**
 * Assigns an honorary title to the winner based on their match performance.
 */
export function generateWinnerTitle(score: ScoreBreakdown): string {
  if (score.orderCompleted && score.comboPoints >= 6) {
    return 'Grand Master Chef';
  }

  if (score.comboPoints >= 6) {
    return 'Flavor Alchemist';
  }

  if (score.leftoverMoneyBonus >= 3 && score.orderCompleted) {
    return 'Efficiency Virtuoso';
  }

  if (score.leftoverMoneyBonus >= 3) {
    return 'Frugal Gourmet';
  }

  if (score.tastePoints >= 20) {
    return 'Taste Monarch';
  }

  if (score.orderCompleted) {
    return 'Customer Favorite';
  }

  return 'Burger Champion';
}
