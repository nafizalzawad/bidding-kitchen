import { resolveRound } from '../engine/bid-resolver.js';
import {
  addPlayerToMatch,
  createMatch,
  finalizeMatch,
  setPlayerReady,
  startRound,
  submitBid,
} from '../engine/match-engine.js';
import { createPrng } from '../engine/prng.js';
import type { ComboId, Match, MatchConfig, Result } from '../types/models.js';
import { createBot, type BotArchetype, type BotPlayer } from './bots.js';

export interface SimulationReport {
  matchCount: number;
  botAArchetype: BotArchetype;
  botBArchetype: BotArchetype;
  botAWins: number;
  botBWins: number;
  ties: number;
  winRateA: number;
  winRateB: number;
  avgScoreA: number;
  avgScoreB: number;
  avgSpentA: number;
  avgSpentB: number;
  totalCollisions: number;
  collisionRate: number;
  round1WinnerMatchWinRate: number;
  round1TiedMatches: number;
  round1DecidedMatches: number;
  ingredientPickRates: Record<string, number>;
  ingredientWinRates: Record<string, number>;
  comboFrequencies: Record<ComboId, number>;
  leftoverMoneyStats: {
    mean: number;
    median: number;
    min: number;
    max: number;
  };
  scorePercentiles: {
    p10: number;
    p25: number;
    p50: number;
    p75: number;
    p90: number;
  };
  elapsedMs: number;
  customerOrderCompletionRate?: number;
  chefsTipTriggerRate?: number;
}

/**
 * Simulates a single 5-round match between two bots from start to finish.
 */
export function simulateSingleMatch(
  botA: BotPlayer,
  botB: BotPlayer,
  seed: number,
  config?: Partial<MatchConfig>,
): { match: Match; result: Result } {
  const prng = createPrng(seed);
  let match = createMatch({
    seed,
    tier: (config as any)?.tier,
    config,
    now: 1000,
  });

  match = addPlayerToMatch(match, { id: botA.id, nickname: botA.nickname });
  match = addPlayerToMatch(match, { id: botB.id, nickname: botB.nickname });
  match = setPlayerReady(match, botA.id, 1050);
  match = setPlayerReady(match, botB.id, 1100);

  const p0 = match.players[0]!;
  const p1 = match.players[1]!;

  for (let r = 0; r < match.rounds.length; r++) {
    match = startRound(match, r, 2000 + r * 10000);

    const decisionA = botA.decideBid(match, p0.id, prng);
    const decisionB = botB.decideBid(match, p1.id, prng);

    const bidA = {
      roundIndex: r,
      ingredientId: decisionA.ingredientId,
      amount: decisionA.amount,
      lockedAt: 2000 + r * 10000 + 500,
    };
    const bidB = {
      roundIndex: r,
      ingredientId: decisionB.ingredientId,
      amount: decisionB.amount,
      lockedAt: 2000 + r * 10000 + 600,
    };

    match = submitBid(match, p0.id, bidA, bidA.lockedAt).match;
    match = submitBid(match, p1.id, bidB, bidB.lockedAt).match;

    const resolutionResult = resolveRound(match);
    match = resolutionResult.updatedMatch;
  }

  match = finalizeMatch(match);

  return {
    match,
    result: match.result!,
  };
}

export interface RunSimulationOptions {
  matchCount: number;
  botA: BotArchetype;
  botB: BotArchetype;
  baseSeed?: number;
  config?: Partial<MatchConfig>;
}

/**
 * Runs a batch simulation of N matches and produces a statistical balance report.
 */
