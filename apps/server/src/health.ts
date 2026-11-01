import type { FastifyPluginAsync } from 'fastify';
import {
  createBot,
  simulateSingleMatch,
  STREET_INGREDIENTS,
  type BotArchetype,
  type Match,
  type MatchConfig,
  type Result,
  type ClientToServerEvents,
  type ServerToClientEvents,
} from '@bidding-kitchen/shared';
import type { Server as SocketIOServer } from 'socket.io';
import type { RoomManager } from './rooms/room-manager.js';
import { config } from './config.js';

export interface HealthResponse {
  status: 'ok';
  version: '0.1.0';
  activeRooms: number;
  sharedContractsLoaded: boolean;
  streetIngredientsCount: number;
  engineVerified: boolean;
}

export interface SimMatchRequestBody {
  seed?: number;
  botA?: BotArchetype;
  botB?: BotArchetype;
  config?: Partial<MatchConfig>;
}

export interface SimMatchResponse {
  success: boolean;
  seed: number;
  match: Match;
  result: Result;
}

export interface HealthRouteOptions {
  roomManager?: RoomManager;
  io?: SocketIOServer<ClientToServerEvents, ServerToClientEvents>;
}

export const healthRoutes: FastifyPluginAsync<HealthRouteOptions> = async (fastify, opts) => {
  // Verify engine once on route registration
  let engineVerified = false;
  try {
    const testBotA = createBot('test_0', 'A', 'GREEDY');
    const testBotB = createBot('test_1', 'B', 'GREEDY');
    const sim = simulateSingleMatch(testBotA, testBotB, 2026);
    engineVerified = sim.result.winnerId !== null && sim.match.rounds.length === 5;
  } catch {
    engineVerified = false;
  }

  fastify.get('/health', async (_request, reply) => {
    const activeRooms = opts?.roomManager ? opts.roomManager.getActiveRoomsCount() : 0;
    const response: HealthResponse = {
      status: 'ok',
      version: '0.1.0',
      activeRooms,
      sharedContractsLoaded: STREET_INGREDIENTS.length > 0,
      streetIngredientsCount: STREET_INGREDIENTS.length,
      engineVerified,
    };
    return reply.status(200).send(response);
  });

  fastify.post<{ Body: SimMatchRequestBody }>('/api/sim-match', async (request, reply) => {
    const body = request.body || {};
    const seed = body.seed ?? 2026;
    const botAType: BotArchetype = body.botA ?? 'COMBO';
    const botBType: BotArchetype = body.botB ?? 'GREEDY';

    const botA = createBot('bot_p0', `Bot_${botAType}`, botAType);
    const botB = createBot('bot_p1', `Bot_${botBType}`, botBType);

    const { match, result } = simulateSingleMatch(botA, botB, seed, body.config);

    const response: SimMatchResponse = {
      success: true,
      seed,
      match,
      result,
    };

    return reply.status(200).send(response);
  });

  // Admin / Test-only helper to override room timers for fast E2E testing
  fastify.post<{
    Body: {
      roomCode: string;
      reconnectWindowMs?: number;
      biddingDurationMs?: number;
      transitionTimerScale?: number;
    };
  }>('/api/test/room-timers', async (request, reply) => {
    if (config.NODE_ENV === 'production') {
      return reply.status(403).send({ ok: false, error: 'Forbidden in production' });
    }

    const { roomCode, reconnectWindowMs, biddingDurationMs, transitionTimerScale } =
      request.body || {};
    if (!roomCode) {
      return reply.status(400).send({ ok: false, error: 'roomCode is required' });
    }

    const room = opts?.roomManager?.getRoom(roomCode);
    if (!room) {
      return reply.status(404).send({ ok: false, error: `Room ${roomCode} not found` });
    }

    if (typeof reconnectWindowMs === 'number') {
      room.setReconnectWindowMs(reconnectWindowMs);
    }
    if (typeof biddingDurationMs === 'number') {
      room.setBiddingDurationMs(biddingDurationMs);
    }
    if (typeof transitionTimerScale === 'number') {
      room.setTransitionTimerScale(transitionTimerScale);
    }

    return reply.status(200).send({
      ok: true,
      roomCode,
      reconnectWindowMs: room.match.config.reconnectWindowMs,
      biddingDurationMs: room.match.config.biddingDurationMs,
      transitionTimerScale: room.transitionTimerScale,
    });
  });
};
