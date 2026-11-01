import React from 'react';
import type { PublicMatchView } from '@bidding-kitchen/shared';
import { Button } from '../components/ui/Button.js';
import { Card } from '../components/ui/Card.js';
import { Utensils, Swords, Sparkles, Coins } from 'lucide-react';

export interface MatchIntroScreenProps {
  match: PublicMatchView;
  countdownSeconds?: number;
  onStartCooking?: () => void;
}

export const MatchIntroScreen: React.FC<MatchIntroScreenProps> = ({
  match,
  countdownSeconds: _countdownSeconds = 3,
  onStartCooking,
}) => {
  const p1 = match.players[0]!;
  const p2 = match.players[1] ?? {
    id: 'p2',
    nickname: 'ChefMaya',
    budget: 20,
    seat: 1,
  };

  return (
    <div
      data-testid="screen-match-intro"
      className="flex-1 flex flex-col items-center justify-center max-w-lg mx-auto w-full py-4 animate-fade-in text-center"
    >
      {/* Intro Header */}
      <div className="mb-6">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FFB703] border-2 border-[#1E1B18] text-xs font-black font-display shadow-[0_2px_0_#1E1B18] uppercase tracking-wider mb-2">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Match Starting</span>
        </span>
        <h2 className="text-3xl font-black font-display text-[#1E1B18]">
          The Kitchen Battle Begins!
        </h2>
        <p className="text-xs sm:text-sm text-[#57514A] font-medium mt-1">
          Round 1 of 5: The Bun Auction
        </p>
      </div>

      {/* Face to Face Chefs Card */}
      <Card padding="md" className="w-full mb-6">
        <div className="flex items-center justify-between gap-3">
          {/* Chef 1 */}
          <div className="flex-1 flex flex-col items-center">
            <div className="w-14 h-14 rounded-full bg-[#FFB703] border-3 border-[#1E1B18] flex items-center justify-center text-2xl shadow-[0_3px_0_#1E1B18] mb-2">
              👨‍🍳
            </div>
            <h3 className="text-sm font-extrabold font-display text-[#1E1B18] truncate max-w-[120px]">
              {p1.nickname}
            </h3>
            <span className="inline-flex items-center gap-1 text-xs font-bold text-[#1D7A4C] mt-1">
              <Coins className="w-3.5 h-3.5 text-[#FFB703]" />
              <span className="tabular-nums">${p1.budget}</span>
            </span>
          </div>

          {/* VS Clash Badge */}
          <div className="flex flex-col items-center px-2">
            <div className="w-10 h-10 rounded-full bg-[#E63946] border-2 border-[#1E1B18] flex items-center justify-center text-[#FFFFFF] shadow-[0_2px_0_#1E1B18] font-black text-xs">
              <Swords className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-black text-[#57514A] mt-1 uppercase">VS</span>
          </div>

          {/* Chef 2 */}
          <div className="flex-1 flex flex-col items-center">
            <div className="w-14 h-14 rounded-full bg-[#2563EB] border-3 border-[#1E1B18] flex items-center justify-center text-2xl text-white shadow-[0_3px_0_#1E1B18] mb-2">
              👩‍🍳
            </div>
            <h3 className="text-sm font-extrabold font-display text-[#1E1B18] truncate max-w-[120px]">
              {p2.nickname}
            </h3>
            <span className="inline-flex items-center gap-1 text-xs font-bold text-[#1D7A4C] mt-1">
              <Coins className="w-3.5 h-3.5 text-[#FFB703]" />
              <span className="tabular-nums">${p2.budget}</span>
            </span>
          </div>
        </div>
      </Card>

      {/* Rules Snapshot */}
      <div className="w-full p-3.5 rounded-2xl border-2 border-[#1E1B18] bg-[#F4EFE2] text-xs font-bold text-[#57514A] mb-6">
        <p>🎯 Secret whole-dollar bids • Highest bid takes the ingredient • Loser keeps cash for later!</p>
      </div>

      {/* Start Cooking CTA */}
      <div className="w-full mt-auto">
        <Button
          type="button"
          data-testid="start-cooking-btn"
          variant="primary"
          size="lg"
          fullWidth
          onClick={onStartCooking}
          icon={<Utensils className="w-5 h-5" />}
        >
          Let's Cook! (Round 1: Bun)
        </Button>
      </div>
    </div>
  );
};
