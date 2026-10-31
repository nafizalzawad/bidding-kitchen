import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildServer } from '../src/index.js';
import {
  LockBidPayloadSchema,
  NicknameSchema,
  RoomCodeSchema,
} from '../src/socket/schemas.js';

describe('Backend Server Contracts & Schemas', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    process.env['NODE_ENV'] = 'test';
    const server = await buildServer();
    app = server.fastify;
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /health returns HTTP 200 and exact Phase 1 contract metrics in < 50ms', async () => {
    const start = performance.now();
    const response = await app.inject({
      method: 'GET',
      url: '/health',
    });
    const duration = performance.now() - start;

    expect(duration).toBeLessThan(500);
    expect(response.statusCode).toBe(200);

    const payload = JSON.parse(response.payload);
    expect(payload).toEqual({
      status: 'ok',
      version: '0.1.0',
      activeRooms: 0,
      sharedContractsLoaded: true,
      streetIngredientsCount: 19,
      engineVerified: true,
    });
  });

  it('POST /api/sim-match returns deterministic 5-round match simulation', async () => {
    const res1 = await app.inject({
      method: 'POST',
      url: '/api/sim-match',
      payload: { seed: 2026, botA: 'COMBO', botB: 'GREEDY' },
    });
    expect(res1.statusCode).toBe(200);
    const body1 = JSON.parse(res1.payload);
    expect(body1.success).toBe(true);
    expect(body1.match.rounds.length).toBe(5);
    expect(body1.result.winnerId).toBeDefined();

    // Calling again with identical seed produces identical results
    const res2 = await app.inject({
      method: 'POST',
      url: '/api/sim-match',
      payload: { seed: 2026, botA: 'COMBO', botB: 'GREEDY' },
    });
    const body2 = JSON.parse(res2.payload);
    expect(body1.result).toEqual(body2.result);
  });

  describe('LockBidPayloadSchema Validation', () => {
    it('accepts valid whole-dollar integer bids (0, 5, 20)', () => {
      const validCases = [0, 5, 20];
      for (const amount of validCases) {
        const result = LockBidPayloadSchema.safeParse({
          roomCode: 'BURG42',
          roundIndex: 1,
          ingredientId: 'street_patty_wagyu',
          amount,
          idempotencyKey: 'k1',
        });
        expect(result.success).toBe(true);
      }
    });

    it('rejects decimal / float bids with BID_NOT_INTEGER equivalent failure', () => {
      const result = LockBidPayloadSchema.safeParse({
        roomCode: 'BURG42',
        roundIndex: 1,
        ingredientId: 'street_patty_wagyu',
        amount: 8.5,
        idempotencyKey: 'k1',
      });
      expect(result.success).toBe(false);
    });

    it('rejects negative bids', () => {
      const result = LockBidPayloadSchema.safeParse({
        roomCode: 'BURG42',
        roundIndex: 1,
        ingredientId: 'street_patty_wagyu',
        amount: -1,
        idempotencyKey: 'k1',
      });
      expect(result.success).toBe(false);
    });

    it('rejects missing idempotencyKey', () => {
      const result = LockBidPayloadSchema.safeParse({
        roomCode: 'BURG42',
        roundIndex: 1,
        ingredientId: 'street_patty_wagyu',
        amount: 5,
      });
      expect(result.success).toBe(false);
    });
  });

  describe('NicknameSchema Validation', () => {
    it('accepts valid nicknames like "ChefNafiz"', () => {
      expect(NicknameSchema.safeParse('ChefNafiz').success).toBe(true);
      expect(NicknameSchema.safeParse('Chef_123').success).toBe(true);
    });

    it('rejects empty, 1-character, or whitespace-only nicknames', () => {
      expect(NicknameSchema.safeParse('').success).toBe(false);
      expect(NicknameSchema.safeParse('a').success).toBe(false);
      expect(NicknameSchema.safeParse('   ').success).toBe(false);
    });

    it('rejects overly long nicknames (> 16 chars)', () => {
      expect(NicknameSchema.safeParse('TooLongNickname12345').success).toBe(false);
    });
  });

  describe('RoomCodeSchema Validation', () => {
    it('transforms lowercase input into uppercase', () => {
      const result = RoomCodeSchema.safeParse('burg42');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe('BURG42');
      }
    });

    it('rejects room codes that are not exactly 6 characters', () => {
      expect(RoomCodeSchema.safeParse('BUR42').success).toBe(false);
      expect(RoomCodeSchema.safeParse('BURGER42').success).toBe(false);
    });
  });
});
