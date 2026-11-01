import type { Server as SocketIOServer, Socket } from 'socket.io';
import type {
  ClientToServerEvents,
  ServerToClientEvents,
} from '@bidding-kitchen/shared';
import { validateNickname } from '../filters/profanity.js';
import { globalMetrics } from '../metrics.js';
import type { RoomManager } from '../rooms/room-manager.js';
import { RateLimiter } from './rate-limiter.js';
import {
  CreateRoomPayloadSchema,
  JoinRoomPayloadSchema,
  LockBidPayloadSchema,
  NewTierPayloadSchema,
  ReadyPayloadSchema,
  ReconnectPayloadSchema,
  RematchPayloadSchema,
  SelectTierPayloadSchema,
  TelemetryPayloadSchema,
} from './schemas.js';

export function registerSocketHandlers(
  io: SocketIOServer<ClientToServerEvents, ServerToClientEvents>,
  roomManager: RoomManager,
  rateLimiter = new RateLimiter(),
): void {
  io.on('connection', (socket: Socket<ClientToServerEvents, ServerToClientEvents>) => {
    // 1. room:create
    socket.on('room:create', (payload, ack) => {
      if (!rateLimiter.check(`${socket.id}:room`, 10, 60000)) {
        return ack({
          ok: false,
          error: { code: 'RATE_LIMITED', message: 'Too many room requests. Please wait.' },
        });
      }

      const parsed = CreateRoomPayloadSchema.safeParse(payload);
      if (!parsed.success) {
        return ack({
          ok: false,
          error: { code: 'INVALID_STATE_ACTION', message: parsed.error.issues[0]?.message || 'Invalid payload' },
        });
      }

      const nameCheck = validateNickname(parsed.data.nickname);
      if (!nameCheck.ok) {
        return ack(nameCheck);
      }

      const result = roomManager.createRoom(
        { nickname: nameCheck.nickname, tier: parsed.data.tier },
        socket,
      );

      globalMetrics.increment('matchesCreated');

      return ack({
        ok: true,
        ...result,
      });
    });

    // 2. room:join
    socket.on('room:join', (payload, ack) => {
      if (!rateLimiter.check(`${socket.id}:room`, 10, 60000)) {
        return ack({
          ok: false,
          error: { code: 'RATE_LIMITED', message: 'Too many room requests. Please wait.' },
        });
      }

      const parsed = JoinRoomPayloadSchema.safeParse(payload);
      if (!parsed.success) {
        return ack({
          ok: false,
          error: { code: 'INVALID_STATE_ACTION', message: parsed.error.issues[0]?.message || 'Invalid payload' },
        });
      }

      const nameCheck = validateNickname(parsed.data.nickname);
      if (!nameCheck.ok) {
        return ack(nameCheck);
      }

      const result = roomManager.joinRoom(
        { roomCode: parsed.data.roomCode, nickname: nameCheck.nickname },
        socket,
      );

      return ack(result);
    });

    // 3. room:reconnect
    socket.on('room:reconnect', (payload, ack) => {
      const parsed = ReconnectPayloadSchema.safeParse(payload);
      if (!parsed.success) {
        return ack({
          ok: false,
          error: { code: 'UNAUTHORIZED_RECONNECT', message: 'Invalid reconnect payload' },
        });
      }

      const room = roomManager.getRoom(parsed.data.roomCode);
      if (!room) {
        return ack({
          ok: false,
          error: { code: 'ROOM_NOT_FOUND', message: 'Room not found' },
        });
      }

      const result = room.handleReconnect(socket, parsed.data);
      return ack(result);
    });

    // 4. room:leave
    socket.on('room:leave', (payload, ack) => {
      roomManager.handleSocketDisconnect(socket.id);
      return ack({ ok: true });
    });

    // 5. lobby:select_tier
    socket.on('lobby:select_tier', (payload, ack) => {
      if (!rateLimiter.check(`${socket.id}:action`, 15, 5000)) {
        return ack({
          ok: false,
          error: { code: 'RATE_LIMITED', message: 'Too many actions. Please slow down.' },
        });
      }

      const parsed = SelectTierPayloadSchema.safeParse(payload);
      if (!parsed.success) {
        return ack({
          ok: false,
          error: { code: 'INVALID_STATE_ACTION', message: 'Invalid select tier payload' },
        });
      }

      const room = roomManager.getRoom(parsed.data.roomCode);
      if (!room) {
        return ack({
          ok: false,
          error: { code: 'ROOM_NOT_FOUND', message: 'Room not found' },
        });
      }

      const playerId = room.getPlayerIdBySocket(socket.id);
      if (!playerId) {
        return ack({
          ok: false,
          error: { code: 'UNAUTHORIZED_RECONNECT', message: 'Socket not bound to player in room' },
        });
      }

      const result = room.handleSelectTier(playerId, parsed.data.tier);
      return ack(result);
    });

    // 6. lobby:ready
    socket.on('lobby:ready', (payload, ack) => {
      if (!rateLimiter.check(`${socket.id}:action`, 15, 5000)) {
        return ack({
          ok: false,
          error: { code: 'RATE_LIMITED', message: 'Too many actions. Please slow down.' },
        });
      }

      const parsed = ReadyPayloadSchema.safeParse(payload);
      if (!parsed.success) {
        return ack({
          ok: false,
          error: { code: 'INVALID_STATE_ACTION', message: 'Invalid ready payload' },
        });
      }

      const room = roomManager.getRoom(parsed.data.roomCode);
      if (!room) {
        return ack({
          ok: false,
          error: { code: 'ROOM_NOT_FOUND', message: 'Room not found' },
        });
      }

      const playerId = room.getPlayerIdBySocket(socket.id);
      if (!playerId) {
        return ack({
          ok: false,
          error: { code: 'UNAUTHORIZED_RECONNECT', message: 'Socket not bound to player in room' },
        });
      }

      const result = room.handlePlayerReady(playerId, parsed.data.ready);
      return ack(result);
    });

    // 7. match:tutorial_done
    socket.on('match:tutorial_done', (payload, ack) => {
      const room = roomManager.getRoom(payload.roomCode);
      if (!room) {
        return ack({
          ok: false,
          error: { code: 'ROOM_NOT_FOUND', message: 'Room not found' },
        });
      }

      const playerId = room.getPlayerIdBySocket(socket.id);
      if (!playerId) {
        return ack({
          ok: false,
          error: { code: 'UNAUTHORIZED_RECONNECT', message: 'Socket not bound' },
        });
      }

      room.handleTutorialDone(playerId);
      globalMetrics.increment('tutorialCompletions');
      return ack({ ok: true });
    });

    // 8. bid:lock
    socket.on('bid:lock', (payload, ack) => {
      if (!rateLimiter.check(`${socket.id}:action`, 15, 5000)) {
        return ack({
          ok: false,
          error: { code: 'RATE_LIMITED', message: 'Too many actions. Please slow down.' },
        });
      }

      const parsed = LockBidPayloadSchema.safeParse(payload);
      if (!parsed.success) {
        const isAmountIssue = parsed.error.issues.some((i) => i.path.includes('amount'));
        return ack({
          ok: false,
          error: {
            code: isAmountIssue ? 'BID_NOT_INTEGER' : 'INVALID_STATE_ACTION',
            message: parsed.error.issues[0]?.message || 'Invalid bid payload',
          },
        });
      }

      const room = roomManager.getRoom(parsed.data.roomCode);
      if (!room) {
        return ack({
          ok: false,
          error: { code: 'ROOM_NOT_FOUND', message: 'Room not found' },
        });
      }

      const playerId = room.getPlayerIdBySocket(socket.id);
      if (!playerId) {
        return ack({
          ok: false,
          error: { code: 'UNAUTHORIZED_RECONNECT', message: 'Socket not recognized in room' },
        });
      }

      const result = room.handleLockBid(playerId, parsed.data);
      if (result.ok) {
        globalMetrics.increment('bidsLockedTotal');
      }

      return ack(result);
    });

    // 9. post_match:rematch
    socket.on('post_match:rematch', (payload, ack) => {
      const parsed = RematchPayloadSchema.safeParse(payload);
      if (!parsed.success) {
        return ack({
          ok: false,
          error: { code: 'INVALID_STATE_ACTION', message: 'Invalid rematch payload' },
        });
      }

      const room = roomManager.getRoom(parsed.data.roomCode);
      if (!room) {
        return ack({
          ok: false,
          error: { code: 'ROOM_NOT_FOUND', message: 'Room not found' },
        });
      }

      const playerId = room.getPlayerIdBySocket(socket.id);
      if (!playerId) {
        return ack({
          ok: false,
          error: { code: 'UNAUTHORIZED_RECONNECT', message: 'Socket not recognized' },
        });
      }

      const result = room.handleRematch(playerId);
      if (result.ok) {
        globalMetrics.increment('rematchesStarted');
      }

      return ack(result);
    });

    // 10. post_match:new_tier
    socket.on('post_match:new_tier', (payload, ack) => {
      const parsed = NewTierPayloadSchema.safeParse(payload);
      if (!parsed.success) {
        return ack({
          ok: false,
          error: { code: 'INVALID_STATE_ACTION', message: 'Invalid payload' },
        });
      }

      const room = roomManager.getRoom(parsed.data.roomCode);
      if (!room) {
        return ack({
          ok: false,
          error: { code: 'ROOM_NOT_FOUND', message: 'Room not found' },
        });
      }

      const playerId = room.getPlayerIdBySocket(socket.id);
      if (!playerId) {
        return ack({
          ok: false,
          error: { code: 'UNAUTHORIZED_RECONNECT', message: 'Socket not recognized' },
        });
      }

      const result = room.handleNewTier(playerId, parsed.data.tier);
      return ack(result);
    });

    // 11. queue:join (matchmaking stub)
    socket.on('queue:join', (_payload, ack) => {
      const ticketId = `t_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
      return ack({ ok: true, ticketId });
    });

    // 12. queue:leave (matchmaking stub)
    socket.on('queue:leave', (_payload, ack) => {
      return ack({ ok: true });
    });

    // 13. telemetry:track
    socket.on('telemetry:track', (payload) => {
      const parsed = TelemetryPayloadSchema.safeParse(payload);
      if (parsed.success) {
        if (parsed.data.event === 'SHARE_CLICKED') {
          globalMetrics.increment('shareClicks');
        } else if (parsed.data.event === 'TUTORIAL_COMPLETE') {
          globalMetrics.increment('tutorialCompletions');
        } else if (parsed.data.event === 'REMATCH_CLICKED') {
          globalMetrics.increment('rematchesStarted');
        } else if (parsed.data.event === 'FIRST_BID_LOCKED') {
          globalMetrics.increment('firstBidCount');
          const ms =
            typeof parsed.data.metadata?.['msSinceRoundStart'] === 'number'
              ? parsed.data.metadata['msSinceRoundStart']
              : 0;
          globalMetrics.increment('totalTimeToFirstBidMs', ms);
        }
      }
    });

    // Disconnect event
    socket.on('disconnect', () => {
      roomManager.handleSocketDisconnect(socket.id);
      rateLimiter.clear(`${socket.id}:action`);
      rateLimiter.clear(`${socket.id}:room`);
    });
  });
}
