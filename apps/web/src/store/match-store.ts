import { useSyncExternalStore } from 'react';
import type {
  BotDifficulty,
  GameError,
  PublicMatchView,
  PublicPlayerView,
  TierId,
} from '@bidding-kitchen/shared';
import {
  getMyPlayerFromView,
} from '@bidding-kitchen/shared';
import { socketClient } from '../network/socket-client.js';
import {
  clearActiveSession,
  hasSeenTutorial,
  loadActiveSession,
  markTutorialSeen,
  saveActiveSession,
  saveNickname,
} from '../network/session-storage.js';

export type ConnectionStatus =
  | 'IDLE'
  | 'CONNECTING'
  | 'CONNECTED'
  | 'RECONNECTING'
  | 'DISCONNECTED';

export interface MatchStoreState {
  connectionStatus: ConnectionStatus;
  match: PublicMatchView | null;
  myPlayerId: string | null;
  clockOffsetMs: number;
  opponentReconnectDeadlineAt: number | null;
  activeError: GameError | null;
  toastMessage: string | null;
  isSubmittingAction: boolean;
  showTutorialOverlay: boolean;
  hasTrackedFirstBidInMatch: boolean;
  isSearchingMatch: boolean;
  matchTicketId: string | null;
  selectedTier: TierId;
  serverUrl: string;
}

class MatchStore {
  private state: MatchStoreState = {
    connectionStatus: 'IDLE',
    match: null,
    myPlayerId: null,
    clockOffsetMs: 0,
    opponentReconnectDeadlineAt: null,
    activeError: null,
    toastMessage: null,
    isSubmittingAction: false,
    showTutorialOverlay: false,
    hasTrackedFirstBidInMatch: false,
    isSearchingMatch: false,
    matchTicketId: null,
    selectedTier: 'STREET',
    serverUrl: socketClient.getServerUrl(),
  };

  private listeners = new Set<() => void>();
  private initialized = false;

  constructor() {
    this.setupSocketListeners();
  }

  public getState = (): MatchStoreState => {
    return this.state;
  };

  public subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  private notify(): void {
    for (const listener of this.listeners) {
      listener();
    }
  }

  private setState(updater: Partial<MatchStoreState> | ((prev: MatchStoreState) => Partial<MatchStoreState>)): void {
    const patch = typeof updater === 'function' ? updater(this.state) : updater;
    this.state = { ...this.state, ...patch };
    this.notify();
  }

  public init(): void {
    if (this.initialized || typeof window === 'undefined') return;
    this.initialized = true;

    // Connect socket
    socketClient.connect();

    // Check for existing session in sessionStorage
    const session = loadActiveSession();
    if (session) {
      this.setState({ connectionStatus: 'RECONNECTING', myPlayerId: session.playerId });
      socketClient
        .reconnectRoom(session.roomCode, session.playerId, session.reconnectToken)
        .then((res) => {
          if (res.ok) {
            this.syncUrlRoom(res.match.roomCode);
            this.setState({
              connectionStatus: 'CONNECTED',
              match: res.match,
              myPlayerId: session.playerId,
              clockOffsetMs: res.match.serverNow - Date.now(),
            });
          } else {
            clearActiveSession();
            this.clearUrlRoom();
            this.setState({
              connectionStatus: 'CONNECTED',
              match: null,
              myPlayerId: null,
              toastMessage: 'Previous match ended or expired',
            });
          }
        })
        .catch(() => {
          clearActiveSession();
          this.clearUrlRoom();
          this.setState({ connectionStatus: 'CONNECTED', match: null, myPlayerId: null });
        });
    }
  }

  private syncUrlRoom(roomCode: string): void {
    if (typeof window === 'undefined') return;
    try {
      const url = new URL(window.location.href);
      if (url.searchParams.get('room') !== roomCode) {
        url.searchParams.set('room', roomCode);
        window.history.replaceState({}, '', url.toString());
      }
    } catch (e) {
      console.warn('Failed to update URL room param', e);
    }
  }

  private clearUrlRoom(): void {
    if (typeof window === 'undefined') return;
    try {
      const url = new URL(window.location.href);
      if (url.searchParams.has('room')) {
        url.searchParams.delete('room');
        window.history.replaceState({}, '', url.toString());
      }
    } catch (e) {
      console.warn('Failed to clear URL room param', e);
    }
  }

