import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { io as ClientSocket, type Socket as ClientSocketType } from 'socket.io-client';
import { Server as SocketIOServer } from 'socket.io';
import type { ClientToServerEvents, ServerToClientEvents } from '@bidding-kitchen/shared';
import { MatchmakingQueue } from '../src/rooms/matchmaking-queue.js';
import { RoomManager } from '../src/rooms/room-manager.js';
import { registerSocketHandlers } from '../src/socket/socket-handler.js';

describe('MatchmakingQueue Unit Tests', () => {
  it('enqueues single player without matching', () => {
    const queue = new MatchmakingQueue();
    const result = queue.enqueue({
      socketId: 'sock_1',
      nickname: 'ChefAlice',
      tier: 'STREET',
    });

    expect(result.matched).toBe(false);
    expect(result.ticketId).toBeDefined();
    expect(queue.getQueueStats().STREET).toBe(1);
    expect(queue.isSocketEnqueued('sock_1')).toBe(true);
  });

  it('matches two players in the same tier FIFO', () => {
    const queue = new MatchmakingQueue();

    const res1 = queue.enqueue({
      socketId: 'sock_1',
      nickname: 'ChefAlice',
      tier: 'BISTRO',
    });
    expect(res1.matched).toBe(false);

    const res2 = queue.enqueue({
      socketId: 'sock_2',
      nickname: 'ChefBob',
      tier: 'BISTRO',
    });

    expect(res2.matched).toBe(true);
    if (res2.matched) {
      expect(res2.tier).toBe('BISTRO');
      expect(res2.ticketA.nickname).toBe('ChefAlice');
      expect(res2.ticketB.nickname).toBe('ChefBob');
    }
    expect(queue.getQueueStats().BISTRO).toBe(0);
    expect(queue.isSocketEnqueued('sock_1')).toBe(false);
    expect(queue.isSocketEnqueued('sock_2')).toBe(false);
  });

  it('enforces strict cross-tier isolation', () => {
    const queue = new MatchmakingQueue();

    const res1 = queue.enqueue({
      socketId: 'sock_1',
      nickname: 'ChefAlice',
      tier: 'BISTRO',
    });
    const res2 = queue.enqueue({
      socketId: 'sock_2',
      nickname: 'ChefBob',
      tier: 'CHEFS_TABLE',
    });

    expect(res1.matched).toBe(false);
    expect(res2.matched).toBe(false);
    expect(queue.getQueueStats().BISTRO).toBe(1);
    expect(queue.getQueueStats().CHEFS_TABLE).toBe(1);

    // Third player joins CHEFS_TABLE -> should pair with ChefBob, leaving ChefAlice in BISTRO
    const res3 = queue.enqueue({
      socketId: 'sock_3',
      nickname: 'ChefCharlie',
      tier: 'CHEFS_TABLE',
    });

    expect(res3.matched).toBe(true);
    if (res3.matched) {
      expect(res3.tier).toBe('CHEFS_TABLE');
      expect(res3.ticketA.nickname).toBe('ChefBob');
      expect(res3.ticketB.nickname).toBe('ChefCharlie');
    }

    expect(queue.getQueueStats().BISTRO).toBe(1);
    expect(queue.getQueueStats().CHEFS_TABLE).toBe(0);
  });

  it('handles voluntary cancellation via leaveQueue', () => {
    const queue = new MatchmakingQueue();
    const res = queue.enqueue({
      socketId: 'sock_1',
      nickname: 'ChefAlice',
      tier: 'STREET',
    });

    expect(queue.isSocketEnqueued('sock_1')).toBe(true);
    const left = queue.leaveQueue(res.ticketId);
    expect(left).toBe(true);
    expect(queue.isSocketEnqueued('sock_1')).toBe(false);
    expect(queue.getQueueStats().STREET).toBe(0);

    // Leaving non-existent ticket returns false
    expect(queue.leaveQueue('invalid_ticket')).toBe(false);
  });

  it('prunes disconnected sockets immediately', () => {
    const queue = new MatchmakingQueue();
    queue.enqueue({
      socketId: 'sock_disconnect',
      nickname: 'ChefGhost',
      tier: 'CHEFS_TABLE',
    });

    expect(queue.getQueueStats().CHEFS_TABLE).toBe(1);
    const pruned = queue.pruneDisconnected('sock_disconnect');
    expect(pruned).toBe(true);
    expect(queue.getQueueStats().CHEFS_TABLE).toBe(0);
  });

  it('re-enqueuing socket replaces previous ticket', () => {
    const queue = new MatchmakingQueue();
    queue.enqueue({
      socketId: 'sock_same',
      nickname: 'ChefAlice',
      tier: 'STREET',
    });

    expect(queue.getQueueStats().STREET).toBe(1);

    // Same socket joins BISTRO
    queue.enqueue({
      socketId: 'sock_same',
      nickname: 'ChefAlice',
      tier: 'BISTRO',
    });

    expect(queue.getQueueStats().STREET).toBe(0);
    expect(queue.getQueueStats().BISTRO).toBe(1);
  });
});

