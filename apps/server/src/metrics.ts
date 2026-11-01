import type { FastifyPluginAsync } from 'fastify';
import { STREET_INGREDIENTS, type Match } from '@bidding-kitchen/shared';

export interface ServerMetricsResponse {
  // 8 Core Product Metrics
  rematchRate: number;
  tutorialCompletions: number;
  avgTimeToFirstBidMs: number;
  firstRoundWinnerWinRate: number;
  ingredientPickCounts: Record<string, number>;
  avgLeftoverMoney: number;
  disconnectRate: number;
  avgRoundResolveMs: number;
  shareClicks: number;

  // Operational counters
  matchesCreated: number;
  matchesStarted: number;
  matchesCompleted: number;
  matchesForfeited: number;
  rematchesStarted: number;
  totalDisconnects: number;
  firstRoundWinnerWins: number;
  completedWithRound1Winner: number;
  bidsLockedTotal: number;
  autoTimeoutBidsTotal: number;
  roundResolveCount: number;
}

export class MetricsTracker {
  private matchesCreated = 0;
  private matchesStarted = 0;
  private matchesCompleted = 0;
  private matchesForfeited = 0;
  private rematchesStarted = 0;
  private tutorialCompletions = 0;
  private shareClicks = 0;
  private totalDisconnects = 0;

  private bidsLockedTotal = 0;
  private autoTimeoutBidsTotal = 0;

  private firstBidCount = 0;
  private totalTimeToFirstBidMs = 0;

  private roundResolveCount = 0;
  private totalRoundResolveDurationMs = 0;

  private firstRoundWinnerWins = 0;
  private completedWithRound1Winner = 0;

  private totalLeftoverMoney = 0;
  private totalCompletedPlayers = 0;

  private ingredientPickCounts: Record<string, number> = {};

  constructor() {
    this.resetIngredientPicks();
  }

  private resetIngredientPicks(): void {
    this.ingredientPickCounts = {};
    for (const ing of STREET_INGREDIENTS) {
      this.ingredientPickCounts[ing.id] = 0;
    }
  }

  public increment(
    key:
      | 'matchesCreated'
      | 'matchesStarted'
      | 'matchesCompleted'
      | 'matchesForfeited'
      | 'rematchesStarted'
      | 'tutorialCompletions'
      | 'shareClicks'
      | 'totalDisconnects'
      | 'bidsLockedTotal'
      | 'autoTimeoutBidsTotal'
      | 'firstBidCount',
    amount = 1
  ): void {
    switch (key) {
      case 'matchesCreated':
        this.matchesCreated += amount;
        break;
      case 'matchesStarted':
        this.matchesStarted += amount;
        break;
      case 'matchesCompleted':
        this.matchesCompleted += amount;
        break;
      case 'matchesForfeited':
        this.matchesForfeited += amount;
        break;
      case 'rematchesStarted':
        this.rematchesStarted += amount;
        break;
      case 'tutorialCompletions':
        this.tutorialCompletions += amount;
        break;
      case 'shareClicks':
        this.shareClicks += amount;
        break;
      case 'totalDisconnects':
        this.totalDisconnects += amount;
        break;
      case 'bidsLockedTotal':
        this.bidsLockedTotal += amount;
        break;
      case 'autoTimeoutBidsTotal':
        this.autoTimeoutBidsTotal += amount;
        break;
      case 'firstBidCount':
        this.firstBidCount += amount;
        break;
    }
  }

  public recordTimeToFirstBid(durationMs: number): void {
    if (durationMs >= 0) {
      this.firstBidCount += 1;
      this.totalTimeToFirstBidMs += durationMs;
    }
  }

  public recordRoundResolveDuration(durationMs: number): void {
    this.roundResolveCount += 1;
    this.totalRoundResolveDurationMs += durationMs;
  }

  public recordIngredientPick(ingredientId: string): void {
    if (this.ingredientPickCounts[ingredientId] !== undefined) {
      this.ingredientPickCounts[ingredientId] += 1;
    } else {
      this.ingredientPickCounts[ingredientId] = 1;
    }
  }

