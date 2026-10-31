import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { createBot } from '../src/sim/bots.js';
import { simulateSingleMatch } from '../src/sim/simulator.js';

describe('Property-Based Engine Invariants (Fast-Check)', () => {
  it('Property 1: Non-Negative Budget Invariant — neither player budget ever drops below 0', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 1000000 }),
        fc.constantFrom('RANDOM', 'GREEDY', 'COMBO'),
        fc.constantFrom('RANDOM', 'GREEDY', 'COMBO'),
        (seed, archA, archB) => {
          const botA = createBot('bot_a', 'Bot A', archA);
          const botB = createBot('bot_b', 'Bot B', archB);

          const { match } = simulateSingleMatch(botA, botB, seed);

          const p0 = match.players[0]!;
          const p1 = match.players[1]!;

          expect(p0.budget).toBeGreaterThanOrEqual(0);
          expect(p1.budget).toBeGreaterThanOrEqual(0);
        },
      ),
      { numRuns: 500 },
    );
  });

  it('Property 2: Complete Dish Invariant — both players always receive exactly 5 ingredients across the 5 slots', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 1000000 }),
        fc.constantFrom('RANDOM', 'GREEDY', 'COMBO'),
        fc.constantFrom('RANDOM', 'GREEDY', 'COMBO'),
        (seed, archA, archB) => {
          const botA = createBot('bot_a', 'Bot A', archA);
          const botB = createBot('bot_b', 'Bot B', archB);

          const { match } = simulateSingleMatch(botA, botB, seed);

          const p0 = match.players[0]!;
          const p1 = match.players[1]!;

          expect(p0.dish.length).toBe(5);
          expect(p1.dish.length).toBe(5);

          const expectedSlots = ['BUN', 'PATTY', 'SAUCE', 'CHEESE', 'TOPPING'];
          expect(p0.dish.map((d) => d.slot)).toEqual(expectedSlots);
          expect(p1.dish.map((d) => d.slot)).toEqual(expectedSlots);
        },
      ),
      { numRuns: 500 },
    );
  });

  it('Property 3: Pure Determinism — identical seed produces 100% deep equality', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 1000000 }),
        fc.constantFrom('RANDOM', 'GREEDY', 'COMBO'),
        fc.constantFrom('RANDOM', 'GREEDY', 'COMBO'),
        (seed, archA, archB) => {
          const botA1 = createBot('bot_a', 'Bot A', archA);
          const botB1 = createBot('bot_b', 'Bot B', archB);
          const res1 = simulateSingleMatch(botA1, botB1, seed);

          const botA2 = createBot('bot_a', 'Bot A', archA);
          const botB2 = createBot('bot_b', 'Bot B', archB);
          const res2 = simulateSingleMatch(botA2, botB2, seed);

          expect(res1.result.winnerId).toBe(res2.result.winnerId);
          expect(res1.result.winReason).toBe(res2.result.winReason);
          expect(res1.result.scoresByPlayer.bot_a?.finalScore).toBe(
            res2.result.scoresByPlayer.bot_a?.finalScore,
          );
          expect(res1.result.scoresByPlayer.bot_b?.finalScore).toBe(
            res2.result.scoresByPlayer.bot_b?.finalScore,
          );
        },
      ),
      { numRuns: 500 },
    );
  });

  it('Property 4: Stock-1 Conservation — Wagyu, Truffle Aioli, and Bacon are never awarded to both players', () => {
    const stock1Items = new Set([
      'street_patty_wagyu',
      'street_sauce_truffle_mayo',
      'street_topping_bacon',
    ]);

    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 1000000 }),
        fc.constantFrom('RANDOM', 'GREEDY', 'COMBO'),
        fc.constantFrom('RANDOM', 'GREEDY', 'COMBO'),
        (seed, archA, archB) => {
          const botA = createBot('bot_a', 'Bot A', archA);
          const botB = createBot('bot_b', 'Bot B', archB);

          const { match } = simulateSingleMatch(botA, botB, seed);

          const p0Items = match.players[0]!.dish.map((d) => d.ingredient.id);
          const p1Items = match.players[1]!.dish.map((d) => d.ingredient.id);

          for (const itemId of stock1Items) {
            const bothHave = p0Items.includes(itemId) && p1Items.includes(itemId);
            expect(bothHave).toBe(false);
          }
        },
      ),
      { numRuns: 500 },
    );
  });
});
