import { io, Socket } from 'socket.io-client';
import type {
  AckResponse,
  Bid,
  BotDifficulty,
  ClientToServerEvents,
  PublicMatchView,
  ServerToClientEvents,
  TelemetryEventName,
  TierId,
} from '@bidding-kitchen/shared';

export const resolveDefaultServerUrl = (): string => {
  if (typeof window !== 'undefined') {
    // 1. URL query parameter override e.g. ?server=https://my-server.onrender.com
    const params = new URLSearchParams(window.location.search);
    const paramServer = params.get('server');
    if (paramServer) {
      try {
        localStorage.setItem('bk_server_url', paramServer);
      } catch {
        // ignore
      }
      return paramServer;
    }

    // 2. LocalStorage override
    try {
      const saved = localStorage.getItem('bk_server_url');
      if (saved && saved.trim()) {
        return saved.trim();
      }
    } catch {
      // ignore
    }
  }

  // 3. Build-time Vite env variable
  if (import.meta.env.VITE_SERVER_URL) {
    return import.meta.env.VITE_SERVER_URL;
  }

  if (typeof window !== 'undefined' && window.location?.origin) {
    const isLocalhost =
      window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1' ||
      window.location.hostname === '0.0.0.0';

    if (!import.meta.env.PROD && isLocalhost) {
      return `http://${window.location.hostname}:3001`;
    }
    return window.location.origin;
  }
  return 'http://127.0.0.1:3001';
};

const DEFAULT_SERVER_URL = resolveDefaultServerUrl();
const ACK_TIMEOUT_MS = 5000;

export class SocketClient {
  private socket: Socket<ServerToClientEvents, ClientToServerEvents> | null = null;
  private serverUrl: string;

  constructor(serverUrl = DEFAULT_SERVER_URL) {
    this.serverUrl = serverUrl;
  }

  public getServerUrl(): string {
    return this.serverUrl;
  }

  public setServerUrl(url: string): void {
    const trimmed = url.trim().replace(/\/+$/, '');
    if (!trimmed) return;
    this.serverUrl = trimmed;
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('bk_server_url', trimmed);
      } catch {
        // ignore
      }
    }
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.connect();
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
              message:
                'Server request timed out. Please verify that your online game server is running and configured.',
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

  public createBotRoom(
    nickname: string,
    tier: TierId = 'STREET',
    difficulty: BotDifficulty = 'MEDIUM',
  ): Promise<
    AckResponse<{
      roomCode: string;
      playerId: string;
      reconnectToken: string;
      match: PublicMatchView;
    }>
  > {
    const s = this.connect();
    return this.withTimeout((cb) => s.emit('room:create_bot', { nickname, tier, difficulty }, cb));
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

  public joinQueue(
    nickname: string,
    tier: TierId,
  ): Promise<AckResponse<{ ticketId: string }>> {
    const s = this.getSocket();
    return this.withTimeout((cb) => s.emit('queue:join', { nickname, tier }, cb));
  }

  public leaveQueue(ticketId: string): Promise<AckResponse> {
    const s = this.getSocket();
    return this.withTimeout((cb) => s.emit('queue:leave', { ticketId }, cb));
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
