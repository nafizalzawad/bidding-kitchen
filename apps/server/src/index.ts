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

export async function buildServer() {
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

  await fastify.register(healthRoutes);

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

  io.on('connection', (socket) => {
    logger.info({ socketId: socket.id }, 'Socket connected');

    socket.on('disconnect', (reason) => {
      logger.info({ socketId: socket.id, reason }, 'Socket disconnected');
    });
  });

  return { fastify, io };
}

async function start() {
  try {
    const { fastify } = await buildServer();
    await fastify.listen({ port: config.PORT, host: config.HOST });
    logger.info(
      `Bidding Kitchen Realtime Server listening on http://${config.HOST}:${config.PORT}`
    );
  } catch (err) {
    logger.error(err, 'Failed to start server');
    process.exit(1);
  }
}

// Auto-start when executed directly
if (process.env['NODE_ENV'] !== 'test') {
  start();
}
