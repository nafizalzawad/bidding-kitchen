import type { GameError } from '@bidding-kitchen/shared';

const BLOCKED_WORDS = new Set([
  'nigger',
  'nigga',
  'faggot',
  'fag',
  'kike',
  'chink',
  'spic',
  'cunt',
  'whore',
  'slut',
  'bitch',
  'retard',
  'hitler',
  'nazi',
  'fuck',
  'shit',
  'asshole',
]);

/**
 * Normalizes leetspeak and special characters to standard lowercase Latin characters.
 */
function normalizeLeetspeak(str: string): string {
  return str
    .toLowerCase()
    .replace(/0/g, 'o')
    .replace(/1/g, 'i')
    .replace(/3/g, 'e')
    .replace(/4/g, 'a')
    .replace(/5/g, 's')
    .replace(/@/g, 'a')
    .replace(/\$/g, 's')
    .replace(/[ _-]/g, '');
}

export type ValidateNicknameResult =
  | { ok: true; nickname: string }
  | { ok: false; error: GameError };

/**
 * Validates player nicknames against length, character constraints, and a profanity blocklist.
 */
export function validateNickname(rawNickname: string): ValidateNicknameResult {
  if (typeof rawNickname !== 'string') {
    return {
      ok: false,
      error: { code: 'INVALID_NICKNAME', message: 'Nickname must be a string' },
    };
  }

  const trimmed = rawNickname.trim();

  if (trimmed.length < 2 || trimmed.length > 16) {
    return {
      ok: false,
      error: {
        code: 'INVALID_NICKNAME',
        message: 'Nickname must be between 2 and 16 characters',
      },
    };
  }

  if (!/^[a-zA-Z0-9 _-]+$/.test(trimmed)) {
    return {
      ok: false,
      error: {
        code: 'INVALID_NICKNAME',
        message: 'Nickname can only contain alphanumeric characters, spaces, underscores, and dashes',
      },
    };
  }

  const normalized = normalizeLeetspeak(trimmed);

  for (const blocked of BLOCKED_WORDS) {
    if (normalized.includes(blocked)) {
      return {
        ok: false,
        error: {
          code: 'INVALID_NICKNAME',
          message: 'Nickname contains disallowed words',
        },
      };
    }
  }

  return {
    ok: true,
    nickname: trimmed,
  };
}