describe('Matchmaking Realtime Socket Integration Tests', () => {
  let server: ReturnType<typeof createServer>;
  let io: SocketIOServer<ClientToServerEvents, ServerToClientEvents>;
  let roomManager: RoomManager;
  let port: number;

  beforeAll(async () => {
    server = createServer();
    io = new SocketIOServer(server, { cors: { origin: '*' } });
    roomManager = new RoomManager(io, { timerScale: 0.05 });
    registerSocketHandlers(io, roomManager);

    await new Promise<void>((resolve) => {
      server.listen(0, () => {
        port = (server.address() as AddressInfo).port;
        resolve();
      });
    });
  });

  afterAll(async () => {
    io.close();
    await new Promise<void>((resolve) => {
      server.close(() => resolve());
    });
  });

  function connectClient(): Promise<ClientSocketType<ServerToClientEvents, ClientToServerEvents>> {
    return new Promise((resolve, reject) => {
      const client: ClientSocketType<ServerToClientEvents, ClientToServerEvents> = ClientSocket(
        `http://localhost:${port}`,
        { transports: ['websocket'], forceNew: true },
      );
      client.on('connect', () => resolve(client));
      client.on('connect_error', reject);
    });
  }

  it('pairs two clients via queue:join, receives queue:matched and starts match in TIER_CONFIRMED', async () => {
    const clientA = await connectClient();
    const clientB = await connectClient();

    const matchedPromiseA = new Promise<any>((resolve) => {
      clientA.on('queue:matched', (data) => resolve(data));
    });
    const matchedPromiseB = new Promise<any>((resolve) => {
      clientB.on('queue:matched', (data) => resolve(data));
    });

    // Client A joins BISTRO queue
    const ackA = await new Promise<any>((resolve) => {
      clientA.emit('queue:join', { nickname: 'PizzaChefA', tier: 'BISTRO' }, (res) => resolve(res));
    });
    expect(ackA.ok).toBe(true);

    // Client B joins BISTRO queue
    const ackB = await new Promise<any>((resolve) => {
      clientB.emit('queue:join', { nickname: 'PizzaChefB', tier: 'BISTRO' }, (res) => resolve(res));
    });
    expect(ackB.ok).toBe(true);

    const matchA = await matchedPromiseA;
    const matchB = await matchedPromiseB;

    expect(matchA.roomCode).toBeDefined();
    expect(matchA.roomCode).toBe(matchB.roomCode);
    expect(matchA.playerId).not.toBe(matchB.playerId);
    expect(matchA.reconnectToken).toBeDefined();
    expect(matchB.reconnectToken).toBeDefined();
    expect(matchA.match.tier).toBe('BISTRO');
    expect(matchA.match.state).toBe('TIER_CONFIRMED');

    clientA.disconnect();
    clientB.disconnect();
  });
});
