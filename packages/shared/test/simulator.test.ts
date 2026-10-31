import { describe, expect, it } from 'vitest';
import { runSimulation } from '../src/sim/simulator.js';

describe('Bot Balance Simulator (Batch Run)', () => {
  it('Runs a 500-match simulation quickly and outputs consistent metrics', () => {
    const report = runSimulation({
      matchCount: 500,
      botA: 'COMBO',
      botB: 'GREEDY',
      baseSeed: 42,
    });

    expect(report.matchCount).toBe(500);
    expect(report.botAWins + report.botBWins + report.ties).toBe(500);
    expect(report.winRateA).toBeGreaterThan(0.5); // Combo should beat Greedy
    expect(report.avgScoreA).toBeGreaterThan(20);
    expect(report.avgScoreB).toBeGreaterThan(20);
    expect(report.totalCollisions).toBeGreaterThan(0);
    expect(report.collisionRate).toBeGreaterThan(0.2);
    expect(report.elapsedMs).toBeLessThan(5000); // Fast execution under 5 seconds

    // Ingredient pick rates
    expect(report.ingredientPickRates.street_patty_wagyu).toBeDefined();

    // Combos triggered
    expect(report.comboFrequencies.HOT_AND_DECADENT).toBeGreaterThan(0);
  });
});
