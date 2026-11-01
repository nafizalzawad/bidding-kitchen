import type { FastifyPluginAsync } from 'fastify';

export interface ServerMetrics {
  matchesCreated: number;
  matchesStarted: number;
  matchesCompleted: number;
  matchesForfeited: number;
  rematchesStarted: number;
  tutorialCompletions: number;
  bidsLockedTotal: number;
  autoTimeoutBidsTotal: number;
  roundResolveCount: number;
  shareClicks: number;
  firstRoundWinnerWins: number;
  firstBidCount: number;
  totalTimeToFirstBidMs: number;
  totalRoundResolveDurationMs: number;
  avgRoundResolveMs: number;
}

export type MetricKey = keyof ServerMetrics;

export class MetricsTracker {
  private metrics: ServerMetrics = {
    matchesCreated: 0,
    matchesStarted: 0,
    matchesCompleted: 0,
    matchesForfeited: 0,
    rematchesStarted: 0,
    tutorialCompletions: 0,
    bidsLockedTotal: 0,
    autoTimeoutBidsTotal: 0,
    roundResolveCount: 0,
    shareClicks: 0,
    firstRoundWinnerWins: 0,
    firstBidCount: 0,
    totalTimeToFirstBidMs: 0,
    totalRoundResolveDurationMs: 0,
    avgRoundResolveMs: 0,
  };

  public increment(key: MetricKey, amount = 1): void {
    if (this.metrics[key] !== undefined) {
      this.metrics[key] += amount;
    }
  }

  public recordRoundResolveDuration(durationMs: number): void {
    this.metrics.roundResolveCount += 1;
    this.metrics.totalRoundResolveDurationMs += durationMs;
    this.metrics.avgRoundResolveMs =
      this.metrics.roundResolveCount > 0
        ? Math.round((this.metrics.totalRoundResolveDurationMs / this.metrics.roundResolveCount) * 100) / 100
        : 0;
  }

  public getMetrics(): ServerMetrics {
    return { ...this.metrics };
  }

  public reset(): void {
    for (const key of Object.keys(this.metrics) as MetricKey[]) {
      this.metrics[key] = 0;
    }
  }
}

export const globalMetrics = new MetricsTracker();

export const metricsRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/metrics', async (_request, reply) => {
    return reply.status(200).send(globalMetrics.getMetrics());
  });
};
