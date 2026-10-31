import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { AddressInfo } from 'node:net';
import { io as ioc, type Socket as ClientSocket } from 'socket.io-client';
import type {
  ClientToServerEvents,
  PublicMatchView,
  ServerToClientEvents,
} from '@bidding-kitchen/shared';
import { buildServer } from '../src/index.js';
import type { FastifyInstance } from 'fastify';
import type { RoomManager } from '../src/rooms/room-manager.js';

type TestClientSocket = ClientSocket<ServerToClientEvents, ClientToServerEvents>;

function waitForState(
  socket: TestClientSocket,
  predicate: (match: PublicMatchView) => boolean,
  timeoutMs = 6000
): Promise<PublicMatchView> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      cleanup();
      reject(new Error(`Timeout waiting for state predicate after ${timeoutMs}ms`));
    }, timeoutMs);

    function onPayload(payload: { match: PublicMatchView }) {
      if (predicate(payload.match)) {
        clearTimeout(timer);
        cleanup();
        resolve(payload.match);
      }
    }

    function cleanup() {
      socket.off('match:state_sync', onPayload);
      socket.off('round:resolved', onPayload);
      socket.off('match:forfeited', onPayload);
    }

    socket.on('match:state_sync', onPayload);
    socket.on('round:resolved', onPayload);
    socket.on('match:forfeited', onPayload);
  });
}

describe('Reconnection & Forfeit Integration Tests', () => {
  let app: FastifyInstance;
  let roomManager: RoomManager;
  let port: number;
  const openSockets: TestClientSocket[] = [];

  function createClient(): Promise<TestClientSocket> {
    return new Promise((resolve) => {
      const socket: TestClientSocket = ioc(`http://127.0.0.1:${port}`, {
        transports: ['websocket'],
        forceNew: true,
      });
      openSockets.push(socket);
      socket.on('connect', () => {
        resolve(socket);
      });
    });
  }

  beforeAll(async () => {
    process.env['NODE_ENV'] = 'test';
    // Timer scale 0.05 and reconnect window 300ms
    const server = await buildServer({ timerScale: 0.05, reconnectWindowMs: 300 });
    app = server.fastify;
    roomManager = server.roomManager;

    await app.listen({ port: 0, host: '127.0.0.1' });
    port = (app.server.address() as AddressInfo).port;
  });

  afterAll(async () => {
    for (const socket of openSockets) {
      if (socket.connected) {
        socket.disconnect();
      }
    }
    roomManager.clearAll();
    await app.close();
  });

  beforeEach(() => {
    roomManager.clearAll();
  });

  it('handles seamless reconnection within reconnect window with valid token', async () => {
    const host = await createClient();
    const guest = await createClient();

    const hostRes = await new Promise<any>((resolve) => {
      host.emit('room:create', { nickname: 'HostChef', tier: 'STREET' }, (ack) => resolve(ack));
    });
    const roomCode = hostRes.roomCode;

    const guestRes = await new Promise<any>((resolve) => {
      guest.emit('room:join', { roomCode, nickname: 'GuestChef' }, (ack) => resolve(ack));
    });

    const guestId = guestRes.playerId;
    const guestToken = guestRes.reconnectToken;

    // Both ready up to enter active game
    await new Promise<any>((resolve) => {
      host.emit('lobby:ready', { roomCode, ready: true }, (ack) => resolve(ack));
    });
    await new Promise<any>((resolve) => {
      guest.emit('lobby:ready', { roomCode, ready: true }, (ack) => resolve(ack));
    });

    // Wait until BIDDING begins
    await waitForState(host, (m) => m.state === 'BIDDING');

    // Host listens for connection_changed event
    const disconnectedPromise = new Promise<{ playerId: string; connected: boolean }>((resolve) => {
      host.once('player:connection_changed', (payload) => resolve(payload));
    });

    // Guest disconnects
    guest.disconnect();
    const disconnectEvent = await disconnectedPromise;
    expect(disconnectEvent.playerId).toBe(guestId);
    expect(disconnectEvent.connected).toBe(false);

    // Host listens for re-connected event
    const reconnectedPromise = new Promise<{ playerId: string; connected: boolean }>((resolve) => {
      host.once('player:connection_changed', (payload) => resolve(payload));
    });

    // Guest opens a new socket and reconnects with token
    const newGuestSocket = await createClient();
    const reconAck = await new Promise<any>((resolve) => {
      newGuestSocket.emit(
        'room:reconnect',
        { roomCode, playerId: guestId, reconnectToken: guestToken },
        (ack) => resolve(ack)
      );
    });

    expect(reconAck.ok).toBe(true);
    expect(reconAck.match.state).toBeDefined();

    const reconnectedEvent = await reconnectedPromise;
    expect(reconnectedEvent.playerId).toBe(guestId);
    expect(reconnectedEvent.connected).toBe(true);
  });

  it('rejects reconnection with invalid token or player ID', async () => {
    const host = await createClient();
    const guest = await createClient();

    const hostRes = await new Promise<any>((resolve) => {
      host.emit('room:create', { nickname: 'HostChef', tier: 'STREET' }, (ack) => resolve(ack));
    });
    const roomCode = hostRes.roomCode;

    const guestRes = await new Promise<any>((resolve) => {
      guest.emit('room:join', { roomCode, nickname: 'GuestChef' }, (ack) => resolve(ack));
    });
    const guestId = guestRes.playerId;

    const maliciousSocket = await createClient();
    const fakeAck = await new Promise<any>((resolve) => {
      maliciousSocket.emit(
        'room:reconnect',
        { roomCode, playerId: guestId, reconnectToken: 'fake-token-12345' },
        (ack) => resolve(ack)
      );
    });

    expect(fakeAck.ok).toBe(false);
    expect(fakeAck.error.code).toBe('UNAUTHORIZED_RECONNECT');
  });

  it('forfeits match to connected player when disconnected player exceeds reconnectWindowMs', async () => {
    const host = await createClient();
    const guest = await createClient();

    const hostRes = await new Promise<any>((resolve) => {
      host.emit('room:create', { nickname: 'SurvivorHost', tier: 'STREET' }, (ack) => resolve(ack));
    });
    const roomCode = hostRes.roomCode;
    const hostId = hostRes.playerId;

    await new Promise<any>((resolve) => {
      guest.emit('room:join', { roomCode, nickname: 'QuitterGuest' }, (ack) => resolve(ack));
    });

    await new Promise<any>((resolve) => {
      host.emit('lobby:ready', { roomCode, ready: true }, (ack) => resolve(ack));
    });
    await new Promise<any>((resolve) => {
      guest.emit('lobby:ready', { roomCode, ready: true }, (ack) => resolve(ack));
    });

    await waitForState(host, (m) => m.state === 'BIDDING');

    // Quitter disconnects and never reconnects
    guest.disconnect();

    // Host should receive state transition to POST_MATCH due to forfeit
    const forfeitState = await waitForState(
      host,
      (m) => m.state === 'POST_MATCH',
      2000
    );

    expect(forfeitState.state).toBe('POST_MATCH');
    expect(forfeitState.result).toBeDefined();
    expect(forfeitState.result?.winnerId).toBe(hostId);
  });
});
