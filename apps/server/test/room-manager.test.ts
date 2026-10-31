import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import type { AddressInfo } from 'node:net';
import { io as ioc, type Socket as ClientSocket } from 'socket.io-client';
import type {
  ClientToServerEvents,
  ServerToClientEvents,
} from '@bidding-kitchen/shared';
import { buildServer } from '../src/index.js';
import type { FastifyInstance } from 'fastify';
import type { RoomManager } from '../src/rooms/room-manager.js';

type TestClientSocket = ClientSocket<ServerToClientEvents, ClientToServerEvents>;

describe('RoomManager & Room Lifecycle Integration', () => {
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
    const server = await buildServer({ timerScale: 0.05 });
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

  describe('Room Code Generation', () => {
    it('generates 6-character uppercase codes excluding ambiguous characters (0, 1, I, O)', () => {
      const unambiguousAlphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
      for (let i = 0; i < 50; i++) {
        const code = roomManager.generateRoomCode();
        expect(code).toHaveLength(6);
        for (const char of code) {
          expect(unambiguousAlphabet.includes(char)).toBe(true);
          expect(['0', '1', 'I', 'O'].includes(char)).toBe(false);
        }
      }
    });
  });

  describe('Room Creation & Joining over WebSockets', () => {
    it('creates room and returns roomCode, playerId, reconnectToken, and sanitized match view', async () => {
      const client = await createClient();

      const res = await new Promise<any>((resolve) => {
        client.emit(
          'room:create',
          { nickname: 'HostChef', tier: 'STREET' },
          (ack) => resolve(ack)
        );
      });

      expect(res.ok).toBe(true);
      expect(res.roomCode).toBeDefined();
      expect(res.roomCode).toHaveLength(6);
      expect(res.playerId).toBeDefined();
      expect(res.reconnectToken).toBeDefined();
      expect(res.match.players[0].nickname).toBe('HostChef');
      expect(res.match.players[1]).toBeNull();
      expect(res.match.state).toBe('LOBBY');
      expect(roomManager.getActiveRoomsCount()).toBe(1);
    });

    it('allows a second player to join an existing room and transitions state to LOBBY with 2 players', async () => {
      const host = await createClient();
      const guest = await createClient();

      const hostRes = await new Promise<any>((resolve) => {
        host.emit(
          'room:create',
          { nickname: 'HostChef', tier: 'STREET' },
          (ack) => resolve(ack)
        );
      });
      const roomCode = hostRes.roomCode;

      // Guest listens for state sync
      const guestJoinPromise = new Promise<any>((resolve) => {
        guest.emit(
          'room:join',
          { roomCode, nickname: 'GuestChef' },
          (ack) => resolve(ack)
        );
      });

      const guestRes = await guestJoinPromise;
      expect(guestRes.ok).toBe(true);
      expect(guestRes.match.players[0].nickname).toBe('HostChef');
      expect(guestRes.match.players[1]?.nickname).toBe('GuestChef');
      expect(guestRes.match.state).toBe('LOBBY');
    });

    it('returns ROOM_NOT_FOUND when attempting to join a non-existent room', async () => {
      const guest = await createClient();

      const res = await new Promise<any>((resolve) => {
        guest.emit(
          'room:join',
          { roomCode: 'NOEXIS', nickname: 'GuestChef' },
          (ack) => resolve(ack)
        );
      });

      expect(res.ok).toBe(false);
      expect(res.error.code).toBe('ROOM_NOT_FOUND');
    });

    it('returns ROOM_FULL when a third player attempts to join a 2-player room', async () => {
      const host = await createClient();
      const guest1 = await createClient();
      const guest2 = await createClient();

      const hostRes = await new Promise<any>((resolve) => {
        host.emit(
          'room:create',
          { nickname: 'Player1', tier: 'STREET' },
          (ack) => resolve(ack)
        );
      });
      const roomCode = hostRes.roomCode;

      await new Promise<any>((resolve) => {
        guest1.emit(
          'room:join',
          { roomCode, nickname: 'Player2' },
          (ack) => resolve(ack)
        );
      });

      const guest2Res = await new Promise<any>((resolve) => {
        guest2.emit(
          'room:join',
          { roomCode, nickname: 'Player3' },
          (ack) => resolve(ack)
        );
      });

      expect(guest2Res.ok).toBe(false);
      expect(guest2Res.error.code).toBe('ROOM_FULL');
    });

    it('handles lobby leave cleanly when player leaves or disconnects in LOBBY', async () => {
      const host = await createClient();
      const guest = await createClient();

      const hostRes = await new Promise<any>((resolve) => {
        host.emit(
          'room:create',
          { nickname: 'HostChef', tier: 'STREET' },
          (ack) => resolve(ack)
        );
      });
      const roomCode = hostRes.roomCode;

      await new Promise<any>((resolve) => {
        guest.emit(
          'room:join',
          { roomCode, nickname: 'GuestChef' },
          (ack) => resolve(ack)
        );
      });

      // Guest leaves
      const leaveRes = await new Promise<any>((resolve) => {
        guest.emit('room:leave', { roomCode }, (ack) => resolve(ack));
      });
      expect(leaveRes.ok).toBe(true);

      const room = roomManager.getRoom(roomCode);
      expect(room).toBeDefined();
      expect(room?.match.players[1]).toBeNull();
    });
  });
});
