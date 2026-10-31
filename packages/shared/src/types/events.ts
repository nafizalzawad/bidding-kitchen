import type {
  Bid,
  PublicMatchView,
  PublicPlayerView,
  Result,
  RoundResolution,
  TierId,
} from './models.js';
import type { GameError } from './errors.js';

export type AckResponse<T = Record<string, never>> =
  | ({ ok: true } & (T extends Record<string, never> ? Record<string, unknown> : T))
  | { ok: false; error: GameError };

export type TelemetryEventName =
  | 'TUTORIAL_COMPLETE'
  | 'FIRST_BID_LOCKED'
  | 'SHARE_CLICKED'
  | 'REMATCH_CLICKED';

export interface ClientToServerEvents {
  'room:create': (
    payload: { nickname: string; tier: TierId },
    ack: (
      res: AckResponse<{
        roomCode: string;
        playerId: string;
        reconnectToken: string;
        match: PublicMatchView;
      }>
    ) => void
  ) => void;
  'room:join': (
    payload: { roomCode: string; nickname: string },
    ack: (
      res: AckResponse<{
        roomCode: string;
        playerId: string;
        reconnectToken: string;
        match: PublicMatchView;
      }>
    ) => void
  ) => void;
  'room:reconnect': (
    payload: { roomCode: string; playerId: string; reconnectToken: string },
    ack: (res: AckResponse<{ match: PublicMatchView }>) => void
  ) => void;
  'room:leave': (
    payload: { roomCode: string },
    ack: (res: AckResponse) => void
  ) => void;
  'lobby:select_tier': (
    payload: { roomCode: string; tier: TierId },
    ack: (res: AckResponse) => void
  ) => void;
  'lobby:ready': (
    payload: { roomCode: string; ready: boolean },
    ack: (res: AckResponse) => void
  ) => void;
  'match:tutorial_done': (
    payload: { roomCode: string },
    ack: (res: AckResponse) => void
  ) => void;
  'bid:lock': (
    payload: {
      roomCode: string;
      roundIndex: number;
      ingredientId: string;
      amount: number;
      idempotencyKey: string;
    },
    ack: (res: AckResponse<{ bid: Bid }>) => void
  ) => void;
  'post_match:rematch': (
    payload: { roomCode: string },
    ack: (res: AckResponse) => void
  ) => void;
  'post_match:new_tier': (
    payload: { roomCode: string; tier: TierId },
    ack: (res: AckResponse) => void
  ) => void;
  'queue:join': (
    payload: { nickname: string; tier: TierId },
    ack: (res: AckResponse<{ ticketId: string }>) => void
  ) => void;
  'queue:leave': (
    payload: { ticketId: string },
    ack: (res: AckResponse) => void
  ) => void;
  'telemetry:track': (payload: {
    event: TelemetryEventName;
    metadata?: Record<string, string | number | boolean>;
  }) => void;
}

export interface ServerToClientEvents {
  'match:state_sync': (payload: { match: PublicMatchView }) => void;
  'lobby:opponent_joined': (payload: { player: PublicPlayerView }) => void;
  'lobby:opponent_left': (payload: { message: string; match: PublicMatchView }) => void;
  'round:player_locked': (payload: { playerId: string; roundIndex: number }) => void;
  'round:resolved': (payload: {
    resolution: RoundResolution;
    match: PublicMatchView;
  }) => void;
  'player:connection_changed': (payload: {
    playerId: string;
    connected: boolean;
    reconnectDeadlineAt: number | null;
  }) => void;
  'match:forfeited': (payload: {
    forfeitedByPlayerId: string;
    winnerId: string;
    result: Result;
    match: PublicMatchView;
  }) => void;
  'queue:matched': (payload: {
    roomCode: string;
    playerId: string;
    reconnectToken: string;
    match: PublicMatchView;
  }) => void;
  'server:error': (payload: { error: GameError }) => void;
}
