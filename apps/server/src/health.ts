import type { FastifyPluginAsync } from 'fastify';
import {
  createBot,
  simulateSingleMatch,
  STREET_INGREDIENTS,
  type BotArchetype,
  type Match,
  type MatchConfig,
  type Result,
} from '@bidding-kitchen/shared';

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

export const healthRoutes: FastifyPluginAsync = async (fastify) => {
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
    const response: HealthResponse = {
      status: 'ok',
      version: '0.1.0',
      activeRooms: 0,
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
};
