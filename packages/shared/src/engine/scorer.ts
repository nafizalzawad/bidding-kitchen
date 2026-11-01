import { COMBO_DEFINITIONS } from '../data/combos.js';
import type {
  AwardedIngredient,
  ComboAward,
  CustomerOrder,
  Ingredient,
  Match,
  Player,
  Result,
  ScoreBreakdown,
} from '../types/models.js';
import { generateDishName, generateWinnerTitle } from './dish-namer.js';
import { coinFlip } from './prng.js';

function extractIngredients(items: (AwardedIngredient | Ingredient)[]): Ingredient[] {
  return items.map((item) => ('ingredient' in item ? item.ingredient : item));
}

/**
 * Evaluates completed combos on a set of ingredients.
 */
export function evaluateCombos(items: (AwardedIngredient | Ingredient)[]): ComboAward[] {
  const ingredients = extractIngredients(items);
  const tags = ingredients.flatMap((i) => i.tags);
  const awarded: ComboAward[] = [];

  // SMOKEHOUSE: 2 or more Smoky items
  const smokyCount = tags.filter((t) => t === 'SMOKY').length;
  if (smokyCount >= 2) {
    const def = COMBO_DEFINITIONS.find((c) => c.id === 'SMOKEHOUSE');
    if (def) awarded.push(def);
  }

  // HOT_AND_DECADENT: At least 1 Spicy and 1 Rich item
  const hasSpicy = tags.includes('SPICY');
  const hasRich = tags.includes('RICH');
  if (hasSpicy && hasRich) {
    const def = COMBO_DEFINITIONS.find((c) => c.id === 'HOT_AND_DECADENT');
    if (def) awarded.push(def);
  }

  // CRUNCH_CONTRAST: At least 1 Crispy and 1 Fresh item
  const hasCrispy = tags.includes('CRISPY');
  const hasFresh = tags.includes('FRESH');
  if (hasCrispy && hasFresh) {
    const def = COMBO_DEFINITIONS.find((c) => c.id === 'CRUNCH_CONTRAST');
    if (def) awarded.push(def);
  }

  // CHEFS_PRIDE: Complete dish (>= 5 slots) with 0 basic fallback ingredients used
  if (ingredients.length >= 5 && ingredients.every((i) => !i.isBasic)) {
    const def = COMBO_DEFINITIONS.find((c) => c.id === 'CHEFS_PRIDE');
    if (def) awarded.push(def);
  }

  return awarded;
}

/**
 * Checks whether the secret customer order is satisfied.
 */
export function evaluateCustomerOrder(
  order: CustomerOrder | null,
  items: (AwardedIngredient | Ingredient)[],
): { completed: boolean; bonusPoints: number } {
  if (!order) {
    return { completed: false, bonusPoints: 0 };
  }

  const ingredients = extractIngredients(items);

  if (order.forbiddenSlotNonBasic) {
    const slotItem = ingredients.find(
      (i) =>
        i.slot === order.forbiddenSlotNonBasic ||
        (order.forbiddenSlotNonBasic === 'CHEESE' && i.slot === 'PIZZA_CHEESE'),
    );
    const satisfied = !slotItem || slotItem.isBasic;
    return {
      completed: satisfied,
      bonusPoints: satisfied ? order.bonusPoints : 0,
    };
  }

  if (order.requiredTags && order.minTagCount) {
    const matchingCount = ingredients.filter((i) =>
      i.tags.some((t) => order.requiredTags?.includes(t)),
    ).length;
    const satisfied = matchingCount >= order.minTagCount;
    return {
      completed: satisfied,
      bonusPoints: satisfied ? order.bonusPoints : 0,
    };
  }

  return { completed: false, bonusPoints: 0 };
}

/**
 * Calculates a player's complete final score breakdown according to MVP rules:
 * Final Score = Taste Points + Combo Bonuses + Customer Order Bonus + round(Leftover Budget * 0.5)
 */