  private setupSocketListeners(): void {
    const socket = socketClient.getSocket();

    socket.on('connect', () => {
      this.setState({ connectionStatus: 'CONNECTED' });
    });

    socket.on('disconnect', () => {
      this.setState({ connectionStatus: 'DISCONNECTED' });
    });

    socket.on('match:state_sync', ({ match }) => {
      // Ignore background state syncs if the player is not currently in a room / has left to home
      if (!this.state.match || !this.state.myPlayerId) {
        return;
      }
      // Ignore syncs for a different room
      if (this.state.match.roomCode !== match.roomCode) {
        return;
      }

      const now = Date.now();
      const clockOffsetMs = match.serverNow - now;

      // Check tutorial overlay requirement on entering MATCH_INTRO
      let showTutorial = this.state.showTutorialOverlay;
      if (match.state === 'MATCH_INTRO' && !hasSeenTutorial()) {
        showTutorial = true;
      }

      // Check if match was reset (roundIndex 0 in LOBBY or TIER_CONFIRMED)
      let firstBidTracked = this.state.hasTrackedFirstBidInMatch;
      if (match.state === 'LOBBY' || match.state === 'TIER_CONFIRMED') {
        firstBidTracked = false;
      }

      this.setState({
        match,
        clockOffsetMs,
        showTutorialOverlay: showTutorial,
        hasTrackedFirstBidInMatch: firstBidTracked,
      });
    });

    socket.on('lobby:opponent_joined', ({ player }) => {
      if (!this.state.match || !this.state.myPlayerId) return;
      this.setState((prev) => {
        if (!prev.match) {
          return { toastMessage: `${player.nickname} joined the kitchen!` };
        }
        const updatedPlayers = [...prev.match.players];
        updatedPlayers[player.seat] = player;
        return {
          match: {
            ...prev.match,
            players: updatedPlayers as [PublicPlayerView, PublicPlayerView | null],
          },
          toastMessage: `${player.nickname} joined the kitchen!`,
        };
      });
    });

    socket.on('lobby:opponent_left', ({ message, match }) => {
      if (!this.state.match || !this.state.myPlayerId) return;
      this.setState({
        match,
        toastMessage: message || 'Opponent left the lobby.',
      });
    });

    socket.on('round:player_locked', ({ playerId }) => {
      if (!this.state.match || !this.state.myPlayerId) return;
      this.setState((prev) => {
        if (!prev.match?.currentRound) return {};
        return {
          match: {
            ...prev.match,
            currentRound: {
              ...prev.match.currentRound,
              bidsLockedByPlayer: {
                ...prev.match.currentRound.bidsLockedByPlayer,
                [playerId]: true,
              },
            },
          },
        };
      });
    });

    socket.on('round:resolved', ({ match }) => {
      if (!this.state.match || !this.state.myPlayerId) return;
      if (this.state.match.roomCode !== match.roomCode) return;
      const now = Date.now();
      this.setState({
        match,
        clockOffsetMs: match.serverNow - now,
      });
    });

    socket.on('player:connection_changed', ({ playerId, reconnectDeadlineAt }) => {
      if (!this.state.match || !this.state.myPlayerId) return;
      if (playerId !== this.state.myPlayerId) {
        this.setState({ opponentReconnectDeadlineAt: reconnectDeadlineAt });
      }
    });

    socket.on('match:forfeited', ({ match }) => {
      if (!this.state.match || !this.state.myPlayerId) return;
      if (this.state.match.roomCode !== match.roomCode) return;
      this.setState({
        match,
        opponentReconnectDeadlineAt: null,
      });
    });

    socket.on('server:error', ({ error }) => {
      this.setState({ activeError: error, isSubmittingAction: false });
    });

    socket.on('queue:matched', ({ roomCode, playerId, reconnectToken, match }) => {
      saveActiveSession({ roomCode, playerId, reconnectToken });
      this.syncUrlRoom(roomCode);
      const now = Date.now();
      const clockOffsetMs = match.serverNow - now;
      this.setState({
        match,
        myPlayerId: playerId,
        clockOffsetMs,
        isSearchingMatch: false,
        matchTicketId: null,
        isSubmittingAction: false,
      });
    });
  }

  // --- Actions ---

