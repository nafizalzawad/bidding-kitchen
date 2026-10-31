import type { Ingredient, Match, Player } from '../types/models.js';

export type BotArchetype = 'RANDOM' | 'GREEDY' | 'COMBO';

export interface BotDecision {
  ingredientId: string;
  amount: number;
}

export interface BotPlayer {
  id: string;
  nickname: string;
  archetype: BotArchetype;
  decideBid(match: Match, playerId: string, prng: () => number): BotDecision;
}

/**
 * Random Bot:
 * Chooses an affordable ingredient uniformly at random and bids between base price and base price + 3.
 */
export function decideRandomBot(match: Match, player: Player, prng: () => number): BotDecision {
  const currentRound = match.rounds[match.roundIndex]!;
  const affordable = currentRound.availableIngredients.filter(
    (i) => i.basePrice <= player.budget,
  );

  const chosen =
    affordable.length > 0
      ? affordable[Math.floor(prng() * affordable.length)]!
      : currentRound.availableIngredients.find((i) => i.isBasic)!;

  const maxExtra = Math.min(3, player.budget - chosen.basePrice);
  const extra = maxExtra > 0 ? Math.floor(prng() * (maxExtra + 1)) : 0;

  return {
    ingredientId: chosen.id,
    amount: chosen.basePrice + extra,
  };
}

/**
 * Greedy Taste Bot:
 * Prioritizes high taste scores with slight tactical variation in bid margins.
 */
export function decideGreedyBot(match: Match, player: Player, prng: () => number): BotDecision {
  const currentRound = match.rounds[match.roundIndex]!;
  const affordable = currentRound.availableIngredients.filter(
    (i) => i.basePrice <= player.budget,
  );

  if (affordable.length === 0) {
    const basic = currentRound.availableIngredients.find((i) => i.isBasic)!;
    return { ingredientId: basic.id, amount: basic.basePrice };
  }

  // Sort by tasteScore with small jitter for tie-breaking
  const sorted = [...affordable].sort((a, b) => {
    const scoreA = a.tasteScore + (prng() * 0.2 - 0.1);
    const scoreB = b.tasteScore + (prng() * 0.2 - 0.1);
    return scoreB - scoreA;
  });

  const best = sorted[0]!;
  const maxExtra = Math.min(2, player.budget - best.basePrice);
  const roll = prng();
  const extra = maxExtra > 0 ? (roll < 0.5 ? 1 : roll < 0.8 ? 2 : 0) : 0;

  return {
    ingredientId: best.id,
    amount: best.basePrice + Math.min(extra, maxExtra),
  };
}

/**
 * Combo Value Bot:
 * Calculates synergistic flavor and customer order value, conserving budget on early rounds
 * and contesting high-synergy pieces.
 */
export function decideComboBot(match: Match, player: Player, prng: () => number): BotDecision {
  const currentRound = match.rounds[match.roundIndex]!;
  const affordable = currentRound.availableIngredients.filter(
    (i) => i.basePrice <= player.budget,
  );

  if (affordable.length === 0) {
    const basic = currentRound.availableIngredients.find((i) => i.isBasic)!;
    return { ingredientId: basic.id, amount: basic.basePrice };
  }

  const existingTags = player.dish.flatMap((d) => d.ingredient.tags);
  const order = player.secretOrder;

  function evaluateUtility(item: Ingredient): number {
    let utility = item.tasteScore;

    // Combo potential
    const tags = item.tags;
    if (tags.includes('SMOKY') && existingTags.includes('SMOKY')) {
      utility += 4;
    }
    if (
      (tags.includes('SPICY') && existingTags.includes('RICH')) ||
      (tags.includes('RICH') && existingTags.includes('SPICY'))
    ) {
      utility += 3;
    }
    if (
      (tags.includes('CRISPY') && existingTags.includes('FRESH')) ||
      (tags.includes('FRESH') && existingTags.includes('CRISPY'))
    ) {
      utility += 3;
    }

    // Customer order synergy
    if (order && order.requiredTags) {
      if (tags.some((t) => order.requiredTags?.includes(t))) {
        utility += 3.5;
      }
    }

    // Preserve budget on slot 0 (BUN) so we have money for Wagyu ($8) or Truffle ($3)
    if (match.roundIndex === 0 && item.basePrice > 2) {
      utility -= 2.0;
    }

    return utility;
  }

  const scored = affordable.map((item) => ({
    item,
    utility: evaluateUtility(item) + (prng() * 0.4 - 0.2),
  }));

  scored.sort((a, b) => b.utility - a.utility);

  const best = scored[0]!.item;
  const isHighSynergy = scored[0]!.utility >= 7;
  const maxExtra = Math.min(2, player.budget - best.basePrice);
  const roll = prng();
  const extra = maxExtra > 0 ? (isHighSynergy ? (roll < 0.6 ? 2 : 1) : roll < 0.3 ? 1 : 0) : 0;

  return {
    ingredientId: best.id,
    amount: best.basePrice + Math.min(extra, maxExtra),
  };
}

export function createBot(id: string, nickname: string, archetype: BotArchetype): BotPlayer {
  return {
    id,
    nickname,
    archetype,
    decideBid(match: Match, playerId: string, prng: () => number): BotDecision {
      const player = match.players.find((p) => p?.id === playerId);
      if (!player) {
        throw new Error(`Player ${playerId} not found`);
      }

      switch (archetype) {
        case 'RANDOM':
          return decideRandomBot(match, player, prng);
        case 'GREEDY':
          return decideGreedyBot(match, player, prng);
        case 'COMBO':
          return decideComboBot(match, player, prng);
      }
    },
  };
}
