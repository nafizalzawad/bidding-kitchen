import type { Server as SocketIOServer, Socket } from 'socket.io';
import {
  createAutoTimeoutBid,
  finalizeMatch,
  forfeitMatch,
  resetMatchForRematch,
  resetMatchOnLobbyLeave,
  resolveRound,
  startRound,
  submitBid,
  transitionState,
  RECONNECT_WINDOW_MS,
  STATE_TIMEOUTS_MS,
  TIERS,
  type Bid,
  type ClientToServerEvents,
  type GameError,
  type Match,
  type ServerToClientEvents,
  type TierId,
} from '@bidding-kitchen/shared';
import { sanitizeMatchForPlayer } from './state-sanitizer.js';
import { TimerController } from './timer-controller.js';

export interface MatchRoomOptions {
  timerScale?: number;
  reconnectWindowMs?: number;
  onRoomDestroyed?: (roomCode: string) => void;
  onMatchCompleted?: (match: Match) => void;
}

export type LockBidResult =
  | { ok: true; bid: Bid }
  | { ok: false; error: GameError };

export class MatchRoom {
  public match: Match;
  public roomCode: string;
  public timerController: TimerController;
  public socketIdsByPlayer = new Map<string, string>();
  public playerIdsBySocket = new Map<string, string>();
  private processedBidsByKey = new Map<string, Bid>();
  private io: SocketIOServer<ClientToServerEvents, ServerToClientEvents>;
  private options: MatchRoomOptions;

  constructor(
    roomCode: string,
    initialMatch: Match,
    io: SocketIOServer<ClientToServerEvents, ServerToClientEvents>,
    options: MatchRoomOptions = {},
  ) {
    this.roomCode = roomCode;
    this.match = initialMatch;
    this.io = io;
    this.options = options;
    this.timerController = new TimerController(options.timerScale ?? 1.0);
  }

  public bindSocket(playerId: string, socket: Socket): void {
    const previousSocketId = this.socketIdsByPlayer.get(playerId);
    if (previousSocketId) {
      this.playerIdsBySocket.delete(previousSocketId);
    }

    this.socketIdsByPlayer.set(playerId, socket.id);
    this.playerIdsBySocket.set(socket.id, playerId);
    socket.join(this.roomCode);
  }

  public getPlayerIdBySocket(socketId: string): string | undefined {
    return this.playerIdsBySocket.get(socketId);
  }

  public broadcastStateSync(): void {
    const now = Date.now();
    for (const player of this.match.players) {
      if (!player) continue;
      const socketId = this.socketIdsByPlayer.get(player.id);
      if (socketId) {
        const publicView = sanitizeMatchForPlayer(this.match, player.id, now);
        this.io.to(socketId).emit('match:state_sync', { match: publicView });
      }
    }
  }

  public handlePlayerReady(playerId: string, ready: boolean): { ok: true } | { ok: false; error: GameError } {
    if (this.match.state !== 'LOBBY' && this.match.state !== 'POST_MATCH') {
      return {
        ok: false,
        error: { code: 'INVALID_STATE_ACTION', message: `Cannot toggle ready in state ${this.match.state}` },
      };
    }

    const player = this.match.players.find((p) => p && p.id === playerId);
    if (!player) {
      return {
        ok: false,
        error: { code: 'INVALID_STATE_ACTION', message: 'Player not seated in room' },
      };
    }

    player.ready = ready;

    // In LOBBY, if both players are seated and both are ready, advance to TIER_CONFIRMED
    const p0 = this.match.players[0];
    const p1 = this.match.players[1];
    const bothReady = p0 !== null && p1 !== null && p0.ready && p1.ready;

    if (this.match.state === 'LOBBY' && bothReady) {
      this.transitionToTierConfirmed();
    } else {
      this.broadcastStateSync();
    }

    return { ok: true };
  }

  public handleSelectTier(playerId: string, tier: TierId): { ok: true } | { ok: false; error: GameError } {
    if (this.match.state !== 'LOBBY') {
      return {
        ok: false,
        error: { code: 'INVALID_STATE_ACTION', message: 'Can only select tier in LOBBY state' },
      };
    }

    if (!TIERS[tier].mvpEnabled && !this.match.config.enableCustomerOrders) {
      return {
        ok: false,
        error: { code: 'TIER_MISMATCH', message: `${tier} is not enabled in MVP` },
      };
    }

    this.match.tier = tier;
    this.broadcastStateSync();
    return { ok: true };
  }