  public setSelectedTier = (tier: TierId): void => {
    this.setState({ selectedTier: tier });
  };

  public selectTier = async (tier: TierId): Promise<boolean> => {
    const { match } = this.state;
    if (!match) return false;
    this.setState({ isSubmittingAction: true, activeError: null });
    const res = await socketClient.selectTier(match.roomCode, tier);
    this.setState({ isSubmittingAction: false });
    if (!res.ok) {
      this.setState({ activeError: res.error });
      return false;
    }
    return true;
  };

  public startQuickMatch = async (nickname: string, tier?: TierId): Promise<boolean> => {
    const matchTier = tier ?? this.state.selectedTier;
    this.setState({ isSubmittingAction: true, activeError: null });
    saveNickname(nickname);

    const res = await socketClient.joinQueue(nickname, matchTier);
    this.setState({ isSubmittingAction: false });

    if (res.ok) {
      this.setState({
        isSearchingMatch: true,
        matchTicketId: res.ticketId,
      });
      return true;
    } else {
      this.setState({ activeError: res.error });
      return false;
    }
  };

  public cancelQuickMatch = async (): Promise<void> => {
    const { matchTicketId } = this.state;
    if (matchTicketId) {
      await socketClient.leaveQueue(matchTicketId);
    }
    this.setState({
      isSearchingMatch: false,
      matchTicketId: null,
      isSubmittingAction: false,
    });
  };

  public setServerUrl = (url: string): void => {
    socketClient.setServerUrl(url);
    this.setState({ serverUrl: socketClient.getServerUrl() });
  };

  public createRoom = async (nickname: string, tier?: TierId): Promise<boolean> => {
    this.setState({ isSubmittingAction: true, activeError: null });
    saveNickname(nickname);

    try {
      const targetTier = tier ?? this.state.selectedTier;
      const res = await socketClient.createRoom(nickname, targetTier);
      if (res.ok) {
        saveActiveSession({
          roomCode: res.roomCode,
          playerId: res.playerId,
          reconnectToken: res.reconnectToken,
        });
        this.syncUrlRoom(res.roomCode);
        this.setState({
          match: res.match,
          myPlayerId: res.playerId,
          clockOffsetMs: res.match.serverNow - Date.now(),
          isSubmittingAction: false,
        });
        return true;
      } else {
        this.setState({ activeError: res.error, isSubmittingAction: false });
        return false;
      }
    } catch {
      this.setState({
        activeError: { code: 'INVALID_STATE_ACTION', message: 'Failed to create room' },
        isSubmittingAction: false,
      });
      return false;
    }
  };

  public createBotRoom = async (
    nickname: string,
    tier?: TierId,
    difficulty: BotDifficulty = 'MEDIUM',
  ): Promise<boolean> => {
    this.setState({ isSubmittingAction: true, activeError: null });
    saveNickname(nickname);

    try {
      const targetTier = tier ?? this.state.selectedTier;
      const res = await socketClient.createBotRoom(nickname, targetTier, difficulty);
      if (res.ok) {
        saveActiveSession({
          roomCode: res.roomCode,
          playerId: res.playerId,
          reconnectToken: res.reconnectToken,
        });
        this.syncUrlRoom(res.roomCode);
        this.setState({
          match: res.match,
          myPlayerId: res.playerId,
          clockOffsetMs: res.match.serverNow - Date.now(),
          isSubmittingAction: false,
        });
        return true;
      } else {
        this.setState({ activeError: res.error, isSubmittingAction: false });
        return false;
      }
    } catch {
      this.setState({
        activeError: { code: 'INVALID_STATE_ACTION', message: 'Failed to create bot room' },
        isSubmittingAction: false,
      });
      return false;
    }
  };

  public joinRoom = async (roomCode: string, nickname: string): Promise<boolean> => {
    this.setState({ isSubmittingAction: true, activeError: null });
    saveNickname(nickname);

    try {
      const res = await socketClient.joinRoom(roomCode, nickname);
      if (res.ok) {
        saveActiveSession({
          roomCode: res.roomCode,
          playerId: res.playerId,
          reconnectToken: res.reconnectToken,
        });
        this.syncUrlRoom(res.roomCode);
        this.setState({
          match: res.match,
          myPlayerId: res.playerId,
          clockOffsetMs: res.match.serverNow - Date.now(),
          isSubmittingAction: false,
        });
        return true;
      } else {
        this.setState({ activeError: res.error, isSubmittingAction: false });
        return false;
      }
    } catch {
      this.setState({
        activeError: { code: 'INVALID_STATE_ACTION', message: 'Failed to join room' },
        isSubmittingAction: false,
      });
      return false;
    }
  };

