import React, { useState, useEffect } from 'react';
import {
  MOCK_HARNESS_STATES,
  type HarnessStateKey,
} from '../fixtures/mock-match-states.js';
import { AppShell } from '../components/layout/AppShell.js';
import { ErrorBoundary } from '../components/layout/ErrorBoundary.js';
import { LandingScreen } from './LandingScreen.js';
import { LobbyScreen } from './LobbyScreen.js';
import { MatchIntroScreen } from './MatchIntroScreen.js';
import { AuctionRoundScreen } from './AuctionRoundScreen.js';
import { FinalRevealScreen } from './FinalRevealScreen.js';
import { PostMatchScreen } from './PostMatchScreen.js';
import { TutorialOverlay } from '../components/game/TutorialOverlay.js';
import { Modal } from '../components/ui/Modal.js';
import { Button } from '../components/ui/Button.js';
import { AlertCircle, EyeOff, Sparkles, Zap, Cpu } from 'lucide-react';
import { DualClientInspector } from '../components/game/DualClientInspector.js';
import { EngineSandboxPanel } from '../components/game/EngineSandboxPanel.js';

export interface StorybookHarnessScreenProps {
  initialStateKey?: HarnessStateKey;
  hideBarDefault?: boolean;
}

export const StorybookHarnessScreen: React.FC<StorybookHarnessScreenProps> = ({
  initialStateKey = 'BIDDING_ACTIVE',
  hideBarDefault = false,
}) => {
  // Read state from URL if present
  const getUrlState = (): HarnessStateKey => {
    if (typeof window === 'undefined') return initialStateKey;
    const params = new URLSearchParams(window.location.search);
    const stateParam = params.get('state') as HarnessStateKey | null;
    if (stateParam && MOCK_HARNESS_STATES[stateParam]) {
      return stateParam;
    }
    return initialStateKey;
  };

  const getUrlHideBar = (): boolean => {
    if (typeof window === 'undefined') return hideBarDefault;
    const params = new URLSearchParams(window.location.search);
    return params.get('hideBar') === 'true' || hideBarDefault;
  };

  const [activeKey, setActiveKey] = useState<HarnessStateKey>(getUrlState);
  const [hideBar, setHideBar] = useState<boolean>(getUrlHideBar);
  const [activeTab, setActiveTab] = useState<'HARNESS' | 'INSPECTOR' | 'SANDBOX'>('HARNESS');
  const [showTutorialManual, setShowTutorialManual] = useState<boolean>(false);

  // Sync state with URL parameter if changed externally
  useEffect(() => {
    const handlePopState = () => {
      setActiveKey(getUrlState());
      setHideBar(getUrlHideBar());
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const handleSelectState = (key: HarnessStateKey) => {
    setActiveKey(key);
    setShowTutorialManual(false);
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.set('state', key);
      window.history.pushState({}, '', url.toString());
    }
  };

  const stateData = MOCK_HARNESS_STATES[activeKey];
  const keys = Object.keys(MOCK_HARNESS_STATES) as HarnessStateKey[];

  const urlParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
  const animStepMs = urlParams?.get('animStepMs') ? Number(urlParams.get('animStepMs')) : undefined;

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-[#FFFDF7] flex flex-col text-[#1E1B18]">
        {/* Floating Developer State Switcher Bar */}
        {!hideBar && (
          <header className="bg-[#1E1B18] text-[#FFFDF7] border-b-2 border-[#1E1B18] px-3 py-2 z-40 sticky top-0 shadow-md">
            <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-black font-display text-[#FFB703] uppercase tracking-wider flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Storybook Harness</span>
                </span>

                {/* State selector dropdown */}
                <select
                  data-testid="harness-state-select"
                  value={activeKey}
                  onChange={(e) => handleSelectState(e.target.value as HarnessStateKey)}
                  aria-label="Select Storybook Harness Mock State"
                  className="bg-[#2C3140] text-[#FFFDF7] text-xs font-bold px-2.5 py-1 rounded-lg border border-[#57514A] focus:outline-none focus:ring-1 focus:ring-[#FFB703] cursor-pointer"
                >
                  {keys.map((k) => (
                    <option key={k} value={k}>
                      {MOCK_HARNESS_STATES[k].label}
                    </option>
                  ))}
                </select>
              </div>

              {/* View Switchers: Harness, Live Inspector, Sandbox */}
              <div className="flex items-center gap-1.5 text-xs">
                <button
                  type="button"
                  onClick={() => setActiveTab('HARNESS')}
                  className={`px-2.5 py-1 rounded-md font-bold transition cursor-pointer ${
                    activeTab === 'HARNESS'
                      ? 'bg-[#FFB703] text-[#1E1B18]'
                      : 'bg-transparent text-[#FFFDF7] hover:bg-[#2C3140]'
                  }`}
                >
                  Harness Screens
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('INSPECTOR')}
                  className={`px-2.5 py-1 rounded-md font-bold transition flex items-center gap-1 cursor-pointer ${
                    activeTab === 'INSPECTOR'
                      ? 'bg-[#FFB703] text-[#1E1B18]'
                      : 'bg-transparent text-[#FFFDF7] hover:bg-[#2C3140]'
                  }`}
                >
                  <Zap className="w-3 h-3 text-[#FFB703]" />
                  <span>Dual-Inspector</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('SANDBOX')}
                  className={`px-2.5 py-1 rounded-md font-bold transition flex items-center gap-1 cursor-pointer ${
                    activeTab === 'SANDBOX'
                      ? 'bg-[#FFB703] text-[#1E1B18]'
                      : 'bg-transparent text-[#FFFDF7] hover:bg-[#2C3140]'
                  }`}
                >
                  <Cpu className="w-3 h-3 text-[#FFB703]" />
                  <span>Sandbox</span>
                </button>

                <button
                  type="button"
                  onClick={() => setHideBar(true)}
                  title="Hide dev bar for pure visual screenshot"
                  aria-label="Hide Bar"
                  className="ml-2 px-2 py-1 rounded-md bg-[#2C3140] hover:bg-[#57514A] text-[#FFFDF7] flex items-center gap-1 cursor-pointer"
                >
                  <EyeOff className="w-3 h-3" />
                  <span className="text-[10px]">Hide Bar</span>
                </button>
              </div>
            </div>
          </header>
        )}

        {/* Tab Views */}
        {activeTab === 'INSPECTOR' ? (
          <div className="p-4 max-w-7xl mx-auto w-full">
            <DualClientInspector />
          </div>
        ) : activeTab === 'SANDBOX' ? (
          <div className="p-4 max-w-5xl mx-auto w-full">
            <EngineSandboxPanel />
          </div>
        ) : (
          /* Primary Harness Screen View */
          <AppShell
            showComboToggle={activeKey !== 'LANDING'}
            onOpenTutorial={() => setShowTutorialManual(true)}
          >
            {/* Screen State Switcher Rendering */}
            {activeKey === 'LANDING' ? (
              <LandingScreen
                initialNickname="ChefNafiz"
                onCreateRoom={(_nick) => handleSelectState('LOBBY_HOST')}
                onJoinRoom={(_code, _nick) => handleSelectState('LOBBY_GUEST_READY')}
              />
            ) : activeKey === 'LOBBY_HOST' || activeKey === 'LOBBY_GUEST_READY' ? (
              <LobbyScreen
                match={stateData.match!}
                myPlayerId={stateData.myPlayerId}
                onToggleReady={() => {
                  if (activeKey === 'LOBBY_HOST') handleSelectState('LOBBY_GUEST_READY');
                  else handleSelectState('TIER_CONFIRMED_COUNTDOWN');
                }}
                onLeaveLobby={() => handleSelectState('LANDING')}
              />
            ) : activeKey === 'TIER_CONFIRMED_COUNTDOWN' ? (
              <div className="relative flex-1 flex flex-col">
                <LobbyScreen
                  match={stateData.match!}
                  myPlayerId={stateData.myPlayerId}
                />
                {/* Countdown Modal Overlay */}
                <Modal
                  isOpen={true}
                  onClose={() => handleSelectState('MATCH_INTRO')}
                  title="Chefs Ready!"
                >
                  <div className="flex flex-col items-center text-center py-4">
                    <span className="text-4xl animate-bounce mb-3">🔥</span>
                    <h4 className="text-2xl font-black font-display text-[#1E1B18] mb-1">
                      Both Chefs Ready!
                    </h4>
                    <p className="text-sm font-bold text-[#57514A] mb-4">
                      Match starting in {stateData.countdownSeconds ?? 3} seconds...
                    </p>
                    <Button
                      variant="primary"
                      size="md"
                      onClick={() => handleSelectState('MATCH_INTRO')}
                    >
                      Enter Kitchen Now
                    </Button>
                  </div>
                </Modal>
              </div>
            ) : activeKey === 'MATCH_INTRO' || activeKey === 'TUTORIAL_OVERLAY' ? (
              <>
                <MatchIntroScreen
                  match={stateData.match!}
                  onStartCooking={() => handleSelectState('BIDDING_ACTIVE')}
                />
                <TutorialOverlay
                  isOpen={activeKey === 'TUTORIAL_OVERLAY' || showTutorialManual}
                  onClose={() => {
                    setShowTutorialManual(false);
                    if (activeKey === 'TUTORIAL_OVERLAY') handleSelectState('MATCH_INTRO');
                  }}
                  onComplete={() => handleSelectState('BIDDING_ACTIVE')}
                />
              </>
            ) : activeKey === 'BIDDING_ACTIVE' ||
              activeKey === 'BIDDING_LOCKED_WAITING' ||
              activeKey === 'ROUND_RESOLVE_COLLISION' ||
              activeKey === 'ROUND_END_BREATHER' ||
              activeKey === 'OPPONENT_DISCONNECTED' ? (
              <AuctionRoundScreen
                match={stateData.match!}
                myPlayerId={stateData.myPlayerId}
                countdownSeconds={stateData.countdownSeconds}
                forcedElapsedMs={animStepMs}
                onLockBid={(_ingredientId, _amount) => handleSelectState('BIDDING_LOCKED_WAITING')}
              />
            ) : activeKey === 'FINAL_REVEAL' ? (
              <FinalRevealScreen
                match={stateData.match!}
                myPlayerId={stateData.myPlayerId}
                forcedElapsedMs={animStepMs}
                onProceed={() => handleSelectState('POST_MATCH')}
              />
            ) : activeKey === 'POST_MATCH' ? (
              <PostMatchScreen
                match={stateData.match!}
                myPlayerId={stateData.myPlayerId}
                onRequestRematch={() => handleSelectState('LOBBY_GUEST_READY')}
                onNewTier={() => handleSelectState('LOBBY_HOST')}
                onReturnHome={() => handleSelectState('LANDING')}
              />
            ) : activeKey === 'ERROR_EMPTY_STATE' ? (
              <div
                data-testid="screen-error-empty"
                className="flex-1 flex flex-col items-center justify-center max-w-md mx-auto text-center p-6 animate-fade-in"
              >
                <div className="w-16 h-16 rounded-2xl bg-[#FEE2E2] border-2 border-[#1E1B18] flex items-center justify-center text-[#DC2626] mb-4 shadow-[0_4px_0_#1E1B18]">
                  <AlertCircle className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-black font-display text-[#1E1B18] mb-2">
                  Kitchen Not Found
                </h3>
                <p className="text-xs sm:text-sm text-[#57514A] font-medium mb-6">
                  {stateData.error?.message ?? 'The room was not found or has expired.'}
                </p>
                <Button
                  variant="primary"
                  size="md"
                  fullWidth
                  onClick={() => handleSelectState('LANDING')}
                >
                  Return to Kitchen Lobby
                </Button>
              </div>
            ) : null}
          </AppShell>
        )}
      </div>
    </ErrorBoundary>
  );
};
