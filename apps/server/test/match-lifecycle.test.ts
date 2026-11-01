import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
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

describe('Match Lifecycle End-to-End Realtime Tests', () => {
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
    // Use 0.01 scale: e.g. 15s -> 150ms, 5s -> 50ms, 3s -> 30ms, 1s -> 10ms
    const server = await buildServer({ timerScale: 0.01 });
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

  it('runs complete 5-round match from LOBBY to POST_MATCH and executes rematch', async () => {
    const host = await createClient();
    const guest = await createClient();

    // 1. Create Room
    const hostRes = await new Promise<any>((resolve) => {
      host.emit('room:create', { nickname: 'HostChef', tier: 'STREET' }, (ack) => resolve(ack));
    });
    const roomCode = hostRes.roomCode;

    // 2. Join Room
    await new Promise<any>((resolve) => {
      guest.emit('room:join', { roomCode, nickname: 'GuestChef' }, (ack) => resolve(ack));
    });

    // 3. Both ready up
    await new Promise<any>((resolve) => {
      host.emit('lobby:ready', { roomCode, ready: true }, (ack) => resolve(ack));
    });

    const tierConfirmedPromise = waitForState(host, (m) => m.state === 'TIER_CONFIRMED');
    await new Promise<any>((resolve) => {
      guest.emit('lobby:ready', { roomCode, ready: true }, (ack) => resolve(ack));
    });

    await tierConfirmedPromise;

    // 4. Play through all 5 rounds
    for (let r = 0; r < 5; r++) {
      // Wait for BIDDING state
      const biddingState = await waitForState(host, (m) => m.state === 'BIDDING');
      const roundIndex = biddingState.currentRound!.roundIndex;
      expect(roundIndex).toBe(r);

      const basicIng = biddingState.currentRound!.availableIngredients.find((i) => i.isBasic)!;

      // Both players lock bids
      // Host picks basic ($0), Guest picks basic ($0)
      const hostLockPromise = new Promise<any>((resolve) => {
        host.emit(
          'bid:lock',
          {
            roomCode,
            roundIndex,
            ingredientId: basicIng.id,
            amount: 0,
            idempotencyKey: `h_r${r}`,
          },
          (ack) => resolve(ack)
        );
      });

      const guestLockPromise = new Promise<any>((resolve) => {
        guest.emit(
          'bid:lock',
          {
            roomCode,
            roundIndex,
            ingredientId: basicIng.id,
            amount: 0,
            idempotencyKey: `g_r${r}`,
          },
          (ack) => resolve(ack)
        );
      });

      const [hLockRes, gLockRes] = await Promise.all([hostLockPromise, guestLockPromise]);
      expect(hLockRes.ok).toBe(true);
      expect(gLockRes.ok).toBe(true);
    }

    // 5. Wait for POST_MATCH
    const postMatchState = await waitForState(host, (m) => m.state === 'POST_MATCH', 8000);
    expect(postMatchState.state).toBe('POST_MATCH');
    expect(postMatchState.result).toBeDefined();
    expect(postMatchState.players[0]?.dish).toHaveLength(5);

    // 6. Test Rematch
    const rematchStatePromise = waitForState(
      host,
      (m) => m.state === 'TIER_CONFIRMED' || m.state === 'MATCH_INTRO' || m.state === 'ROUND_REVEAL' || m.state === 'BIDDING'
    );

    const hostRematchPromise = new Promise<any>((resolve) => {
      host.emit('post_match:rematch', { roomCode }, (ack) => resolve(ack));
    });
    const guestRematchPromise = new Promise<any>((resolve) => {
      guest.emit('post_match:rematch', { roomCode }, (ack) => resolve(ack));
    });

    const [hRematchRes, gRematchRes] = await Promise.all([
      hostRematchPromise,
      guestRematchPromise,
    ]);
    expect(hRematchRes.ok).toBe(true);
    expect(gRematchRes.ok).toBe(true);

    // After rematch, match resets and budget is $20
    const rematchState = await rematchStatePromise;
    expect(rematchState.players[0]!.budget).toBe(20);
    expect(rematchState.players[1]!.budget).toBe(20);
  }, 15000);

  it('triggers auto-timeout bid when players do not lock during BIDDING without stalling match', async () => {
    const host = await createClient();
    const guest = await createClient();

    const hostRes = await new Promise<any>((resolve) => {
      host.emit('room:create', { nickname: 'LazyHost', tier: 'STREET' }, (ack) => resolve(ack));
    });
    const roomCode = hostRes.roomCode;

    await new Promise<any>((resolve) => {
      guest.emit('room:join', { roomCode, nickname: 'LazyGuest' }, (ack) => resolve(ack));
    });

    // Both ready up
    await new Promise<any>((resolve) => {
      host.emit('lobby:ready', { roomCode, ready: true }, (ack) => resolve(ack));
    });
    await new Promise<any>((resolve) => {
      guest.emit('lobby:ready', { roomCode, ready: true }, (ack) => resolve(ack));
    });

    // Wait for BIDDING state
    await waitForState(host, (m) => m.state === 'BIDDING');

    // Neither player sends bid:lock.
    // The server timer (15s * 0.01 = 150ms) should fire, auto-locking $0 bids and transitioning to RESOLVE -> ROUND_END
    const roundEndState = await waitForState(
      host,
      (m) => m.state === 'ROUND_END',
      4000
    );
    expect(roundEndState.state).toBe('ROUND_END');
    expect(roundEndState.currentRound).toBeDefined();
    expect(roundEndState.currentRound?.resolution).toBeDefined();
    const resolution = roundEndState.currentRound!.resolution!;
    expect(resolution.outcomeType).toBeDefined();
    // Both received basic fallback
    for (const award of Object.values(resolution.awardsByPlayer)) {
      expect(award.ingredient.isBasic).toBe(true);
      expect(award.ingredient.basePrice).toBe(0);
    }
  }, 10000);

  it('player leaves room in POST_MATCH: cleanly leaves room without triggering forfeit', async () => {
    const host = await createClient();
    const guest = await createClient();

    const hostRes = await new Promise<any>((resolve) => {
      host.emit('room:create', { nickname: 'HostChef', tier: 'STREET' }, (ack) => resolve(ack));
    });
    const roomCode = hostRes.roomCode;

    await new Promise<any>((resolve) => {
      guest.emit('room:join', { roomCode, nickname: 'GuestChef' }, (ack) => resolve(ack));
    });

    await new Promise<any>((resolve) => {
      host.emit('lobby:ready', { roomCode, ready: true }, (ack) => resolve(ack));
    });
    await new Promise<any>((resolve) => {
      guest.emit('lobby:ready', { roomCode, ready: true }, (ack) => resolve(ack));
    });

    // Play through 5 rounds to POST_MATCH
    for (let r = 0; r < 5; r++) {
      const currentBidding = await waitForState(host, (m) => m.state === 'BIDDING');
      const basicIng = currentBidding.currentRound!.availableIngredients.find((i) => i.isBasic)!;

      await Promise.all([
        new Promise<any>((resolve) => {
          host.emit(
            'bid:lock',
            {
              roomCode,
              roundIndex: r,
              ingredientId: basicIng.id,
              amount: 0,
              idempotencyKey: `h_r${r}_leave_test`,
            },
            (ack) => resolve(ack)
          );
        }),
        new Promise<any>((resolve) => {
          guest.emit(
            'bid:lock',
            {
              roomCode,
              roundIndex: r,
              ingredientId: basicIng.id,
              amount: 0,
              idempotencyKey: `g_r${r}_leave_test`,
            },
            (ack) => resolve(ack)
          );
        }),
      ]);
    }

    // Wait for POST_MATCH
    const postMatchState = await waitForState(host, (m) => m.state === 'POST_MATCH', 8000);
    expect(postMatchState.state).toBe('POST_MATCH');
    const originalWinner = postMatchState.result?.winnerId;

    // Set up broadcast listener on host to verify no stray state_sync or forfeit arrives after leaving
    let straySyncReceived = false;
    let forfeitReceived = false;
    host.on('match:state_sync', () => {
      straySyncReceived = true;
    });
    host.on('match:forfeited', () => {
      forfeitReceived = true;
    });

    // Host navigates Home (room:leave)
    const leaveRes = await new Promise<any>((resolve) => {
      host.emit('room:leave', { roomCode }, (ack) => resolve(ack));
    });
    expect(leaveRes.ok).toBe(true);

    // Wait 500ms to ensure no timers trigger a forfeit or stray sync
    await new Promise((r) => setTimeout(r, 500));

    expect(straySyncReceived).toBe(false);
    expect(forfeitReceived).toBe(false);

    // Check server room state: host is detached from room, room has not forfeited
    const room = roomManager.getRoom(roomCode);
    if (room) {
      expect(room.match.result?.winReason).not.toBe('FORFEIT');
      expect(room.match.result?.winnerId).toBe(originalWinner);
    }
  }, 15000);
});
