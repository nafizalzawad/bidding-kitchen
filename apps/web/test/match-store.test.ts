import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  saveActiveSession,
  loadActiveSession,
  clearActiveSession,
  getSavedNickname,
  saveNickname,
  hasSeenTutorial,
  markTutorialSeen,
  getSoundMuted,
  saveSoundMuted,
} from '../src/network/session-storage.js';
import {
  getMyPlayerFromView,
  getOpponentPlayerFromView,
  getRemainingStateMs,
  type PublicMatchView,
  type PublicPlayerView,
} from '@bidding-kitchen/shared';
import { matchStore } from '../src/store/match-store.js';

class MockStorage implements Storage {
  private store = new Map<string, string>();
  get length() {
    return this.store.size;
  }
  clear() {
    this.store.clear();
  }
  getItem(key: string) {
    return this.store.get(key) ?? null;
  }
  key(index: number) {
    return Array.from(this.store.keys())[index] ?? null;
  }
  removeItem(key: string) {
    this.store.delete(key);
  }
  setItem(key: string, value: string) {
    this.store.set(key, String(value));
  }
}

const mockLocal = new MockStorage();
const mockSession = new MockStorage();
Object.defineProperty(window, 'localStorage', { value: mockLocal, writable: true });
Object.defineProperty(window, 'sessionStorage', { value: mockSession, writable: true });

describe('Web Client Match Store & Session Storage Unit Tests', () => {
  beforeEach(() => {
    mockLocal.clear();
    mockSession.clear();
    vi.clearAllMocks();
  });

  describe('Session Storage & Local Storage Persistence', () => {
    it('saves, loads, and clears active session in sessionStorage', () => {
      expect(loadActiveSession()).toBeNull();

      const session = {
        roomCode: 'BURG42',
        playerId: 'p_12345',
        reconnectToken: 'tok_secret',
      };
      saveActiveSession(session);
      expect(loadActiveSession()).toEqual(session);

      clearActiveSession();
      expect(loadActiveSession()).toBeNull();
    });

    it('persists and retrieves user nickname in localStorage', () => {
      expect(getSavedNickname()).toBe('');
      saveNickname('ChefNafiz');
      expect(getSavedNickname()).toBe('ChefNafiz');
    });

    it('tracks first-time tutorial completion flag in localStorage', () => {
      expect(hasSeenTutorial()).toBe(false);
      markTutorialSeen();
      expect(hasSeenTutorial()).toBe(true);
    });

    it('persists sound mute preference in localStorage', () => {
      expect(getSoundMuted()).toBe(false);
      saveSoundMuted(true);
      expect(getSoundMuted()).toBe(true);
      saveSoundMuted(false);
      expect(getSoundMuted()).toBe(false);
    });
  });

  describe('Client State Clock Offset & Selectors', () => {
    const p0: PublicPlayerView = {
      id: 'p0',
      nickname: 'ChefAlice',
      seat: 0,
      ready: true,
      connected: true,
      disconnectedAt: null,
      budget: 20,
      dish: [],
      secretOrder: null,
      chefsTipGranted: false,
    };

    const p1: PublicPlayerView = {
      id: 'p1',
      nickname: 'ChefBob',
      seat: 1,
      ready: true,
      connected: true,
      disconnectedAt: null,
      budget: 20,
      dish: [],
      secretOrder: null,
      chefsTipGranted: false,
    };

    const mockView: PublicMatchView = {
      id: 'm_sync',
      roomCode: 'BURG42',
      tier: 'STREET',
      state: 'BIDDING',
      config: {
        stockMode: 'ALL_COLLISIONS_CONTEST',
        uncontestedPaysBasePrice: true,
        enableCustomerOrders: false,
        enableChefsTip: false,
        showOpponentBudget: true,
        biddingDurationMs: 15000,
        reconnectWindowMs: 30000,
      },
      roundIndex: 0,
      myPlayerId: 'p0',
      players: [p0, p1],
      currentRound: null,
      remainingStock: {},
      result: null,
      serverNow: 1700000005000,
      stateEnteredAt: 1700000000000,
      stateDeadlineAt: 1700000020000,
    };

    it('correctly extracts myPlayer and opponentPlayer from view', () => {
      const me = getMyPlayerFromView(mockView);
      expect(me.id).toBe('p0');
      expect(me.nickname).toBe('ChefAlice');

      const opponent = getOpponentPlayerFromView(mockView);
      expect(opponent).not.toBeNull();
      expect(opponent?.id).toBe('p1');
      expect(opponent?.nickname).toBe('ChefBob');
    });

    it('neutralizes clock drift using serverNow offset', () => {
      const clockOffsetMs = 500;
      const clientNowMs = 1700000009500;
      // remaining = 1700000020000 - (1700000009500 + 500) = 10000ms
      const remaining = getRemainingStateMs(mockView, clientNowMs, clockOffsetMs);
      expect(remaining).toBe(10000);
    });

    it('clamps remaining time to 0 if deadline has expired', () => {
      const expiredView: PublicMatchView = {
        ...mockView,
        stateDeadlineAt: 1700000005000,
      };
      const remaining = getRemainingStateMs(expiredView, 1700000006000, 0);
      expect(remaining).toBe(0);
    });
  });

  describe('Match Store Initial State and Actions', () => {
    it('initializes with default idle state', () => {
      const state = matchStore.getState();
      expect(state.connectionStatus).toBeDefined();
      expect(state.match).toBeNull();
      expect(state.isSubmittingAction).toBe(false);
      expect(state.showTutorialOverlay).toBe(false);
    });

    it('clears toast and errors upon invoking store dismiss helpers', () => {
      matchStore.clearToast();
      expect(matchStore.getState().toastMessage).toBeNull();

      matchStore.clearError();
      expect(matchStore.getState().activeError).toBeNull();
    });
  });
});
