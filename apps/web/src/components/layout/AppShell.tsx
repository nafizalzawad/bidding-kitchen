import React, { useState } from 'react';
import { SoundToggle } from '../ui/SoundToggle.js';
import { ComboHintDrawer } from '../game/ComboHintDrawer.js';
import { TutorialOverlay } from '../game/TutorialOverlay.js';
import { Sparkles, HelpCircle } from 'lucide-react';

export interface AppShellProps {
  children: React.ReactNode;
  headerRight?: React.ReactNode;
  showComboToggle?: boolean;
  onOpenTutorial?: () => void;
  className?: string;
}

export const AppShell: React.FC<AppShellProps> = ({
  children,
  headerRight,
  showComboToggle = true,
  onOpenTutorial,
  className = '',
}) => {
  const [isComboDrawerOpen, setIsComboDrawerOpen] = useState(false);
  const [isTutorialOpen, setIsTutorialOpen] = useState(false);

  const handleTutorialTrigger = () => {
    if (onOpenTutorial) {
      onOpenTutorial();
    } else {
      setIsTutorialOpen(true);
    }
  };

  return (
    <div className={`min-h-screen bg-[#FFFDF7] text-[#1E1B18] flex flex-col ${className}`}>
      {/* Top Header */}
      <header className="sticky top-0 z-30 bg-[#FFFDF7]/95 backdrop-blur-sm border-b-2 border-[#1E1B18] px-4 py-2.5 sm:px-6">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-3">
          {/* Logo / App Name */}
          <div className="flex items-center gap-2">
            <span className="text-2xl filter drop-shadow-sm select-none" role="img" aria-label="Burger">
              🍔
            </span>
            <div>
              <h1
                data-testid="app-title"
                className="text-lg sm:text-xl font-black font-display tracking-tight text-[#1E1B18] leading-tight"
              >
                Bidding Kitchen
              </h1>
              <p className="text-[10px] text-[#57514A] font-bold hidden sm:block">
                Tactile Auction Cooking Battle
              </p>
            </div>
          </div>

          {/* Action Tools: Combos, Tutorial, Sound */}
          <div className="flex items-center gap-2">
            {headerRight}

            {showComboToggle && (
              <button
                type="button"
                onClick={() => setIsComboDrawerOpen(true)}
                aria-label="View flavor combos"
                data-testid="header-combos-btn"
                className="min-h-[44px] min-w-[44px] px-3 py-2 rounded-xl border-2 border-[#1E1B18] bg-[#FFFFFF] hover:bg-[#F4EFE2] text-[#1E1B18] shadow-[0_3px_0_#1E1B18] active:translate-y-[1px] active:shadow-[0_1px_0_#1E1B18] transition flex items-center gap-1.5 font-bold text-xs cursor-pointer"
              >
                <Sparkles className="w-4 h-4 text-[#FFB703]" />
                <span className="hidden xs:inline">Combos</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleTutorialTrigger}
              aria-label="How to play tutorial"
              data-testid="header-tutorial-btn"
              className="min-h-[44px] min-w-[44px] p-2.5 rounded-xl border-2 border-[#1E1B18] bg-[#FFFFFF] hover:bg-[#F4EFE2] text-[#1E1B18] shadow-[0_3px_0_#1E1B18] active:translate-y-[1px] active:shadow-[0_1px_0_#1E1B18] transition flex items-center justify-center cursor-pointer"
            >
              <HelpCircle className="w-5 h-5 text-[#2563EB]" />
            </button>

            <SoundToggle />
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 w-full max-w-4xl mx-auto p-4 sm:p-6 flex flex-col">
        {children}
      </main>

      {/* Modals & Drawers */}
      <ComboHintDrawer
        isOpen={isComboDrawerOpen}
        onClose={() => setIsComboDrawerOpen(false)}
      />

      <TutorialOverlay
        isOpen={isTutorialOpen}
        onClose={() => setIsTutorialOpen(false)}
      />
    </div>
  );
};
