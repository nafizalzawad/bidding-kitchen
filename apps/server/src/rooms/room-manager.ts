import type { Server as SocketIOServer, Socket } from 'socket.io';
import {
  addPlayerToMatch,
  createMatch,
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

    // Notify the host (Player 0) that opponent joined
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

  public clearAll(): void {
    for (const room of this.rooms.values()) {
      room.destroy();
    }
    this.rooms.clear();
    this.socketRoomMap.clear();
  }
}