  public handleTutorialDone(_playerId: string): { ok: true } | { ok: false; error: GameError } {
    if (this.match.state === 'MATCH_INTRO') {
      this.onMatchIntroTimeout();
    }
    return { ok: true };
  }

  public handleLockBid(
    playerId: string,
    payload: { roundIndex: number; ingredientId: string; amount: number; idempotencyKey: string },
  ): LockBidResult {
    // 1. Idempotency Check: if identical key already processed for this round, return cached bid
    const existingBid = this.processedBidsByKey.get(payload.idempotencyKey);
    if (existingBid) {
      return { ok: true, bid: existingBid };
    }

    const now = Date.now();
    const submitRes = submitBid(this.match, playerId, payload, now);

    if (!submitRes.validation.valid) {
      return {
        ok: false,
        error: {
          code: submitRes.validation.error!,
          message: submitRes.validation.message || 'Bid validation failed',
        },
      };
    }

    this.match = submitRes.match;
    const currentRound = this.match.rounds[this.match.roundIndex]!;
    const fullBid = currentRound.privateBids[playerId]!;

    // Cache idempotency
    this.processedBidsByKey.set(payload.idempotencyKey, fullBid);

    // Notify room of player lock
    this.io.to(this.roomCode).emit('round:player_locked', {
      playerId,
      roundIndex: payload.roundIndex,
    });

    // Check if both players locked
    if (submitRes.bothLocked) {
      this.timerController.clear('biddingTimer');
      this.transitionToLocked();
    } else {
      this.broadcastStateSync();
    }

    return { ok: true, bid: fullBid };
  }

  public handleDisconnect(socketId: string): void {
    const playerId = this.playerIdsBySocket.get(socketId);
    if (!playerId) return;

    const now = Date.now();

    // In LOBBY or TIER_CONFIRMED: reset room on leave
    if (this.match.state === 'LOBBY' || this.match.state === 'TIER_CONFIRMED') {
      this.match = resetMatchOnLobbyLeave(this.match, playerId, now);
      this.socketIdsByPlayer.delete(playerId);
      this.playerIdsBySocket.delete(socketId);

      const remaining = this.match.players[0];
      if (remaining) {
        const remainingSocket = this.socketIdsByPlayer.get(remaining.id);
        if (remainingSocket) {
          const publicView = sanitizeMatchForPlayer(this.match, remaining.id, now);
          this.io.to(remainingSocket).emit('lobby:opponent_left', {
            message: 'Opponent left the lobby.',
            match: publicView,
          });
        }
      } else {
        // Both players gone
        this.destroy();
      }
      return;
    }

    // In active match (MATCH_INTRO through FINAL_REVEAL): start 30s reconnect window
    const player = this.match.players.find((p) => p && p.id === playerId);
    if (!player) return;

    player.connected = false;
    player.disconnectedAt = now;

    const reconnectWindowMs = this.options.reconnectWindowMs ?? RECONNECT_WINDOW_MS;
    const deadlineAt = now + reconnectWindowMs;

    this.timerController.set(`reconnectTimer:${playerId}`, reconnectWindowMs, () => {
      this.handleForfeitOnReconnectTimeout(playerId);
    });

    this.io.to(this.roomCode).emit('player:connection_changed', {
      playerId,
      connected: false,
      reconnectDeadlineAt: deadlineAt,
    });
  }

  public handleReconnect(
    socket: Socket,
    payload: { roomCode: string; playerId: string; reconnectToken: string },
  ): { ok: true; match: ReturnType<typeof sanitizeMatchForPlayer> } | { ok: false; error: GameError } {
    const player = this.match.players.find((p) => p && p.id === payload.playerId);

    if (!player || player.reconnectToken !== payload.reconnectToken) {
      return {
        ok: false,
        error: { code: 'UNAUTHORIZED_RECONNECT', message: 'Invalid reconnect token or player ID' },
      };
    }

    // Clear forfeit timer
    this.timerController.clear(`reconnectTimer:${player.id}`);

    player.connected = true;
    player.disconnectedAt = null;

    this.bindSocket(player.id, socket);

    this.io.to(this.roomCode).emit('player:connection_changed', {
      playerId: player.id,
      connected: true,
      reconnectDeadlineAt: null,
    });

    const now = Date.now();
    const publicView = sanitizeMatchForPlayer(this.match, player.id, now);
    return { ok: true, match: publicView };
  }

