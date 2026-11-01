import type { Server as SocketIOServer, Socket } from 'socket.io';
import {
  addPlayerToMatch,
  createMatch,
  getBotArchetype,
  getBotNickname,
  DEFAULT_V15_MATCH_CONFIG,
  type BotDifficulty,
  type ClientToServerEvents,
  type GameError,
  type PublicMatchView,
  type ServerToClientEvents,
  type TierId,
} from '@bidding-kitchen/shared';
import { MatchRoom, type MatchRoomOptions } from './match-room.js';
import { sanitizeMatchForPlayer } from './state-sanitizer.js';

export type RoomManagerOptions = MatchRoomOptions;

const ROOM_CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export class RoomManager {
  private rooms = new Map<string, MatchRoom>();
  private socketRoomMap = new Map<string, string>(); // socketId -> roomCode
  private io: SocketIOServer<ClientToServerEvents, ServerToClientEvents>;
  private options: MatchRoomOptions;
  private sweepTimer: NodeJS.Timeout | null = null;

  constructor(
    io: SocketIOServer<ClientToServerEvents, ServerToClientEvents>,
    options: MatchRoomOptions = {},
  ) {
    this.io = io;
    this.options = {
      ...options,
      onRoomDestroyed: (roomCode) => {
        this.rooms.delete(roomCode);
        options.onRoomDestroyed?.(roomCode);
      },
    };

    this.sweepTimer = setInterval(() => {
      this.sweepExpiredRooms();
    }, 60_000);
    if (this.sweepTimer.unref) {
      this.sweepTimer.unref();
    }
  }

  /**
   * Generates a collision-free 6-character room code using unambiguous uppercase characters.
   */
  public generateRoomCode(): string {
    let code = '';
    let attempts = 0;
    do {
      code = '';
      for (let i = 0; i < 6; i++) {
        const idx = Math.floor(Math.random() * ROOM_CODE_CHARS.length);
        code += ROOM_CODE_CHARS[idx];
      }
      attempts++;
    } while (this.rooms.has(code) && attempts < 1000);

    return code;
  }

  public createRoom(
    creatorInfo: { nickname: string; tier: TierId },
    socket: Socket,
  ): {
    roomCode: string;
    playerId: string;
    reconnectToken: string;
    match: PublicMatchView;
  } {
    const roomCode = this.generateRoomCode();
    const now = Date.now();
    const initialMatch = createMatch({
      roomCode,
      tier: creatorInfo.tier,
      config: DEFAULT_V15_MATCH_CONFIG,
      seed: Math.floor(Math.random() * 1000000),
      now,
    });

    const playerId = `p_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
    const reconnectToken = `tok_${playerId}_${Math.floor(Math.random() * 1000000)}`;

    const matchWithPlayer = addPlayerToMatch(initialMatch, {
      id: playerId,
      nickname: creatorInfo.nickname,
      reconnectToken,
    });

    const room = new MatchRoom(roomCode, matchWithPlayer, this.io, this.options);
    room.bindSocket(playerId, socket);

    this.rooms.set(roomCode, room);
    this.socketRoomMap.set(socket.id, roomCode);

    const publicView = sanitizeMatchForPlayer(room.match, playerId, now);

    return {
      roomCode,
      playerId,
      reconnectToken,
      match: publicView,
    };
  }

  public createBotRoom(
    creatorInfo: { nickname: string; tier: TierId; difficulty: BotDifficulty },
    socket: Socket,
  ): {
    roomCode: string;
    playerId: string;
    reconnectToken: string;
    match: PublicMatchView;
  } {
    const roomCode = this.generateRoomCode();
    const now = Date.now();
    const initialMatch = createMatch({
      roomCode,
      tier: creatorInfo.tier,
      config: DEFAULT_V15_MATCH_CONFIG,
      seed: Math.floor(Math.random() * 1000000),
      now,
    });

    const playerId = `p_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
    const reconnectToken = `tok_${playerId}_${Math.floor(Math.random() * 1000000)}`;

    const matchWithHuman = addPlayerToMatch(initialMatch, {
      id: playerId,
      nickname: creatorInfo.nickname,
      reconnectToken,
      isBot: false,
    });

    const botId = `bot_${creatorInfo.difficulty.toLowerCase()}_${Date.now()}`;
    const botNickname = getBotNickname(creatorInfo.difficulty);
    const botArchetype = getBotArchetype(creatorInfo.difficulty);

    const matchWithBoth = addPlayerToMatch(matchWithHuman, {
      id: botId,
      nickname: botNickname,
      reconnectToken: `tok_${botId}`,
      isBot: true,
      botDifficulty: creatorInfo.difficulty,
      ready: true,
    });

    const room = new MatchRoom(roomCode, matchWithBoth, this.io, this.options);
    room.botConfig = {
      id: botId,
      difficulty: creatorInfo.difficulty,
      archetype: botArchetype,
    };
    room.bindSocket(playerId, socket);

    this.rooms.set(roomCode, room);
    this.socketRoomMap.set(socket.id, roomCode);

    const publicView = sanitizeMatchForPlayer(room.match, playerId, now);

    return {
      roomCode,
      playerId,
      reconnectToken,
      match: publicView,
    };
  }

  public createMatchedRoom(
    tier: TierId,
    ticketA: { socketId: string; nickname: string },
    ticketB: { socketId: string; nickname: string },
    socketA?: Socket,
    socketB?: Socket,
  ): {
    roomCode: string;
    playerA: { id: string; reconnectToken: string; match: PublicMatchView };
    playerB: { id: string; reconnectToken: string; match: PublicMatchView };
  } {
    const roomCode = this.generateRoomCode();
    const now = Date.now();
    let match = createMatch({
      roomCode,
      tier,
      config: DEFAULT_V15_MATCH_CONFIG,
      seed: Math.floor(Math.random() * 1000000),
      now,
    });

    const playerAId = `p_${now}_${Math.floor(Math.random() * 10000)}`;
    const tokenA = `tok_${playerAId}_${Math.floor(Math.random() * 1000000)}`;
    const playerBId = `p_${now + 1}_${Math.floor(Math.random() * 10000)}`;
    const tokenB = `tok_${playerBId}_${Math.floor(Math.random() * 1000000)}`;

    match = addPlayerToMatch(match, {
      id: playerAId,
      nickname: ticketA.nickname,
      reconnectToken: tokenA,
    });

    match = addPlayerToMatch(match, {
      id: playerBId,
      nickname: ticketB.nickname,
      reconnectToken: tokenB,
    });

    // Both players ready immediately in matched queue
    match.players[0]!.ready = true;
    match.players[1]!.ready = true;

    const room = new MatchRoom(roomCode, match, this.io, this.options);

    const actualSocketA = socketA ?? this.io.sockets.sockets.get(ticketA.socketId);
    const actualSocketB = socketB ?? this.io.sockets.sockets.get(ticketB.socketId);

    if (actualSocketA) {
      room.bindSocket(playerAId, actualSocketA);
      this.socketRoomMap.set(actualSocketA.id, roomCode);
    }
    if (actualSocketB) {
      room.bindSocket(playerBId, actualSocketB);
      this.socketRoomMap.set(actualSocketB.id, roomCode);
    }

    this.rooms.set(roomCode, room);

    // Advance room state to TIER_CONFIRMED
    room.handlePlayerReady(playerAId, true);

    const viewA = sanitizeMatchForPlayer(room.match, playerAId, now);
    const viewB = sanitizeMatchForPlayer(room.match, playerBId, now);

    if (actualSocketA) {
      actualSocketA.emit('queue:matched', {
        roomCode,
        playerId: playerAId,
        reconnectToken: tokenA,
        match: viewA,
      });
    }

    if (actualSocketB) {
      actualSocketB.emit('queue:matched', {
        roomCode,
        playerId: playerBId,
        reconnectToken: tokenB,
        match: viewB,
      });
    }

    return {
      roomCode,
      playerA: { id: playerAId, reconnectToken: tokenA, match: viewA },
      playerB: { id: playerBId, reconnectToken: tokenB, match: viewB },
    };
  }

  public joinRoom(
    joinInfo: { roomCode: string; nickname: string },
    socket: Socket,
  ):
    | {
        ok: true;
        roomCode: string;
        playerId: string;
        reconnectToken: string;
        match: PublicMatchView;
      }
    | { ok: false; error: GameError } {
    const room = this.rooms.get(joinInfo.roomCode.toUpperCase());
    if (!room) {
      return {
        ok: false,
        error: { code: 'ROOM_NOT_FOUND', message: `Room ${joinInfo.roomCode} does not exist` },
      };
    }

    if (room.match.players[0] !== null && room.match.players[1] !== null) {
      return {
        ok: false,
        error: { code: 'ROOM_FULL', message: 'Room is already full with 2 players' },
      };
    }

    const playerId = `p_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
    const reconnectToken = `tok_${playerId}_${Math.floor(Math.random() * 1000000)}`;
    const now = Date.now();

    room.match = addPlayerToMatch(room.match, {
      id: playerId,
      nickname: joinInfo.nickname,
      reconnectToken,
    });

    room.bindSocket(playerId, socket);
    this.socketRoomMap.set(socket.id, room.roomCode);

    const publicView = sanitizeMatchForPlayer(room.match, playerId, now);
    const joinedPlayer = room.match.players.find((p) => p && p.id === playerId)!;

    // Notify the room that opponent joined and sync match state
    room.broadcastStateSync();

    const opponent = room.match.players.find((p) => p && p.id !== playerId);
    if (opponent) {
      const opponentSocket = room.socketIdsByPlayer.get(opponent.id);
      if (opponentSocket) {
        this.io.to(opponentSocket).emit('lobby:opponent_joined', {
          player: {
            id: joinedPlayer.id,
            nickname: joinedPlayer.nickname,
            seat: joinedPlayer.seat,
            ready: joinedPlayer.ready,
            connected: joinedPlayer.connected,
            disconnectedAt: joinedPlayer.disconnectedAt,
            budget: joinedPlayer.budget,
            dish: joinedPlayer.dish,
            secretOrder: null,
            chefsTipGranted: joinedPlayer.chefsTipGranted,
          },
        });
      }
    }

    return {
      ok: true,
      roomCode: room.roomCode,
      playerId,
      reconnectToken,
      match: publicView,
    };
  }

  public getRoom(roomCode: string): MatchRoom | undefined {
    return this.rooms.get(roomCode.toUpperCase());
  }

  public getRoomBySocketId(socketId: string): MatchRoom | undefined {
    const roomCode = this.socketRoomMap.get(socketId);
    return roomCode ? this.rooms.get(roomCode) : undefined;
  }

  public handleSocketDisconnect(socketId: string): void {
    const roomCode = this.socketRoomMap.get(socketId);
    if (!roomCode) return;

    this.socketRoomMap.delete(socketId);
    const room = this.rooms.get(roomCode);
    if (room) {
      room.handleDisconnect(socketId);
    }
  }

  public getActiveRoomsCount(): number {
    return this.rooms.size;
  }

  /**
   * Sweeps and cleans up expired or abandoned rooms.
   * Returns the count of swept rooms.
   */
  public sweepExpiredRooms(now: number = Date.now()): number {
    let swept = 0;
    for (const [code, room] of Array.from(this.rooms.entries())) {
      const match = room.match;
      const isPostMatchExpired =
        match.state === 'POST_MATCH' && match.stateDeadlineAt > 0 && now >= match.stateDeadlineAt;
      const isDeadlinedOut =
        match.stateDeadlineAt > 0 && now >= match.stateDeadlineAt + 60_000;

      const allPlayersDisconnected =
        match.players.length > 0 &&
        match.players.every(
          (p) => !p || (!p.connected && now - (p.disconnectedAt ?? now) > 60_000),
        );

      if (isPostMatchExpired || isDeadlinedOut || allPlayersDisconnected) {
        room.destroy();
        this.rooms.delete(code);
        for (const [sId, rCode] of Array.from(this.socketRoomMap.entries())) {
          if (rCode === code) {
            this.socketRoomMap.delete(sId);
          }
        }
        swept++;
      }
    }
    return swept;
  }

  public clearAll(): void {
    if (this.sweepTimer) {
      clearInterval(this.sweepTimer);
      this.sweepTimer = null;
    }
    for (const room of this.rooms.values()) {
      room.destroy();
    }
    this.rooms.clear();
    this.socketRoomMap.clear();
  }
}
