export interface ActiveSession {
  roomCode: string;
  playerId: string;
  reconnectToken: string;
}

const SESSION_KEY = 'bk_active_session';
const NICKNAME_KEY = 'bk_nickname';
const TUTORIAL_KEY = 'bk_tutorial_seen';
const SOUND_KEY = 'bk_sound_muted';

export function saveActiveSession(session: ActiveSession): void {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
  } catch (e) {
    console.warn('Failed to save session to sessionStorage', e);
  }
}

export function loadActiveSession(): ActiveSession | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed.roomCode === 'string' && typeof parsed.playerId === 'string') {
      return parsed as ActiveSession;
    }
    return null;
  } catch {
    return null;
  }
}

export function clearActiveSession(): void {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.removeItem(SESSION_KEY);
  } catch (e) {
    console.warn('Failed to clear session from sessionStorage', e);
  }
}

export function getSavedNickname(): string {
  if (typeof window === 'undefined') return '';
  try {
    return window.localStorage.getItem(NICKNAME_KEY) || '';
  } catch {
    return '';
  }
}

export function saveNickname(nickname: string): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(NICKNAME_KEY, nickname.trim());
  } catch (e) {
    console.warn('Failed to save nickname to localStorage', e);
  }
}

export function hasSeenTutorial(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.localStorage.getItem(TUTORIAL_KEY) === 'true';
  } catch {
    return false;
  }
}

export function markTutorialSeen(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(TUTORIAL_KEY, 'true');
  } catch (e) {
    console.warn('Failed to mark tutorial seen in localStorage', e);
  }
}

export function getSoundMuted(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.localStorage.getItem(SOUND_KEY) === 'true';
  } catch {
    return false;
  }
}

export function saveSoundMuted(muted: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(SOUND_KEY, muted ? 'true' : 'false');
  } catch (e) {
    console.warn('Failed to save sound mute preference to localStorage', e);
  }
}
