import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { LandingScreen } from '../src/screens/LandingScreen.js';
import { LobbyScreen } from '../src/screens/LobbyScreen.js';
import { TutorialOverlay } from '../src/components/game/TutorialOverlay.js';
import { AuctionRoundScreen } from '../src/screens/AuctionRoundScreen.js';
import { FinalRevealScreen } from '../src/screens/FinalRevealScreen.js';
import { PostMatchScreen } from '../src/screens/PostMatchScreen.js';
import { ConnectionBanner } from '../src/components/layout/ConnectionBanner.js';
import { ComboHintDrawer } from '../src/components/game/ComboHintDrawer.js';
import { MOCK_HARNESS_STATES } from '../src/fixtures/mock-match-states.js';

describe('Phase 4 Component & Screen Tests', () => {
  // 1. LandingScreen Tests
  describe('LandingScreen', () => {
    it('validates nickname length and triggers onCreateRoom callback', () => {
      const onCreateRoom = vi.fn();
      render(<LandingScreen onCreateRoom={onCreateRoom} />);

      const input = screen.getByTestId('nickname-input');
      const createBtn = screen.getByTestId('create-room-btn');

      // Invalid short nickname
      fireEvent.change(input, { target: { value: 'A' } });
      fireEvent.click(createBtn);
      expect(screen.getByText(/at least 2 characters/i)).toBeInTheDocument();
      expect(onCreateRoom).not.toHaveBeenCalled();

      // Valid nickname
      fireEvent.change(input, { target: { value: 'ChefNafiz' } });
      fireEvent.click(createBtn);
      expect(onCreateRoom).toHaveBeenCalledWith('ChefNafiz');
    });

    it('validates room code and triggers onJoinRoom callback', () => {
      const onJoinRoom = vi.fn();
      render(<LandingScreen onJoinRoom={onJoinRoom} />);

      const codeInput = screen.getByTestId('join-room-code-input');
      const joinBtn = screen.getByTestId('join-room-submit-btn');

      // Invalid short room code
      fireEvent.change(codeInput, { target: { value: 'AB' } });
      fireEvent.click(joinBtn);
      expect(screen.getByText(/valid 4 to 6-character room code/i)).toBeInTheDocument();
      expect(onJoinRoom).not.toHaveBeenCalled();

      // Valid room code
      fireEvent.change(codeInput, { target: { value: 'burg42' } });
      fireEvent.click(joinBtn);
      expect(onJoinRoom).toHaveBeenCalledWith('BURG42', 'ChefNafiz');
    });

    it('selects AI difficulty and triggers onPlayVsBot callback', () => {
      const onPlayVsBot = vi.fn();
      render(<LandingScreen onPlayVsBot={onPlayVsBot} />);

      // Switch to Hard difficulty
      const hardTab = screen.getByTestId('bot-difficulty-hard');
      fireEvent.click(hardTab);

      const playBtn = screen.getByTestId('play-vs-bot-btn');
      expect(playBtn).toHaveTextContent(/Practice vs AI \(Hard\)/i);

      fireEvent.click(playBtn);
      expect(onPlayVsBot).toHaveBeenCalledWith('ChefNafiz', 'STREET', 'HARD');
    });
  });

  // 2. LobbyScreen Tests
  describe('LobbyScreen', () => {
    it('displays room code BURG42 and handles copy invite link', () => {
      const match = MOCK_HARNESS_STATES.LOBBY_HOST.match!;
      const onCopyInviteLink = vi.fn();
      render(
        <LobbyScreen
          match={match}
          myPlayerId="p1"
          onCopyInviteLink={onCopyInviteLink}
        />,
      );

      expect(screen.getByTestId('room-code-display')).toHaveTextContent('BURG42');
      const copyBtn = screen.getByTestId('copy-link-btn');
      fireEvent.click(copyBtn);
      expect(onCopyInviteLink).toHaveBeenCalled();
    });

    it('handles onToggleReady when both players are seated', () => {
      const match = MOCK_HARNESS_STATES.LOBBY_GUEST_READY.match!;
      const onToggleReady = vi.fn();
      render(
        <LobbyScreen
          match={match}
          myPlayerId="p1"
          onToggleReady={onToggleReady}
        />,
      );

      const readyBtn = screen.getByTestId('lobby-ready-btn');
      expect(readyBtn).not.toBeDisabled();
      fireEvent.click(readyBtn);
      expect(onToggleReady).toHaveBeenCalled();
    });
  });

  // 3. TutorialOverlay Tests
  describe('TutorialOverlay', () => {
    it('steps 1 -> 2 -> 3 and clicking "Got It, Let\'s Cook!" invokes onComplete', () => {
      const onComplete = vi.fn();
      const onClose = vi.fn();
      render(
        <TutorialOverlay isOpen={true} onClose={onClose} onComplete={onComplete} />,
      );

      // Step 1
      expect(screen.getByText('Secret Bidding & Collisions')).toBeInTheDocument();
      const nextBtn = screen.getByTestId('tutorial-next-btn');

      // Step 2
      fireEvent.click(nextBtn);
      expect(screen.getByText('Free $0 Basic Fallback')).toBeInTheDocument();

      // Step 3
      fireEvent.click(nextBtn);
      expect(screen.getByText('Flavor Tag Combos')).toBeInTheDocument();
      expect(screen.getByText("Got It, Let's Cook!")).toBeInTheDocument();

      // Finish
      fireEvent.click(nextBtn);
      expect(onComplete).toHaveBeenCalled();
      expect(onClose).toHaveBeenCalled();
    });
  });

  // 4. AuctionRoundScreen Tests
  describe('AuctionRoundScreen', () => {
    it('manages variant selection, min/max bid bounds, basic fallback locking, and lock CTA', () => {
      const match = MOCK_HARNESS_STATES.BIDDING_ACTIVE.match!;
      const onLockBid = vi.fn();
      render(
        <AuctionRoundScreen
          match={match}
          myPlayerId="p1"
          onLockBid={onLockBid}
        />,
      );

      // Verify Wagyu card
      const wagyuCard = screen.getByTestId('ingredient-card-street_patty_wagyu');
      expect(wagyuCard).toBeInTheDocument();

      // Select Wagyu (basePrice: 8, budget: 16)
      fireEvent.click(wagyuCard);
      expect(screen.getByTestId('bid-amount-display')).toHaveTextContent('$8');

      // Increment bid
      const incBtn = screen.getByTestId('bid-increment-btn');
      fireEvent.click(incBtn);
      expect(screen.getByTestId('bid-amount-display')).toHaveTextContent('$9');

      // Decrement bid back to 8
      const decBtn = screen.getByTestId('bid-decrement-btn');
      fireEvent.click(decBtn);
      expect(screen.getByTestId('bid-amount-display')).toHaveTextContent('$8');

      // Cannot decrement below base price ($8)
      expect(decBtn).toBeDisabled();

      // Select Basic Beef ($0)
      const basicCard = screen.getByTestId('ingredient-card-street_patty_basic');
      fireEvent.click(basicCard);
      expect(screen.getByTestId('bid-amount-display')).toHaveTextContent('$0');

      // Select Wagyu again, increment to $9 and lock
      fireEvent.click(wagyuCard);
      fireEvent.click(incBtn); // now $9
      const lockBtn = screen.getByTestId('lock-bid-btn');
      fireEvent.click(lockBtn);
      expect(onLockBid).toHaveBeenCalledWith('street_patty_wagyu', 9);
    });

    it('disables ingredients exceeding remaining budget', () => {
      // Create a match where player only has $3 left (Wagyu is $8, Chicken is $4, Smash is $5)
      const baseMatch = MOCK_HARNESS_STATES.BIDDING_ACTIVE.match!;
      const lowBudgetMatch = {
        ...baseMatch,
        players: [
          { ...baseMatch.players[0]!, budget: 3 },
          baseMatch.players[1]!,
        ] as [typeof baseMatch.players[0], typeof baseMatch.players[1]],
      };

      render(
        <AuctionRoundScreen
          match={lowBudgetMatch}
          myPlayerId="p1"
        />,
      );

      const wagyuCard = screen.getByTestId('ingredient-card-street_patty_wagyu');
      expect(wagyuCard).toHaveAttribute('aria-disabled', 'true');
    });
  });

  // 5. FinalRevealScreen & PostMatchScreen Tests
  describe('FinalRevealScreen & PostMatchScreen', () => {
    it('renders both player dishes, winner celebration, score tally, and proceed CTA', () => {
      const match = MOCK_HARNESS_STATES.FINAL_REVEAL.match!;
      const onProceed = vi.fn();
      render(
        <FinalRevealScreen
          match={match}
          myPlayerId="p1"
          onProceed={onProceed}
        />,
      );

      expect(screen.getByText(/ChefMaya Wins the Match!/i)).toBeInTheDocument();
      expect(screen.getByText(/The Grand Tasting/i)).toBeInTheDocument();
      expect(screen.getByText(/Score Breakdown/i)).toBeInTheDocument();

      const proceedBtn = screen.getByTestId('proceed-post-match-btn');
      fireEvent.click(proceedBtn);
      expect(onProceed).toHaveBeenCalled();
    });

    it('renders post match bid history, key moment badge, and rematch action', () => {
      const match = MOCK_HARNESS_STATES.POST_MATCH.match!;
      const onRequestRematch = vi.fn();
      render(
        <PostMatchScreen
          match={match}
          myPlayerId="p1"
          onRequestRematch={onRequestRematch}
        />,
      );

      expect(screen.getByTestId('key-moment-badge')).toBeInTheDocument();
      expect(screen.getByTestId('bid-history-table')).toBeInTheDocument();

      const rematchBtn = screen.getByTestId('post-match-rematch-btn');
      fireEvent.click(rematchBtn);
      expect(onRequestRematch).toHaveBeenCalled();
    });
  });

  // 6. ConnectionBanner & ComboHintDrawer Tests
  describe('ConnectionBanner & ComboHintDrawer', () => {
    it('displays reconnect countdown banner when opponent is disconnected', () => {
      render(
        <ConnectionBanner
          opponentDisconnected={true}
          countdownSeconds={28}
        />,
      );

      expect(screen.getByTestId('connection-banner')).toHaveTextContent(/28s remaining/i);
    });

    it('opens ComboHintDrawer and renders all combo recipes', () => {
      const onClose = vi.fn();
      render(<ComboHintDrawer isOpen={true} onClose={onClose} />);

      expect(screen.getByTestId('combo-hint-drawer')).toBeInTheDocument();
      expect(screen.getByTestId('combo-card-SMOKEHOUSE')).toBeInTheDocument();
      expect(screen.getByTestId('combo-card-HOT_AND_DECADENT')).toBeInTheDocument();
      expect(screen.getByTestId('combo-card-CHEFS_PRIDE')).toBeInTheDocument();

      const closeBtn = screen.getByTestId('combo-drawer-close-btn');
      fireEvent.click(closeBtn);
      expect(onClose).toHaveBeenCalled();
    });
  });
});
