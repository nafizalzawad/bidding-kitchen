import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { buildServer } from '../src/index.js';
import { globalMetrics } from '../src/metrics.js';
import { STREET_INGREDIENTS } from '@bidding-kitchen/shared';

describe('Server Hardening & Telemetry Tests', () => {
  let serverInstance: Awaited<ReturnType<typeof buildServer>>;

  beforeEach(async () => {
    globalMetrics.reset();
    serverInstance = await buildServer({
      timerScale: 0.05,
      transitionTimerScale: 0.05,
    });
  });

  afterEach(async () => {
    serverInstance.roomManager.clearAll();
    await serverInstance.fastify.close();
  });

  it('serves HTTP security headers configured by helmet', async () => {
    const response = await serverInstance.fastify.inject({
      method: 'GET',
      url: '/health',
    });

    expect(response.statusCode).toBe(200);
    // Helmet default security headers
    expect(response.headers['x-content-type-options']).toBe('nosniff');
    expect(response.headers['x-frame-options']).toBe('SAMEORIGIN');
  });

  it('returns all 8 product metrics with valid numbers on GET /metrics', async () => {
    // Record mock events
    globalMetrics.increment('matchesCreated');
    globalMetrics.increment('matchesStarted');
    globalMetrics.recordTimeToFirstBid(1250);
    globalMetrics.recordTimeToFirstBid(1750);
    globalMetrics.recordRoundResolveDuration(4.5);
    globalMetrics.increment('tutorialCompletions');
    globalMetrics.increment('shareClicks');

    const response = await serverInstance.fastify.inject({
      method: 'GET',
      url: '/metrics',
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);

    // Verify all 8 product metrics exist and are numbers (not NaN)
    expect(typeof body.rematchRate).toBe('number');
    expect(Number.isNaN(body.rematchRate)).toBe(false);

    expect(typeof body.tutorialCompletions).toBe('number');
    expect(body.tutorialCompletions).toBe(1);

    expect(typeof body.avgTimeToFirstBidMs).toBe('number');
    expect(body.avgTimeToFirstBidMs).toBe(1500);

    expect(typeof body.firstRoundWinnerWinRate).toBe('number');
    expect(Number.isNaN(body.firstRoundWinnerWinRate)).toBe(false);

    expect(typeof body.avgLeftoverMoney).toBe('number');
    expect(Number.isNaN(body.avgLeftoverMoney)).toBe(false);

    expect(typeof body.disconnectRate).toBe('number');
    expect(Number.isNaN(body.disconnectRate)).toBe(false);

    expect(typeof body.avgRoundResolveMs).toBe('number');
    expect(body.avgRoundResolveMs).toBe(4.5);

    expect(typeof body.shareClicks).toBe('number');
    expect(body.shareClicks).toBe(1);

    // Verify all 19 Street Burger ingredients are mapped in ingredientPickCounts
    expect(typeof body.ingredientPickCounts).toBe('object');
    const pickKeys = Object.keys(body.ingredientPickCounts);
    expect(pickKeys.length).toBe(19);
    for (const ing of STREET_INGREDIENTS) {
      expect(typeof body.ingredientPickCounts[ing.id]).toBe('number');
    }
  });

  it('sweeps expired rooms while keeping active rooms intact', () => {
    const roomManager = serverInstance.roomManager;
    const now = Date.now();

    // Mock socket for room creation
    const mockSocket: any = {
      id: 'mock_sock_1',
      join: () => {},
      emit: () => {},
    };

    const roomData = roomManager.createRoom(
      { nickname: 'Chef Alice', tier: 'STREET' },
      mockSocket,
    );

    const room = roomManager.getRoom(roomData.roomCode)!;
    expect(roomManager.getActiveRoomsCount()).toBe(1);

    // Active room in LOBBY should not be swept immediately
    let swept = roomManager.sweepExpiredRooms(now);
    expect(swept).toBe(0);
    expect(roomManager.getActiveRoomsCount()).toBe(1);

    // Simulate room in POST_MATCH that passed its deadline
    room.match.state = 'POST_MATCH';
    room.match.stateDeadlineAt = now - 1000;

    swept = roomManager.sweepExpiredRooms(now);
    expect(swept).toBe(1);
    expect(roomManager.getActiveRoomsCount()).toBe(0);
  });
});
