import React, { useEffect, useState, useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { getRemainingStateMs } from '@bidding-kitchen/shared';
import { useMatchStore } from '../store/match-store.js';
import { getSavedNickname } from '../network/session-storage.js';
import { useReducedMotion } from '../hooks/useReducedMotion.js';
import { LandingScreen } from './LandingScreen.js';
import { LobbyScreen } from './LobbyScreen.js';
import { MatchIntroScreen } from './MatchIntroScreen.js';
import { AuctionRoundScreen } from './AuctionRoundScreen.js';
import { FinalRevealScreen } from './FinalRevealScreen.js';
import { PostMatchScreen } from './PostMatchScreen.js';
import { TutorialOverlay } from '../components/game/TutorialOverlay.js';
import { ConnectionBanner } from '../components/layout/ConnectionBanner.js';
import { Toast } from '../components/ui/Toast.js';

export const LiveMatchContainer: React.FC = () => {
  const [storeState, store] = useMatchStore();
  const prefersReduced = useReducedMotion();
  const [now, setNow] = useState<number>(Date.now());

  // URL ?room= parameter
  const urlRoomCode = useMemo(() => {
    if (typeof window === 'undefined') return '';
    const params = new URLSearchParams(window.location.search);
    return params.get('room') || '';
  }, []);

  // Initialize socket and resume session on mount
  useEffect(() => {
    store.init();
  }, [store]);

  // High-frequency 100ms ticker for non-drifting countdowns
  useEffect(() => {
    const timer = setInterval(() => {
      setNow(Date.now());
    }, 100);
    return () => clearInterval(timer);
  }, []);

  const {
    match,
    myPlayerId,
    clockOffsetMs,
    opponentReconnectDeadlineAt,
    activeError,
    toastMessage,
    isSubmittingAction,
    showTutorialOverlay,
  } = storeState;

  // Compute countdown in seconds for current state
  const remainingMs = match ? getRemainingStateMs(match, now, clockOffsetMs) : 0;
  const countdownSeconds = Math.max(0, Math.ceil(remainingMs / 1000));

  // Compute opponent disconnect countdown
  const oppRemainingMs = opponentReconnectDeadlineAt
    ? Math.max(0, opponentReconnectDeadlineAt - (now + clockOffsetMs))
    : 0;
  const oppDisconnectSeconds = Math.ceil(oppRemainingMs / 1000);

  // Group match states into top-level phase keys to prevent intra-round screen re-mounts
  const currentPhaseKey = useMemo(() => {
    if (!match) return 'LANDING';
    switch (match.state) {
      case 'LOBBY':
      case 'TIER_CONFIRMED':
        return 'LOBBY';
      case 'MATCH_INTRO':
        return 'MATCH_INTRO';
      case 'ROUND_REVEAL':
      case 'BIDDING':
      case 'LOCKED':
      case 'RESOLVE':
      case 'ROUND_END':
        return 'AUCTION_ROUND';
      case 'FINAL_REVEAL':
        return 'FINAL_REVEAL';
      case 'POST_MATCH':
        return 'POST_MATCH';
      default:
        return 'LANDING';
    }
  }, [match]);

  const animationVariants = {
    initial: prefersReduced ? { opacity: 0 } : { opacity: 0, scale: 0.98 },
    animate: { opacity: 1, scale: 1 },
    exit: prefersReduced ? { opacity: 0 } : { opacity: 0, scale: 0.98 },
  };

  const transitionConfig = {
    duration: prefersReduced ? 0.12 : 0.18,
    ease: 'easeInOut' as const,
  };

  return (
    <div className="flex-1 flex flex-col w-full relative">
      {/* Opponent Disconnect Countdown Alert */}
      {opponentReconnectDeadlineAt !== null && (
        <div className="w-full max-w-lg mx-auto mb-3">
          <ConnectionBanner
            opponentDisconnected={true}
            countdownSeconds={oppDisconnectSeconds}
          />
        </div>
      )}

      {/* Screen Routing with AnimatePresence */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentPhaseKey}
          variants={animationVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          transition={transitionConfig}
          className="flex-1 flex flex-col w-full"
        >
          {!match && (
            <LandingScreen
              initialNickname={getSavedNickname() || 'Chef'}
              initialRoomCode={urlRoomCode}
              isSubmitting={isSubmittingAction}
              selectedTier={storeState.selectedTier}
              isSearchingMatch={storeState.isSearchingMatch}
              onSelectTier={store.setSelectedTier}
              onCreateRoom={store.createRoom}
              onJoinRoom={store.joinRoom}
              onQuickMatch={store.startQuickMatch}
              onCancelQuickMatch={store.cancelQuickMatch}
            />
          )}

          {match && (match.state === 'LOBBY' || match.state === 'TIER_CONFIRMED') && (
            <LobbyScreen
              match={match}
              myPlayerId={myPlayerId ?? ''}
              isSubmitting={isSubmittingAction}
              onToggleReady={store.toggleReady}
              onSelectTier={store.selectTier}
              onLeaveLobby={store.leaveToHome}
            />
          )}

          {match && match.state === 'MATCH_INTRO' && (
            <MatchIntroScreen
              match={match}
              countdownSeconds={countdownSeconds}
            />
          )}

          {match &&
            (match.state === 'ROUND_REVEAL' ||
              match.state === 'BIDDING' ||
              match.state === 'LOCKED' ||
              match.state === 'RESOLVE' ||
              match.state === 'ROUND_END') && (
              <AuctionRoundScreen
                key={`round-${match.roundIndex}`}
                match={match}
                myPlayerId={myPlayerId ?? ''}
                countdownSeconds={countdownSeconds}
                onLockBid={store.lockBid}
              />
            )}

          {match && match.state === 'FINAL_REVEAL' && (
            <FinalRevealScreen
              match={match}
              myPlayerId={myPlayerId ?? ''}
              onProceed={() => {}}
            />
          )}

          {match && match.state === 'POST_MATCH' && (
            <PostMatchScreen
              match={match}
              myPlayerId={myPlayerId ?? ''}
              onRequestRematch={store.rematch}
              onReturnHome={store.leaveToHome}
              onShare={store.trackShare}
            />
          )}
        </motion.div>
      </AnimatePresence>

      {/* Tutorial Overlay for first-time players */}
      <TutorialOverlay
        isOpen={showTutorialOverlay}
        onClose={store.completeTutorial}
        onComplete={store.completeTutorial}
      />

      {/* Toast Notification Banner */}
      <Toast
        isOpen={Boolean(toastMessage)}
        message={toastMessage || ''}
        type="info"
        onClose={store.clearToast}
      />

      {/* Error Toast */}
      <Toast
        isOpen={Boolean(activeError)}
        message={activeError?.message || 'An error occurred'}
        type="error"
        onClose={store.clearError}
      />
    </div>
  );
};
