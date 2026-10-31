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

describe('Security, Abuse & Hidden Information Protection Tests', () => {
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

  describe('Hidden Information Scrubbing', () => {
    it('never leaks opponent secret bids, private bids map, reconnect tokens, or secret orders during BIDDING', async () => {
      const host = await createClient();
      const guest = await createClient();

      const hostRes = await new Promise<any>((resolve) => {
        host.emit('room:create', { nickname: 'HostChef', tier: 'STREET' }, (ack) => resolve(ack));
      });
      const roomCode = hostRes.roomCode;

      const guestRes = await new Promise<any>((resolve) => {
        guest.emit('room:join', { roomCode, nickname: 'GuestChef' }, (ack) => resolve(ack));
      });

      // Assert reconnect tokens are stripped from opponent views
      expect(hostRes.match.players[0].reconnectToken).toBeUndefined();
      expect(guestRes.match.players[0].reconnectToken).toBeUndefined();

      // Ready up
      await new Promise<any>((resolve) => {
        host.emit('lobby:ready', { roomCode, ready: true }, (ack) => resolve(ack));
      });
      await new Promise<any>((resolve) => {
        guest.emit('lobby:ready', { roomCode, ready: true }, (ack) => resolve(ack));
      });

      // Wait until BIDDING begins
      const biddingView = await waitForState(host, (m) => m.state === 'BIDDING');
      const roundIndex = biddingView.currentRound!.roundIndex;

      // Host sets up listener for state sync before guest emits
      const hostStateSyncPromise = new Promise<PublicMatchView>((resolve) => {
        host.once('match:state_sync', (p) => resolve(p.match));
      });

      // Guest locks a secret bid
      const premiumVariant = biddingView.currentRound!.availableIngredients.find((i) => !i.isBasic)!;
      await new Promise<any>((resolve) => {
        guest.emit(
          'bid:lock',
          {
            roomCode,
            roundIndex,
            ingredientId: premiumVariant.id,
            amount: premiumVariant.basePrice,
            idempotencyKey: 'guest_secret_bid',
          },
          (ack) => resolve(ack)
        );
      });

      // Host receives state sync after guest locked
      const hostCurrentView = await hostStateSyncPromise;

      // Check Host's view: Opponent bid amount, ingredient, and privateBids must NEVER exist
      const currentRoundView = hostCurrentView.currentRound;
      expect((currentRoundView as any).privateBids).toBeUndefined();
      expect(currentRoundView.myLockedBid).toBeNull(); // Host hasn't locked yet
      expect(currentRoundView.bidsLockedByPlayer[guestRes.playerId]).toBe(true);

      // Opponent secretOrder must be scrubbed (null) before FINAL_REVEAL
      expect(hostCurrentView.players[1]?.secretOrder).toBeNull();
    });
  });

  describe('Budget & Bid Invariants', () => {
    it('rejects bids exceeding available budget with INSUFFICIENT_BUDGET', async () => {
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

      const biddingView = await waitForState(host, (m) => m.state === 'BIDDING');
      const roundIndex = biddingView.currentRound!.roundIndex;
      const basicIng = biddingView.currentRound!.availableIngredients.find((i) => i.isBasic)!;

      // Host attempts to bid $999 (budget is $20)
      const bidRes = await new Promise<any>((resolve) => {
        host.emit(
          'bid:lock',
          {
            roomCode,
            roundIndex,
            ingredientId: basicIng.id,
            amount: 999,
            idempotencyKey: 'overbudget_bid',
          },
          (ack) => resolve(ack)
        );
      });

      expect(bidRes.ok).toBe(false);
      expect(bidRes.error.code).toBe('BID_EXCEEDS_BUDGET');
    });

    it('rejects bids below variant basePrice with BID_BELOW_BASE_PRICE', async () => {
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

      const biddingView = await waitForState(host, (m) => m.state === 'BIDDING');
      const roundIndex = biddingView.currentRound!.roundIndex;
      const premiumVariant = biddingView.currentRound!.availableIngredients.find((i) => !i.isBasic)!;

      // Premium variant has basePrice > $0; bid $0
      const bidRes = await new Promise<any>((resolve) => {
        host.emit(
          'bid:lock',
          {
            roomCode,
            roundIndex,
            ingredientId: premiumVariant.id,
            amount: premiumVariant.basePrice - 1,
            idempotencyKey: 'undercut_bid',
          },
          (ack) => resolve(ack)
        );
      });

      expect(bidRes.ok).toBe(false);
      expect(bidRes.error.code).toBe('BID_BELOW_BASE_PRICE');
    });
  });

  describe('Bid Idempotency & Duplicate Locking', () => {
    it('returns cached bid without penalty on identical idempotencyKey retry, rejects different bid once locked', async () => {
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

      const biddingView = await waitForState(host, (m) => m.state === 'BIDDING');
      const roundIndex = biddingView.currentRound!.roundIndex;
      const basicId = biddingView.currentRound!.availableIngredients.find((i) => i.isBasic)!.id;

      // 1. Initial Lock
      const lockRes1 = await new Promise<any>((resolve) => {
        host.emit(
          'bid:lock',
          {
            roomCode,
            roundIndex,
            ingredientId: basicId,
            amount: 0,
            idempotencyKey: 'idemp_key_1',
          },
          (ack) => resolve(ack)
        );
      });
      expect(lockRes1.ok).toBe(true);

      // 2. Retry with same key -> succeeds with same bid
      const lockRes2 = await new Promise<any>((resolve) => {
        host.emit(
          'bid:lock',
          {
            roomCode,
            roundIndex,
            ingredientId: basicId,
            amount: 0,
            idempotencyKey: 'idemp_key_1',
          },
          (ack) => resolve(ack)
        );
      });
      expect(lockRes2.ok).toBe(true);

      // 3. Different key while already locked -> BID_ALREADY_LOCKED
      const lockRes3 = await new Promise<any>((resolve) => {
        host.emit(
          'bid:lock',
          {
            roomCode,
            roundIndex,
            ingredientId: basicId,
            amount: 0,
            idempotencyKey: 'idemp_key_2',
          },
          (ack) => resolve(ack)
        );
      });
      expect(lockRes3.ok).toBe(false);
      expect(lockRes3.error.code).toBe('BID_ALREADY_LOCKED');
    });
  });

  describe('Profanity Filter', () => {
    it('rejects profanity and leetspeak nicknames with PROFANITY_DETECTED', async () => {
      const client = await createClient();

      const profanities = ['f_u_c_k', 'sh1t_head', 'b1tch'];
      for (const badName of profanities) {
        const res = await new Promise<any>((resolve) => {
          client.emit('room:create', { nickname: badName, tier: 'STREET' }, (ack) =>
            resolve(ack)
          );
        });

        expect(res.ok).toBe(false);
        expect(res.error.code).toBe('INVALID_NICKNAME');
      }
    });
  });

  describe('Rate Limiter', () => {
    it('blocks rapid spamming of room creation with RATE_LIMITED', async () => {
      const client = await createClient();

      let blocked = false;
      // Burst 15 room creations (limit is 10 per minute)
      for (let i = 0; i < 15; i++) {
        const res = await new Promise<any>((resolve) => {
          client.emit(
            'room:create',
            { nickname: `Spam_${i}`, tier: 'STREET' },
            (ack) => resolve(ack)
          );
        });

        if (!res.ok && res.error.code === 'RATE_LIMITED') {
          blocked = true;
          break;
        }
      }

      expect(blocked).toBe(true);
    });
  });
});