  public toggleReady = async (): Promise<void> => {
    if (!this.state.match) return;
    try {
      const me = getMyPlayerFromView(this.state.match);
      this.setState({ isSubmittingAction: true });
      await socketClient.setReady(this.state.match.roomCode, !me.ready);
    } catch (e) {
      console.warn('Failed to toggle ready', e);
    } finally {
      this.setState({ isSubmittingAction: false });
    }
  };

  public lockBid = async (ingredientId: string, amount: number): Promise<boolean> => {
    const { match, myPlayerId, hasTrackedFirstBidInMatch } = this.state;
    if (!match || !myPlayerId) return false;

    const roundIndex = match.roundIndex;
    const idempotencyKey = `${match.id}-${myPlayerId}-r${roundIndex}`;

    // Track first bid telemetry
    if (!hasTrackedFirstBidInMatch) {
      const roundStart = match.currentRound?.startedAt ?? match.stateEnteredAt ?? Date.now();
      const msSinceRoundStart = Math.max(0, Date.now() - roundStart);
      socketClient.trackTelemetry('FIRST_BID_LOCKED', { msSinceRoundStart });
      this.setState({ hasTrackedFirstBidInMatch: true });
    }

    this.setState({ isSubmittingAction: true, activeError: null });

    try {
      const res = await socketClient.lockBid(
        match.roomCode,
        roundIndex,
        ingredientId,
        amount,
        idempotencyKey,
      );
      if (res.ok) {
        const lockedBid = res.bid;
        this.setState((prev) => {
          if (!prev.match?.currentRound) return { isSubmittingAction: false };
          return {
            match: {
              ...prev.match,
              currentRound: {
                ...prev.match.currentRound,
                bidsLockedByPlayer: {
                  ...prev.match.currentRound.bidsLockedByPlayer,
                  [myPlayerId]: true,
                },
                myLockedBid: lockedBid,
              },
            },
            isSubmittingAction: false,
          };
        });
        return true;
      } else {
        this.setState({ activeError: res.error, isSubmittingAction: false });
        return false;
      }
    } catch {
      this.setState({
        activeError: { code: 'INVALID_STATE_ACTION', message: 'Failed to submit bid' },
        isSubmittingAction: false,
      });
      return false;
    }
  };

  public completeTutorial = async (): Promise<void> => {
    markTutorialSeen();
    this.setState({ showTutorialOverlay: false });
    socketClient.trackTelemetry('TUTORIAL_COMPLETE');

    if (this.state.match) {
      await socketClient.markTutorialDone(this.state.match.roomCode);
    }
  };

  public rematch = async (): Promise<void> => {
    if (!this.state.match) return;
    this.setState({ isSubmittingAction: true });
    socketClient.trackTelemetry('REMATCH_CLICKED');
    await socketClient.requestRematch(this.state.match.roomCode);
    this.setState({ isSubmittingAction: false });
  };

  public leaveToHome = async (): Promise<void> => {
    const roomCode = this.state.match?.roomCode;
    clearActiveSession();
    this.clearUrlRoom();
    this.setState({
      match: null,
      myPlayerId: null,
      opponentReconnectDeadlineAt: null,
      showTutorialOverlay: false,
      activeError: null,
      toastMessage: null,
    });
    if (roomCode) {
      try {
        await socketClient.leaveRoom(roomCode);
      } catch (e) {
        console.warn('Failed to emit room:leave', e);
      }
    }
  };

  public trackShare = (): void => {
    socketClient.trackTelemetry('SHARE_CLICKED');
  };

  public clearToast = (): void => {
    this.setState({ toastMessage: null });
  };

  public clearError = (): void => {
    this.setState({ activeError: null });
  };
}

export const matchStore = new MatchStore();

export function useMatchStore(): [MatchStoreState, MatchStore] {
  const state = useSyncExternalStore(matchStore.subscribe, matchStore.getState, matchStore.getState);
  return [state, matchStore];
}