export function runSimulation(options: RunSimulationOptions): SimulationReport {
  const startTime = Date.now();
  const baseSeed = options.baseSeed ?? 2026;
  const botA = createBot('bot_p0', `Bot_${options.botA}`, options.botA);
  const botB = createBot('bot_p1', `Bot_${options.botB}`, options.botB);

  let botAWins = 0;
  let botBWins = 0;
  let ties = 0;

  let totalScoreA = 0;
  let totalScoreB = 0;
  let totalSpentA = 0;
  let totalSpentB = 0;

  let totalCollisions = 0;
  let round1WinnerWonMatch = 0;
  let round1DecidedMatches = 0;
  let round1TiedMatches = 0;
  let totalCustomerOrdersCompleted = 0;
  let totalChefsTipsTriggered = 0;
  let roundsPerMatch = 5;

  const ingredientPicks: Record<string, number> = {};
  const ingredientWins: Record<string, number> = {};
  const comboFrequencies: Record<ComboId, number> = {
    SMOKEHOUSE: 0,
    HOT_AND_DECADENT: 0,
    CRUNCH_CONTRAST: 0,
    CHEFS_PRIDE: 0,
  };

  const allScores: number[] = [];
  const allLeftovers: number[] = [];

  for (let i = 0; i < options.matchCount; i++) {
    const seed = (baseSeed + i * 31) >>> 0;
    const { match, result } = simulateSingleMatch(botA, botB, seed, options.config);

    roundsPerMatch = match.rounds.length;

    const scoreA = result.scoresByPlayer[botA.id]!;
    const scoreB = result.scoresByPlayer[botB.id]!;

    totalScoreA += scoreA.finalScore;
    totalScoreB += scoreB.finalScore;
    totalSpentA += scoreA.totalSpent;
    totalSpentB += scoreB.totalSpent;

    const p0 = match.players[0]!;
    const p1 = match.players[1]!;

    allScores.push(scoreA.finalScore, scoreB.finalScore);
    allLeftovers.push(p0.budget, p1.budget);

    if (scoreA.orderCompleted) totalCustomerOrdersCompleted++;
    if (scoreB.orderCompleted) totalCustomerOrdersCompleted++;

    if (result.winnerId === botA.id) {
      botAWins++;
    } else if (result.winnerId === botB.id) {
      botBWins++;
    } else {
      ties++;
    }

    // Collisions & Chef's Tip
    let matchHadChefsTip = false;
    for (const res of result.roundHistory) {
      if (res.outcomeType !== 'NO_COLLISION') {
        totalCollisions++;
      }
      if (res.chefsTipAwardedToPlayerId) {
        matchHadChefsTip = true;
      }
    }
    if (matchHadChefsTip) {
      totalChefsTipsTriggered++;
    }

    // Round 1 winner correlation:
    // When both players pick plain bun ($0) or have identical taste scores,
    // classify as "Tied Round 1" so firstRoundWinnerWinRate measures matches with a distinct Round-1 leader.
    const r1 = result.roundHistory[0];
    if (r1) {
      const p0Award = r1.awardsByPlayer[botA.id];
      const p1Award = r1.awardsByPlayer[botB.id];
      if (p0Award && p1Award) {
        if (
          (p0Award.ingredient.isBasic && p1Award.ingredient.isBasic) ||
          p0Award.ingredient.tasteScore === p1Award.ingredient.tasteScore
        ) {
          round1TiedMatches++;
        } else {
          const r1WinnerId =
            p0Award.ingredient.tasteScore > p1Award.ingredient.tasteScore
              ? botA.id
              : botB.id;

          round1DecidedMatches++;
          if (r1WinnerId === result.winnerId) {
            round1WinnerWonMatch++;
          }
        }
      }
    }

    // Ingredient and combo stats
    for (const d of p0.dish) {
      ingredientPicks[d.ingredient.id] = (ingredientPicks[d.ingredient.id] ?? 0) + 1;
      if (result.winnerId === botA.id) {
        ingredientWins[d.ingredient.id] = (ingredientWins[d.ingredient.id] ?? 0) + 1;
      }
    }
    for (const d of p1.dish) {
      ingredientPicks[d.ingredient.id] = (ingredientPicks[d.ingredient.id] ?? 0) + 1;
      if (result.winnerId === botB.id) {
        ingredientWins[d.ingredient.id] = (ingredientWins[d.ingredient.id] ?? 0) + 1;
      }
    }

    for (const c of scoreA.combos) {
      comboFrequencies[c.id] = (comboFrequencies[c.id] ?? 0) + 1;
    }
    for (const c of scoreB.combos) {
      comboFrequencies[c.id] = (comboFrequencies[c.id] ?? 0) + 1;
    }
  }

  const ingredientPickRates: Record<string, number> = {};
  const ingredientWinRates: Record<string, number> = {};

  for (const [id, count] of Object.entries(ingredientPicks)) {
    ingredientPickRates[id] = count / (options.matchCount * 2);
    ingredientWinRates[id] = count > 0 ? (ingredientWins[id] ?? 0) / count : 0;
  }

  // Calculate score percentiles
  allScores.sort((a, b) => a - b);
  const scorePercentiles = {
    p10: allScores[Math.floor(allScores.length * 0.1)] ?? 0,
    p25: allScores[Math.floor(allScores.length * 0.25)] ?? 0,
    p50: allScores[Math.floor(allScores.length * 0.5)] ?? 0,
    p75: allScores[Math.floor(allScores.length * 0.75)] ?? 0,
    p90: allScores[Math.floor(allScores.length * 0.9)] ?? 0,
  };

  // Calculate leftover money distribution
  allLeftovers.sort((a, b) => a - b);
  const totalLeftover = allLeftovers.reduce((sum, v) => sum + v, 0);
  const leftoverMoneyStats = {
    mean: allLeftovers.length > 0 ? totalLeftover / allLeftovers.length : 0,
    median: allLeftovers[Math.floor(allLeftovers.length * 0.5)] ?? 0,
    min: allLeftovers[0] ?? 0,
    max: allLeftovers[allLeftovers.length - 1] ?? 0,
  };

  const elapsedMs = Date.now() - startTime;
  const totalRounds = options.matchCount * roundsPerMatch;

  return {
    matchCount: options.matchCount,
    botAArchetype: options.botA,
    botBArchetype: options.botB,
    botAWins,
    botBWins,
    ties,
    winRateA: botAWins / options.matchCount,
    winRateB: botBWins / options.matchCount,
    avgScoreA: totalScoreA / options.matchCount,
    avgScoreB: totalScoreB / options.matchCount,
    avgSpentA: totalSpentA / options.matchCount,
    avgSpentB: totalSpentB / options.matchCount,
    totalCollisions,
    collisionRate: totalCollisions / totalRounds,
    round1WinnerMatchWinRate:
      round1DecidedMatches > 0 ? round1WinnerWonMatch / round1DecidedMatches : 0.5,
    round1TiedMatches,
    round1DecidedMatches,
    ingredientPickRates,
    ingredientWinRates,
    comboFrequencies,
    leftoverMoneyStats,
    scorePercentiles,
    elapsedMs,
    customerOrderCompletionRate: totalCustomerOrdersCompleted / (options.matchCount * 2),
    chefsTipTriggerRate: totalChefsTipsTriggered / options.matchCount,
  };
}
