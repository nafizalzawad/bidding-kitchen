import type { BotDifficulty, Ingredient, Match, Player } from '../types/models.js';

export type BotArchetype = 'RANDOM' | 'GREEDY' | 'COMBO' | 'SMART_BLUFF';

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

export function decideGreedyBot(match: Match, player: Player, prng: () => number): BotDecision {
  const currentRound = match.rounds[match.roundIndex]!;
  const affordable = currentRound.availableIngredients.filter(
    (i) => i.basePrice <= player.budget,
  );

  if (affordable.length === 0) {
    const basic = currentRound.availableIngredients.find((i) => i.isBasic)!;
    return { ingredientId: basic.id, amount: basic.basePrice };
  }

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

    if (order && order.requiredTags) {
      if (tags.some((t) => order.requiredTags?.includes(t))) {
        utility += 3.5;
      }
    }

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

/**
 * Smart Bluff Bot:
 * Models a realistic competitive human player who:
 * 1. Has strategic build inclinations (Smokehouse, Crunch Contrast, Hot & Decadent, or Balanced).
 * 2. Evaluates net taste score plus combo potential relative to leftover budget.
 * 3. Understands Round 1 budget conservation: spending $4 on Brioche weakens Round 2 tiebreaks and purchasing power.
 * 4. Applies stochastic bluffing variance on contested items.
 */
export function decideSmartBluffBot(match: Match, player: Player, prng: () => number): BotDecision {
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

  // Determine player's build inclination for this match based on seed and player id
  // 0: Smokehouse (SMOKY), 1: Crunch Contrast (CRISPY + FRESH), 2: Hot & Decadent (RICH + SPICY), 3: Budget Value
  const seedHash = (match.seed + (player.seat === 0 ? 17 : 89)) % 4;

  function evaluateItemValue(item: Ingredient): number {
    // Net point value above leftover cash (0.5 pts per $1 saved)
    let netValue = item.tasteScore - item.basePrice * 0.5;

    const tags = item.tags;

    // Completed combos from existing tags
    if (tags.includes('SMOKY') && existingTags.includes('SMOKY')) {
      netValue += 4.0;
    }
    if (
      (tags.includes('SPICY') && existingTags.includes('RICH')) ||
      (tags.includes('RICH') && existingTags.includes('SPICY'))
    ) {
      netValue += 3.0;
    }
    if (
      (tags.includes('CRISPY') && existingTags.includes('FRESH')) ||
      (tags.includes('FRESH') && existingTags.includes('CRISPY'))
    ) {
      netValue += 3.0;
    }

    // Build inclination synergy (human intention before combos complete)
    if (seedHash === 0 && tags.includes('SMOKY')) {
      netValue += 2.2;
    } else if (seedHash === 1 && (tags.includes('CRISPY') || tags.includes('FRESH'))) {
      netValue += 2.2;
    } else if (seedHash === 2 && (tags.includes('RICH') || tags.includes('SPICY'))) {
      netValue += 2.0;
    } else if (seedHash === 3 && item.basePrice === 1) {
      // Budget Value / Chef's Pride builder: loves cheap $1 utility fillers (American cheese, Ketchup, Lettuce)
      netValue += 2.2;
    }

    // Customer Order synergy
    if (order && order.requiredTags) {
      if (tags.some((t) => order.requiredTags?.includes(t))) {
        netValue += 2.5;
      }
    }

    // Round 1 (BUN / DOUGH) Budget Conservation:
    // Human players recognize spending $4+ on Bun/Dough limits purchasing power on the main course.
    if (item.slot === 'BUN' || item.slot === 'DOUGH') {
      if (item.basePrice >= 4) {
        netValue -= 1.6;
      } else if (item.basePrice === 2 || item.basePrice === 3) {
        netValue += 0.4;
      }
    }

    return netValue;
  }

  const scored = affordable.map((item) => ({
    item,
    score: evaluateItemValue(item) + (prng() * 1.8 - 0.9),
  }));

  scored.sort((a, b) => b.score - a.score);
  const chosen = scored[0]!.item;

  // Stochastic bluffing & margin bidding:
  // Contested slots: Round 1 (PATTY), Round 2 (SAUCE), Round 4 (TOPPING)
  const isContestedSlot = match.roundIndex === 1 || match.roundIndex === 2 || match.roundIndex === 4;
  const maxExtra = Math.max(0, player.budget - chosen.basePrice);

  let extra = 0;
  if (maxExtra > 0 && !chosen.isBasic) {
    const roll = prng();
    if (isContestedSlot) {
      if (roll < 0.45) extra = 0;
      else if (roll < 0.85) extra = 1;
      else extra = Math.min(2, maxExtra);
    } else {
      if (roll < 0.65) extra = 0;
      else extra = Math.min(1, maxExtra);
    }
  }

  return {
    ingredientId: chosen.id,
    amount: chosen.basePrice + extra,
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
        case 'SMART_BLUFF':
          return decideSmartBluffBot(match, player, prng);
      }
    },
  };
}

export function getBotArchetype(difficulty: BotDifficulty): BotArchetype {
  switch (difficulty) {
    case 'EASY':
      return 'RANDOM';
    case 'MEDIUM':
      return 'GREEDY';
    case 'HARD':
      return 'SMART_BLUFF';
  }
}

export function getBotNickname(difficulty: BotDifficulty): string {
  switch (difficulty) {
    case 'EASY':
      return 'Chef Bot (Easy)';
    case 'MEDIUM':
      return 'Chef Bot (Medium)';
    case 'HARD':
      return 'Chef Bot (Hard)';
  }
}

export function getBotThinkDelay(difficulty: BotDifficulty, timerScale = 1.0): number {
  let baseMs: number;
  switch (difficulty) {
    case 'EASY':
      baseMs = 2200;
      break;
    case 'MEDIUM':
      baseMs = 1800;
      break;
    case 'HARD':
      baseMs = 1200;
      break;
  }
  return Math.max(20, Math.round(baseMs * timerScale));
}