export function calculatePlayerScore(
  player: Player,
  order?: CustomerOrder | null,
): ScoreBreakdown {
  const ingredients = player.dish.map((d) => d.ingredient);
  const tastePoints = ingredients.reduce((sum, item) => sum + item.tasteScore, 0);

  const combos = evaluateCombos(player.dish);
  const comboPoints = combos.reduce((sum, c) => sum + c.points, 0);

  const targetOrder = order !== undefined ? order : player.secretOrder;
  const orderResult = evaluateCustomerOrder(targetOrder, player.dish);

  const leftoverBudget = player.budget;
  const leftoverMoneyRawBonus = leftoverBudget * 0.5;
  const leftoverMoneyBonus = Math.round(leftoverMoneyRawBonus);

  const totalSpent = player.dish.reduce((sum, d) => sum + d.pricePaid, 0);
  const finalScore = tastePoints + comboPoints + orderResult.bonusPoints + leftoverMoneyBonus;
  const dishName = generateDishName(player.dish);

  return {
    playerId: player.id,
    tastePoints,
    combos,
    comboPoints,
    orderCompleted: orderResult.completed,
    orderBonusPoints: orderResult.bonusPoints,
    leftoverBudget,
    leftoverMoneyRawBonus,
    leftoverMoneyBonus,
    totalSpent,
    finalScore,
    generatedDishName: dishName,
  };
}

/**
 * Determines match winner, resolving ties by lowest total spent, then seeded coinflip.
 */
export function calculateMatchResult(
  match: Match,
  p0Score: ScoreBreakdown,
  p1Score: ScoreBreakdown,
  seed: number,
): Result {
  const p0 = match.players[0]!;
  const p1 = match.players[1]!;

  let winnerId: string;
  let winReason: 'SCORE' | 'SPENT_LESS_TIEBREAK' | 'COINFLIP_TIEBREAK';
  let keyMomentText: string;

  if (p0Score.finalScore > p1Score.finalScore) {
    winnerId = p0.id;
    winReason = 'SCORE';
    keyMomentText = `${p0.nickname} dominated with a final score of ${p0Score.finalScore} vs ${p1Score.finalScore}.`;
  } else if (p1Score.finalScore > p0Score.finalScore) {
    winnerId = p1.id;
    winReason = 'SCORE';
    keyMomentText = `${p1.nickname} dominated with a final score of ${p1Score.finalScore} vs ${p0Score.finalScore}.`;
  } else {
    // Tiebreak 1: Lower total spent
    if (p0Score.totalSpent < p1Score.totalSpent) {
      winnerId = p0.id;
      winReason = 'SPENT_LESS_TIEBREAK';
      keyMomentText = `Tied at ${p0Score.finalScore} points! ${p0.nickname} broke the tie by spending less ($${p0Score.totalSpent} vs $${p1Score.totalSpent}).`;
    } else if (p1Score.totalSpent < p0Score.totalSpent) {
      winnerId = p1.id;
      winReason = 'SPENT_LESS_TIEBREAK';
      keyMomentText = `Tied at ${p1Score.finalScore} points! ${p1.nickname} broke the tie by spending less ($${p1Score.totalSpent} vs $${p0Score.totalSpent}).`;
    } else {
      // Tiebreak 2: Seeded coin flip
      const flip = coinFlip(seed, 999, 42);
      winnerId = flip === 0 ? p0.id : p1.id;
      winReason = 'COINFLIP_TIEBREAK';
      const winnerName = flip === 0 ? p0.nickname : p1.nickname;
      keyMomentText = `Deadlock at ${p0Score.finalScore} pts and $${p0Score.totalSpent} spent! ${winnerName} won the golden coin toss.`;
    }
  }

  const winnerScore = winnerId === p0.id ? p0Score : p1Score;
  const winnerTitle = generateWinnerTitle(winnerScore);

  const roundHistory = match.rounds
    .map((r) => r.resolution)
    .filter((res): res is NonNullable<typeof res> => res !== null);

  return {
    winnerId,
    winReason,
    forfeitedByPlayerId: null,
    winnerTitle,
    scoresByPlayer: {
      [p0.id]: p0Score,
      [p1.id]: p1Score,
    },
    roundHistory,
    keyMomentText,
  };
}
