import type { FastifyPluginAsync } from 'fastify';
import { STREET_INGREDIENTS } from '@bidding-kitchen/shared';

export interface HealthResponse {
  status: 'ok';
  version: '0.1.0';
  activeRooms: number;
  sharedContractsLoaded: boolean;
  streetIngredientsCount: number;
}

export const healthRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/health', async (_request, reply) => {
    const response: HealthResponse = {
      status: 'ok',
      version: '0.1.0',
      activeRooms: 0,
      sharedContractsLoaded: STREET_INGREDIENTS.length > 0,
      streetIngredientsCount: STREET_INGREDIENTS.length,
    };
    return reply.status(200).send(response);
  });
};
