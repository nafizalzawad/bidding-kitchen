import { io, Socket } from 'socket.io-client';
import type {
  AckResponse,
  Bid,
  ClientToServerEvents,
  PublicMatchView,
  ServerToClientEvents,
  TelemetryEventName,
  TierId,
} from '@bidding-kitchen/shared';

const DEFAULT_SERVER_URL = import.meta.env.VITE_SERVER_URL ?? 'http://localhost:3001';
const ACK_TIMEOUT_MS = 5000;

export class SocketClient {
  private socket: Socket<ServerToClientEvents, ClientToServerEvents> | null = null;
  private serverUrl: string;

  constructor(serverUrl = DEFAULT_SERVER_URL) {
    this.serverUrl = serverUrl;
  }

  public getSocket(): Socket<ServerToClientEvents, ClientToServerEvents> {
    if (!this.socket) {
      this.socket = io(this.serverUrl, {
        autoConnect: false,
        reconnection: true,
        reconnectionAttempts: 10,
        reconnectionDelay: 500,
        transports: ['websocket', 'polling'],
      });
    }
    return this.socket;
  }

  public connect(): Socket<ServerToClientEvents, ClientToServerEvents> {
    const s = this.getSocket();
    if (!s.connected) {
      s.connect();
    }
    return s;
  }

  public disconnect(): void {
    if (this.socket && this.socket.connected) {
      this.socket.disconnect();
    }
  }

  public isConnected(): boolean {
    return Boolean(this.socket?.connected);
  }

  private withTimeout<T>(
    emitter: (cb: (res: AckResponse<T>) => void) => void,
    timeoutMs = ACK_TIMEOUT_MS,
  ): Promise<AckResponse<T>> {
    return new Promise((resolve) => {
      let resolved = false;
      const timer = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          resolve({
            ok: false,
            error: {
              code: 'INVALID_STATE_ACTION',
              message: 'Server request timed out. Please try again.',
            },
          });
        }
      }, timeoutMs);

      try {
        emitter((res) => {
          if (!resolved) {
            resolved = true;
            clearTimeout(timer);
            resolve(res);
          }
        });
      } catch (err) {
        if (!resolved) {
          resolved = true;
          clearTimeout(timer);
          resolve({
            ok: false,
            error: {
              code: 'INVALID_STATE_ACTION',
              message: err instanceof Error ? err.message : 'Unknown socket error',
            },
          });
        }
      }
    });
  }

  // --- API Methods ---

  public createRoom(
    nickname: string,
    tier: TierId = 'STREET',
  ): Promise<
    AckResponse<{
      roomCode: string;
      playerId: string;
      reconnectToken: string;
      match: PublicMatchView;
    }>
  > {
    const s = this.connect();
    return this.withTimeout((cb) => s.emit('room:create', { nickname, tier }, cb));
  }

  public joinRoom(
    roomCode: string,
    nickname: string,
  ): Promise<
    AckResponse<{
      roomCode: string;
      playerId: string;
      reconnectToken: string;
      match: PublicMatchView;
    }>
  > {
    const s = this.connect();
    return this.withTimeout((cb) => s.emit('room:join', { roomCode, nickname }, cb));
  }

  public reconnectRoom(
    roomCode: string,
    playerId: string,
    reconnectToken: string,
  ): Promise<AckResponse<{ match: PublicMatchView }>> {
    const s = this.connect();
    return this.withTimeout((cb) =>
      s.emit('room:reconnect', { roomCode, playerId, reconnectToken }, cb),
    );
  }

  public leaveRoom(roomCode: string): Promise<AckResponse> {
    const s = this.getSocket();
    return this.withTimeout((cb) => s.emit('room:leave', { roomCode }, cb));
  }

  public selectTier(roomCode: string, tier: TierId): Promise<AckResponse> {
    const s = this.getSocket();
    return this.withTimeout((cb) => s.emit('lobby:select_tier', { roomCode, tier }, cb));
  }

  public setReady(roomCode: string, ready: boolean): Promise<AckResponse> {
    const s = this.getSocket();
    return this.withTimeout((cb) => s.emit('lobby:ready', { roomCode, ready }, cb));
  }

  public markTutorialDone(roomCode: string): Promise<AckResponse> {
    const s = this.getSocket();
    return this.withTimeout((cb) => s.emit('match:tutorial_done', { roomCode }, cb));
  }

  public lockBid(
    roomCode: string,
    roundIndex: number,
    ingredientId: string,
    amount: number,
    idempotencyKey: string,
  ): Promise<AckResponse<{ bid: Bid }>> {
    const s = this.getSocket();
    return this.withTimeout((cb) =>
      s.emit('bid:lock', { roomCode, roundIndex, ingredientId, amount, idempotencyKey }, cb),
    );
  }

  public requestRematch(roomCode: string): Promise<AckResponse> {
    const s = this.getSocket();
    return this.withTimeout((cb) => s.emit('post_match:rematch', { roomCode }, cb));
  }

  public requestNewTier(roomCode: string, tier: TierId): Promise<AckResponse> {
    const s = this.getSocket();
    return this.withTimeout((cb) => s.emit('post_match:new_tier', { roomCode, tier }, cb));
  }

  public trackTelemetry(
    event: TelemetryEventName,
    metadata?: Record<string, string | number | boolean>,
  ): void {
    const s = this.getSocket();
    s.emit('telemetry:track', { event, metadata });
  }
}

export const socketClient = new SocketClient();