  public handleRematch(playerId: string): { ok: true } | { ok: false; error: GameError } {
    if (this.match.state !== 'POST_MATCH') {
      return {
        ok: false,
        error: { code: 'INVALID_STATE_ACTION', message: 'Rematch is only available in POST_MATCH' },
      };
    }

    const player = this.match.players.find((p) => p && p.id === playerId);
    if (!player) {
      return {
        ok: false,
        error: { code: 'INVALID_STATE_ACTION', message: 'Player not found in room' },
      };
    }

    player.ready = true;

    const p0 = this.match.players[0];
    const p1 = this.match.players[1];

    if (!p0 || !p1) {
      return {
        ok: false,
        error: { code: 'INVALID_STATE_ACTION', message: 'Opponent is no longer in the room' },
      };
    }

    if (p0.ready && p1.ready) {
      // Both clicked rematch! Reset match with seat swap and proceed to TIER_CONFIRMED
      const now = Date.now();
      const newSeed = Math.floor(Math.random() * 1000000);
      this.match = resetMatchForRematch(this.match, newSeed, now);
      this.processedBidsByKey.clear();
      this.transitionToTierConfirmed();
    } else {
      this.broadcastStateSync();
    }

    return { ok: true };
  }

  public handleNewTier(playerId: string, newTier: TierId): { ok: true } | { ok: false; error: GameError } {
    if (this.match.state !== 'POST_MATCH') {
      return {
        ok: false,
        error: { code: 'INVALID_STATE_ACTION', message: 'New tier is only available in POST_MATCH' },
      };
    }

    const now = Date.now();
    const newSeed = Math.floor(Math.random() * 1000000);
    this.match = resetMatchForRematch(this.match, newSeed, now, newTier);
    this.processedBidsByKey.clear();
    this.broadcastStateSync();
    return { ok: true };
  }

  // --- State Transitions & Timers ---

  private transitionToTierConfirmed(): void {
    const now = Date.now();
    for (const player of this.match.players) {
      if (player) {
        player.ready = false;
      }
    }
    if (this.match.state !== 'TIER_CONFIRMED') {
      this.match = transitionState(this.match, 'TIER_CONFIRMED', now);
    }
    this.broadcastStateSync();

    this.timerController.set('stateTimer', STATE_TIMEOUTS_MS.TIER_CONFIRMED, () => {
      this.onTierConfirmedTimeout();
    });
  }

  private onTierConfirmedTimeout(): void {
    if (this.match.state !== 'TIER_CONFIRMED') return;
    const now = Date.now();
    this.match = transitionState(this.match, 'MATCH_INTRO', now);
    this.broadcastStateSync();

    this.timerController.set('stateTimer', STATE_TIMEOUTS_MS.MATCH_INTRO, () => {
      this.onMatchIntroTimeout();
    });
  }

  private onMatchIntroTimeout(): void {
    if (this.match.state !== 'MATCH_INTRO') return;
    const now = Date.now();
    this.match = {
      ...this.match,
      roundIndex: 0,
    };
    this.match = transitionState(this.match, 'ROUND_REVEAL', now);
    this.broadcastStateSync();

    this.timerController.set('stateTimer', STATE_TIMEOUTS_MS.ROUND_REVEAL, () => {
      this.onRoundRevealTimeout();
    });
  }

  private onRoundRevealTimeout(): void {
    if (this.match.state !== 'ROUND_REVEAL') return;
    const now = Date.now();
    this.match = startRound(this.match, this.match.roundIndex, now);
    this.broadcastStateSync();

    this.timerController.set('biddingTimer', STATE_TIMEOUTS_MS.BIDDING, () => {
      this.onBiddingTimeout();
    });
  }

  private onBiddingTimeout(): void {
    if (this.match.state !== 'BIDDING') return;
    const now = Date.now();
    const currentRound = this.match.rounds[this.match.roundIndex]!;

    // Auto-lock basic $0 bids for any player who did not submit
    for (const player of this.match.players) {
      if (player && !currentRound.bidsLockedByPlayer[player.id]) {
        const autoBid = createAutoTimeoutBid(this.match, player.id, now);
        this.match = submitBid(this.match, player.id, autoBid, now).match;
        this.io.to(this.roomCode).emit('round:player_locked', {
          playerId: player.id,
          roundIndex: this.match.roundIndex,
        });
      }
    }

    this.transitionToLocked();
  }

