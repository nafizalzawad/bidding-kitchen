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
  timeoutMs = 6000,
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

describe('Play vs System (AI Bot) Realtime Tests', () => {
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
    // Use fast timer scale (0.01) for instantaneous testing
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

  it('creates bot room with Easy, Medium, and Hard difficulty', async () => {
    const client = await createClient();

    // 1. Easy Bot Room
    const easyRes = await new Promise<any>((resolve) => {
      client.emit(
        'room:create_bot',
        { nickname: 'ChefHuman', tier: 'STREET', difficulty: 'EASY' },
        (ack) => resolve(ack),
      );
    });

    expect(easyRes.ok).toBe(true);
    expect(easyRes.match.players[0].nickname).toBe('ChefHuman');
    expect(easyRes.match.players[1].nickname).toBe('Chef Bot (Easy)');
    expect(easyRes.match.players[1].isBot).toBe(true);
    expect(easyRes.match.players[1].botDifficulty).toBe('EASY');
    expect(easyRes.match.players[1].ready).toBe(true);

    // 2. Medium Bot Room (Bistro)
    const mediumRes = await new Promise<any>((resolve) => {
      client.emit(
        'room:create_bot',
        { nickname: 'ChefHuman', tier: 'BISTRO', difficulty: 'MEDIUM' },
        (ack) => resolve(ack),
      );
    });

    expect(mediumRes.ok).toBe(true);
    expect(mediumRes.match.tier).toBe('BISTRO');
    expect(mediumRes.match.players[1].nickname).toBe('Chef Bot (Medium)');
    expect(mediumRes.match.players[1].isBot).toBe(true);
    expect(mediumRes.match.players[1].botDifficulty).toBe('MEDIUM');

    // 3. Hard Bot Room (Chefs Table)
    const hardRes = await new Promise<any>((resolve) => {
      client.emit(
        'room:create_bot',
        { nickname: 'ChefHuman', tier: 'CHEFS_TABLE', difficulty: 'HARD' },
        (ack) => resolve(ack),
      );
    });

    expect(hardRes.ok).toBe(true);
    expect(hardRes.match.tier).toBe('CHEFS_TABLE');
    expect(hardRes.match.players[1].nickname).toBe('Chef Bot (Hard)');
    expect(hardRes.match.players[1].isBot).toBe(true);
    expect(hardRes.match.players[1].botDifficulty).toBe('HARD');
  });

  it('plays a full match against Hard bot from LOBBY to POST_MATCH and triggers rematch', async () => {
    const client = await createClient();

    const createRes = await new Promise<any>((resolve) => {
      client.emit(
        'room:create_bot',
        { nickname: 'Gordon', tier: 'STREET', difficulty: 'HARD' },
        (ack) => resolve(ack),
      );
    });

    expect(createRes.ok).toBe(true);
    const roomCode = createRes.roomCode;
    const humanPlayerId = createRes.playerId;

    // Human hits ready
    await new Promise<any>((resolve) => {
      client.emit('lobby:ready', { roomCode, ready: true }, (ack) => resolve(ack));
    });

    // Wait for BIDDING state
    const biddingMatch = await waitForState(client, (m) => m.state === 'BIDDING');
    expect(biddingMatch.state).toBe('BIDDING');

    // Bot will automatically lock in; human locks in too
    const round0 = biddingMatch.currentRound!;
    const chosenIngredient = round0.availableIngredients[0]!;

    const bidRes = await new Promise<any>((resolve) => {
      client.emit(
        'bid:lock',
        {
          roomCode,
          roundIndex: 0,
          ingredientId: chosenIngredient.id,
          amount: chosenIngredient.basePrice,
          idempotencyKey: `bid-${roomCode}-${humanPlayerId}-0`,
        },
        (ack) => resolve(ack),
      );
    });
    expect(bidRes.ok).toBe(true);

    // Play remaining rounds until POST_MATCH
    // Each round in BIDDING, human submits basic price bid
    for (let r = 1; r < 5; r++) {
      const currentBidding = await waitForState(
        client,
        (m) => m.state === 'BIDDING' && m.roundIndex === r,
        8000,
      );
      const ingredient = currentBidding.currentRound!.availableIngredients[0]!;

      await new Promise<any>((resolve) => {
        client.emit(
          'bid:lock',
          {
            roomCode,
            roundIndex: r,
            ingredientId: ingredient.id,
            amount: ingredient.basePrice,
            idempotencyKey: `bid-${roomCode}-${humanPlayerId}-${r}`,
          },
          (ack) => resolve(ack),
        );
      });
    }

    // Wait for POST_MATCH
    const postMatch = await waitForState(client, (m) => m.state === 'POST_MATCH', 10000);
    expect(postMatch.state).toBe('POST_MATCH');
    expect(postMatch.result).not.toBeNull();
    expect(postMatch.result?.winnerTitle).toBeDefined();

    // Human requests rematch against bot
    const rematchRes = await new Promise<any>((resolve) => {
      client.emit('post_match:rematch', { roomCode }, (ack) => resolve(ack));
    });
    expect(rematchRes.ok).toBe(true);

    // Bot should have auto-readied, transitioning back to TIER_CONFIRMED
    const rematchMatch = await waitForState(
      client,
      (m) => m.state === 'TIER_CONFIRMED' || m.state === 'BIDDING',
      6000,
    );
    expect(rematchMatch.roundIndex).toBe(0);
  });
});