  public recordMatchCompleted(match: Match): void {
    this.matchesCompleted += 1;

    // Track leftover money from both players
    for (const player of match.players) {
      if (player) {
        this.totalLeftoverMoney += player.budget;
        this.totalCompletedPlayers += 1;

        // Record all picked ingredients in their dish
        for (const item of player.dish) {
          this.recordIngredientPick(item.ingredient.id);
        }
      }
    }

    // Check round 1 (index 0) winner vs overall winner
    const round0 = match.rounds[0];
    const awards = round0?.resolution?.awardsByPlayer;
    const p0Id = match.players[0]?.id;
    const p1Id = match.players[1]?.id;

    if (awards && p0Id && p1Id) {
      const p0Award = awards[p0Id];
      const p1Award = awards[p1Id];

      if (p0Award && p1Award) {
        let round0WinnerId: string | null = null;

        if (p0Award.wonVia !== 'FALLBACK_LOSS' && p1Award.wonVia === 'FALLBACK_LOSS') {
          round0WinnerId = p0Id;
        } else if (p1Award.wonVia !== 'FALLBACK_LOSS' && p0Award.wonVia === 'FALLBACK_LOSS') {
          round0WinnerId = p1Id;
        } else if (p0Award.ingredient.tasteScore > p1Award.ingredient.tasteScore) {
          round0WinnerId = p0Id;
        } else if (p1Award.ingredient.tasteScore > p0Award.ingredient.tasteScore) {
          round0WinnerId = p1Id;
        }

        if (round0WinnerId && match.result?.winnerId) {
          this.completedWithRound1Winner += 1;
          if (match.result.winnerId === round0WinnerId) {
            this.firstRoundWinnerWins += 1;
          }
        }
      }
    }
  }

  public getMetrics(): ServerMetricsResponse {
    const rematchRate =
      this.matchesCompleted > 0
        ? Math.round((this.rematchesStarted / this.matchesCompleted) * 1000) / 1000
        : 0;

    const avgTimeToFirstBidMs =
      this.firstBidCount > 0
        ? Math.round(this.totalTimeToFirstBidMs / this.firstBidCount)
        : 0;

    const firstRoundWinnerWinRate =
      this.completedWithRound1Winner > 0
        ? Math.round((this.firstRoundWinnerWins / this.completedWithRound1Winner) * 1000) / 1000
        : 0;

    const avgLeftoverMoney =
      this.totalCompletedPlayers > 0
        ? Math.round((this.totalLeftoverMoney / this.totalCompletedPlayers) * 100) / 100
        : 0;

    const disconnectRate =
      this.matchesStarted > 0
        ? Math.round((this.totalDisconnects / this.matchesStarted) * 1000) / 1000
        : 0;

    const avgRoundResolveMs =
      this.roundResolveCount > 0
        ? Math.round((this.totalRoundResolveDurationMs / this.roundResolveCount) * 100) / 100
        : 0;

    return {
      rematchRate,
      tutorialCompletions: this.tutorialCompletions,
      avgTimeToFirstBidMs,
      firstRoundWinnerWinRate,
      ingredientPickCounts: { ...this.ingredientPickCounts },
      avgLeftoverMoney,
      disconnectRate,
      avgRoundResolveMs,
      shareClicks: this.shareClicks,

      matchesCreated: this.matchesCreated,
      matchesStarted: this.matchesStarted,
      matchesCompleted: this.matchesCompleted,
      matchesForfeited: this.matchesForfeited,
      rematchesStarted: this.rematchesStarted,
      totalDisconnects: this.totalDisconnects,
      firstRoundWinnerWins: this.firstRoundWinnerWins,
      completedWithRound1Winner: this.completedWithRound1Winner,
      bidsLockedTotal: this.bidsLockedTotal,
      autoTimeoutBidsTotal: this.autoTimeoutBidsTotal,
      roundResolveCount: this.roundResolveCount,
    };
  }

  public reset(): void {
    this.matchesCreated = 0;
    this.matchesStarted = 0;
    this.matchesCompleted = 0;
    this.matchesForfeited = 0;
    this.rematchesStarted = 0;
    this.tutorialCompletions = 0;
    this.shareClicks = 0;
    this.totalDisconnects = 0;
    this.bidsLockedTotal = 0;
    this.autoTimeoutBidsTotal = 0;
    this.firstBidCount = 0;
    this.totalTimeToFirstBidMs = 0;
    this.roundResolveCount = 0;
    this.totalRoundResolveDurationMs = 0;
    this.firstRoundWinnerWins = 0;
    this.completedWithRound1Winner = 0;
    this.totalLeftoverMoney = 0;
    this.totalCompletedPlayers = 0;
    this.resetIngredientPicks();
  }
}

export const globalMetrics = new MetricsTracker();

export const metricsRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/metrics', async (_request, reply) => {
    return reply.status(200).send(globalMetrics.getMetrics());
  });
};