  private transitionToLocked(): void {
    const now = Date.now();
    if (this.match.state !== 'LOCKED') {
      this.match = transitionState(this.match, 'LOCKED', now);
    }
    this.broadcastStateSync();

    this.timerController.set('stateTimer', STATE_TIMEOUTS_MS.LOCKED, () => {
      this.onLockedTimeout();
    });
  }

  private onLockedTimeout(): void {
    if (this.match.state !== 'LOCKED') return;
    const now = Date.now();
    const { updatedMatch, resolution } = resolveRound(this.match);
    this.match = transitionState(updatedMatch, 'RESOLVE', now);

    // Broadcast round:resolved with per-player sanitized PublicMatchView
    for (const player of this.match.players) {
      if (!player) continue;
      const socketId = this.socketIdsByPlayer.get(player.id);
      if (socketId) {
        const publicView = sanitizeMatchForPlayer(this.match, player.id, now);
        this.io.to(socketId).emit('round:resolved', {
          resolution,
          match: publicView,
        });
      }
    }

    this.timerController.set('stateTimer', STATE_TIMEOUTS_MS.RESOLVE, () => {
      this.onResolveTimeout();
    });
  }

  private onResolveTimeout(): void {
    if (this.match.state !== 'RESOLVE') return;
    const now = Date.now();
    this.match = transitionState(this.match, 'ROUND_END', now);
    this.broadcastStateSync();

    this.timerController.set('stateTimer', STATE_TIMEOUTS_MS.ROUND_END, () => {
      this.onRoundEndTimeout();
    });
  }

  private onRoundEndTimeout(): void {
    if (this.match.state !== 'ROUND_END') return;
    const now = Date.now();
    const tierDef = TIERS[this.match.tier];

    if (this.match.roundIndex < tierDef.roundsCount - 1) {
      // Advance to next round reveal
      this.match = {
        ...this.match,
        roundIndex: this.match.roundIndex + 1,
      };
      this.match = transitionState(this.match, 'ROUND_REVEAL', now);
      this.broadcastStateSync();

      this.timerController.set('stateTimer', STATE_TIMEOUTS_MS.ROUND_REVEAL, () => {
        this.onRoundRevealTimeout();
      });
    } else {
      // Match complete -> finalize and transition to FINAL_REVEAL
      this.match = finalizeMatch(this.match);
      this.match = transitionState(this.match, 'FINAL_REVEAL', now);
      this.broadcastStateSync();

      this.options.onMatchCompleted?.(this.match);

      this.timerController.set('stateTimer', STATE_TIMEOUTS_MS.FINAL_REVEAL, () => {
        this.onFinalRevealTimeout();
      });
    }
  }

  private onFinalRevealTimeout(): void {
    if (this.match.state !== 'FINAL_REVEAL') return;
    const now = Date.now();
    for (const player of this.match.players) {
      if (player) {
        player.ready = false;
      }
    }
    this.match = transitionState(this.match, 'POST_MATCH', now);
    this.broadcastStateSync();

    // Post-match room expiry after 5 minutes
    this.timerController.set('stateTimer', STATE_TIMEOUTS_MS.POST_MATCH, () => {
      this.destroy();
    });
  }

  private handleForfeitOnReconnectTimeout(disconnectedPlayerId: string): void {
    const now = Date.now();
    this.match = forfeitMatch(this.match, disconnectedPlayerId, now);

    const winnerId = this.match.result?.winnerId ?? '';
    const result = this.match.result!;

    // Broadcast forfeit to remaining player
    for (const player of this.match.players) {
      if (!player) continue;
      const socketId = this.socketIdsByPlayer.get(player.id);
      if (socketId) {
        const publicView = sanitizeMatchForPlayer(this.match, player.id, now);
        this.io.to(socketId).emit('match:forfeited', {
          forfeitedByPlayerId: disconnectedPlayerId,
          winnerId,
          result,
          match: publicView,
        });
      }
    }

    this.options.onMatchCompleted?.(this.match);
  }

  public destroy(): void {
    this.timerController.clearAll();
    this.options.onRoomDestroyed?.(this.roomCode);
  }
}
