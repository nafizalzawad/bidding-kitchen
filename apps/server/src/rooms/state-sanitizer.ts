import type {
  Match,
  PublicMatchView,
  PublicPlayerView,
  PublicRoundView,
} from '@bidding-kitchen/shared';

/**
 * Pure state sanitizer.
 * Enforces the authoritative anti-cheat boundary:
 * - reconnectToken is NEVER exposed to any client.
 * - Opponent's secretOrder is hidden until FINAL_REVEAL or POST_MATCH.
 * - Opponent's uncommitted or locked private bid is hidden during BIDDING and LOCKED.
 * - Resolution is hidden until RESOLVE state.
 */
export function sanitizeMatchForPlayer(
  match: Match,
  viewerPlayerId: string,
  serverNow: number,
): PublicMatchView {
  const isPostGame = match.state === 'FINAL_REVEAL' || match.state === 'POST_MATCH';
  const isResolutionState =
    match.state === 'RESOLVE' ||
    match.state === 'ROUND_END' ||
    isPostGame;

  // Sanitize players
  const players: [PublicPlayerView | null, PublicPlayerView | null] = [
    sanitizePlayer(match.players[0], viewerPlayerId, match.config.showOpponentBudget, isPostGame),
    sanitizePlayer(match.players[1], viewerPlayerId, match.config.showOpponentBudget, isPostGame),
  ];

  // Sanitize current round
  let currentRound: PublicRoundView | null = null;
  const rawRound = match.rounds[match.roundIndex];

  if (rawRound) {
    const bidsLockedByPlayer: Record<string, boolean> = {};
    for (const p of match.players) {
      if (p) {
        bidsLockedByPlayer[p.id] = Boolean(rawRound.bidsLockedByPlayer[p.id]);
      }
    }

    const myLockedBid = rawRound.privateBids[viewerPlayerId] ?? null;
    const resolution = isResolutionState ? rawRound.resolution : null;

    currentRound = {
      roundIndex: rawRound.roundIndex,
      slot: rawRound.slot,
      availableIngredients: rawRound.availableIngredients,
      bidsLockedByPlayer,
      myLockedBid,
      resolution,
      startedAt: rawRound.startedAt,
      deadlineAt: rawRound.deadlineAt,
    };
  }

  // Result is revealed only in FINAL_REVEAL or POST_MATCH
  const result = isPostGame ? match.result : null;

  return {
    id: match.id,
    roomCode: match.roomCode,
    tier: match.tier,
    state: match.state,
    config: match.config,
    roundIndex: match.roundIndex,
    myPlayerId: viewerPlayerId,
    players,
    currentRound,
    remainingStock: match.remainingStock,
    result,
    serverNow,
    stateEnteredAt: match.stateEnteredAt,
    stateDeadlineAt: match.stateDeadlineAt,
  };
}

function sanitizePlayer(
  player: Match['players'][number],
  viewerPlayerId: string,
  showOpponentBudget: boolean,
  isPostGame: boolean,
): PublicPlayerView | null {
  if (!player) return null;

  const isSelf = player.id === viewerPlayerId;

  // Budget is visible if viewer is self, or config allows, or match is in post-game
  const budget = isSelf || showOpponentBudget || isPostGame ? player.budget : null;

  // Secret order is visible only to self, or in post-game reveal
  const secretOrder = isSelf || isPostGame ? player.secretOrder : null;

  return {
    id: player.id,
    nickname: player.nickname,
    seat: player.seat,
    ready: player.ready,
    connected: player.connected,
    disconnectedAt: player.disconnectedAt,
    budget,
    dish: player.dish,
    secretOrder,
    chefsTipGranted: player.chefsTipGranted,
    isBot: player.isBot ?? false,
    botDifficulty: player.botDifficulty,
  };
}
