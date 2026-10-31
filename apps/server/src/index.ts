import Fastify from 'fastify';
import cors from '@fastify/cors';
import { Server as SocketIOServer } from 'socket.io';
import type {
  ClientToServerEvents,
  ServerToClientEvents,
} from '@bidding-kitchen/shared';
import { config } from './config.js';
import { logger } from './logger.js';
import { healthRoutes } from './health.js';
import { metricsRoutes } from './metrics.js';
import { RoomManager, type RoomManagerOptions } from './rooms/room-manager.js';
import { registerSocketHandlers } from './socket/socket-handler.js';

export type BuildServerOptions = RoomManagerOptions;

export async function buildServer(options: BuildServerOptions = {}) {
  const fastify = Fastify({
    logger: false, // We use custom pino logger
  });

  await fastify.register(cors, {
    origin: (origin, cb) => {
      // In development allow any localhost origin or configured origin
      if (
        !origin ||
        origin === config.CORS_ORIGIN ||
        origin.startsWith('http://localhost:') ||
        origin.startsWith('http://127.0.0.1:')
      ) {
        cb(null, true);
        return;
      }
      cb(new Error('Not allowed by CORS'), false);
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    credentials: true,
  });

  // Initialize Socket.IO attached to Fastify's raw HTTP server
  const io = new SocketIOServer<ClientToServerEvents, ServerToClientEvents>(
    fastify.server,
    {
      cors: {
        origin: '*',
        methods: ['GET', 'POST'],
      },
    }
  );

  const roomManager = new RoomManager(io, options);

  registerSocketHandlers(io, roomManager);

  await fastify.register(healthRoutes, { roomManager, io });
  await fastify.register(metricsRoutes);

  return { fastify, io, roomManager };
}

async function start() {
  try {
    const { fastify, roomManager } = await buildServer();
    await fastify.listen({ port: config.PORT, host: config.HOST });
    logger.info(
      `Bidding Kitchen Realtime Server listening on http://${config.HOST}:${config.PORT}`
    );

    const shutdown = async () => {
      logger.info('Shutting down server gracefully...');
      roomManager.clearAll();
      await fastify.close();
      process.exit(0);
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
  } catch (err) {
    logger.error(err, 'Failed to start server');
    process.exit(1);
  }
}

// Auto-start when executed directly
if (process.env['NODE_ENV'] !== 'test') {
  start();
}
