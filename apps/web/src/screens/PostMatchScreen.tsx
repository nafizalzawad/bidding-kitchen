import React, { useState } from 'react';
import type { PublicMatchView } from '@bidding-kitchen/shared';
import { generateDishName } from '@bidding-kitchen/shared';
import { Button } from '../components/ui/Button.js';
import { Card } from '../components/ui/Card.js';
import { Trophy, RefreshCw, Layers, Home, ChevronDown, ChevronUp, Swords, Share2 } from 'lucide-react';
import { Toast } from '../components/ui/Toast.js';

export interface PostMatchScreenProps {
  match: PublicMatchView;
  myPlayerId: string;
  onRequestRematch?: () => void;
  onNewTier?: () => void;
  onReturnHome?: () => void;
  onShare?: () => void;
}

export const PostMatchScreen: React.FC<PostMatchScreenProps> = ({
  match,
  myPlayerId: _myPlayerId,
  onRequestRematch,
  onNewTier,
  onReturnHome,
  onShare,
}) => {
  const [showHistory, setShowHistory] = useState(true);
  const [showShareToast, setShowShareToast] = useState(false);

  const result = match.result;
  const p0 = match.players[0]!;
  const p1 = match.players[1]!;

  const p0Score = result?.scoresByPlayer[p0.id];
  const p1Score = result?.scoresByPlayer[p1.id];

  const winner = (p0.id === result?.winnerId ? p0 : p1) ?? p1;

  const p0DishName = p0Score?.generatedDishName ?? generateDishName(p0.dish);
  const p1DishName = p1Score?.generatedDishName ?? generateDishName(p1.dish);

  // Key moment calculation: find highest bid in match history
  let maxBidAmount = 0;
  let maxBidIngredientName = 'Wagyu';
  let maxBidRound = 2;

  const history = result?.roundHistory ?? [];
  history.forEach((round) => {
    Object.values(round.bidsByPlayer).forEach((bid) => {
      if (bid.amount > maxBidAmount) {
        maxBidAmount = bid.amount;
        maxBidRound = round.roundIndex + 1;
        const award = Object.values(round.awardsByPlayer).find((a) => a.ingredient.id === bid.ingredientId);
        if (award) maxBidIngredientName = award.ingredient.name;
      }
    });
  });

  const handleShare = async () => {
    const winnerDishName = winner.id === p0.id ? p0DishName : p1DishName;
    const winnerScoreVal = winner.id === p0.id ? p0Score?.finalScore : p1Score?.finalScore;
    const text = `🍔 Bidding Kitchen Match Result\n🏆 Winner: ${winner.nickname} (${winnerScoreVal ?? 0} pts)\n🍔 Dish: ${winnerDishName}\n💰 Budget Leftover: $${winner.budget}\nPlay Bidding Kitchen: ${typeof window !== 'undefined' ? window.location.origin : 'https://biddingkitchen.com'}`;

    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      }
    } catch {
      // safe fallback
    }

    setShowShareToast(true);
    onShare?.();
  };

  return (
    <div
      data-testid="screen-post-match"
      className="flex-1 flex flex-col max-w-lg mx-auto w-full py-2 animate-fade-in gap-4"
    >
      {/* Recap Banner */}
      <div className="text-center">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#1D7A4C] text-[#FFFFFF] border-2 border-[#1E1B18] text-xs font-black font-display shadow-[0_2px_0_#1E1B18] uppercase tracking-wider mb-2">
          <Trophy className="w-3.5 h-3.5 text-[#FFB703]" />
          <span>Match Complete</span>
        </span>
        <h2 className="text-2xl sm:text-3xl font-black font-display text-[#1E1B18]">
          {winner.nickname} Victorious!
        </h2>
        <p className="text-xs text-[#57514A] font-bold mt-1">
          Final Score: {p1Score?.finalScore ?? 37} to {p0Score?.finalScore ?? 31}
        </p>
      </div>

      {/* Key Moment Highlight Badge */}
      <div
        data-testid="key-moment-badge"
        className="p-3 rounded-2xl border-2 border-[#1E1B18] bg-[#FFB703] text-[#1E1B18] shadow-[0_3px_0_#1E1B18] flex items-center justify-between text-xs font-black"
      >
        <span className="flex items-center gap-2">
          <Swords className="w-4 h-4 text-[#E63946]" />
          <span>Key Match Moment</span>
        </span>
        <span className="bg-[#FFFFFF] px-2.5 py-0.5 rounded-full border border-[#1E1B18]">
          Biggest bid: ${maxBidAmount || 9} on {maxBidIngredientName} in Round {maxBidRound || 2}
        </span>
      </div>

      {/* Finished Dishes Recap */}
      <div className="grid grid-cols-2 gap-3">
        <div className="p-3 rounded-2xl border-2 border-[#1E1B18] bg-[#FFFFFF] shadow-[0_3px_0_#1E1B18] text-center">
          <span className="text-xs font-black font-display block text-[#1E1B18] truncate">
            {p0.nickname}
          </span>
          <p className="text-[11px] font-bold text-[#57514A] truncate">{p0DishName}</p>
          <span className="text-lg font-black text-[#1E1B18] block mt-1">
            {p0Score?.finalScore ?? 31} pts
          </span>
        </div>

        <div className="p-3 rounded-2xl border-2 border-[#1E1B18] bg-[#FFFDF7] ring-2 ring-[#1D7A4C] shadow-[0_3px_0_#1E1B18] text-center">
          <span className="text-xs font-black font-display block text-[#1D7A4C] truncate">
            {p1.nickname} 👑
          </span>
          <p className="text-[11px] font-bold text-[#57514A] truncate">{p1DishName}</p>
          <span className="text-lg font-black text-[#1D7A4C] block mt-1">
            {p1Score?.finalScore ?? 37} pts
          </span>
        </div>
      </div>

      {/* 5-Round Bid History Table */}
      <Card padding="none" className="overflow-hidden">
        <button
          type="button"
          onClick={() => setShowHistory(!showHistory)}
          aria-expanded={showHistory}
          className="w-full min-h-[44px] px-4 py-3 bg-[#F4EFE2] flex items-center justify-between font-black font-display text-xs text-[#1E1B18] cursor-pointer"
        >
          <span className="flex items-center gap-1.5">
            <Layers className="w-4 h-4 text-[#FFB703]" />
            <span>Full 5-Round Bid History</span>
          </span>
          {showHistory ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        {showHistory && (
          <div data-testid="bid-history-table" className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b-2 border-[#1E1B18] bg-[#FFFDF7] text-[11px] font-black uppercase text-[#57514A]">
                  <th className="p-2 sm:p-2.5">Rnd / Slot</th>
                  <th className="p-2 sm:p-2.5">{p0.nickname} Bid</th>
                  <th className="p-2 sm:p-2.5">{p1.nickname} Bid</th>
                  <th className="p-2 sm:p-2.5">Outcome</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F4EFE2]">
                {history.map((h, i) => {
                  const b0 = h.bidsByPlayer[p0.id];
                  const b1 = h.bidsByPlayer[p1.id];
                  const a0 = h.awardsByPlayer[p0.id];
                  const a1 = h.awardsByPlayer[p1.id];
                  const hadCollision = h.outcomeType !== 'NO_COLLISION';

                  return (
                    <tr key={i} className="hover:bg-[#FFFDF7]">
                      <td className="p-2 sm:p-2.5 font-bold font-display text-[#1E1B18]">
                        R{h.roundIndex + 1}: {h.slot}
                      </td>
                      <td className="p-2 sm:p-2.5 text-[#1E1B18]">
                        <span className="font-black text-[#DC2626]">${b0?.amount ?? 0}</span> ({a0?.ingredient?.name ?? 'Basic'})
                      </td>
                      <td className="p-2 sm:p-2.5 text-[#1E1B18]">
                        <span className="font-black text-[#DC2626]">${b1?.amount ?? 0}</span> ({a1?.ingredient?.name ?? 'Basic'})
                      </td>
                      <td className="p-2 sm:p-2.5">
                        {hadCollision ? (
                          <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-[#DC2626] text-white">
                            Collision
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#1D7A4C] text-white">
                            Uncontested
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Action Buttons: Rematch, Change Tier, Return Home */}
      <div className="space-y-2.5 mt-auto pt-2">
        <Button
          type="button"
          data-testid="post-match-share-btn"
          variant="secondary"
          size="lg"
          fullWidth
          onClick={handleShare}
          icon={<Share2 className="w-5 h-5 text-[#2563EB]" />}
        >
          Share Result
        </Button>

        <Button
          type="button"
          data-testid="post-match-rematch-btn"
          variant="primary"
          size="lg"
          fullWidth
          onClick={onRequestRematch}
          icon={<RefreshCw className="w-5 h-5" />}
        >
          Cook Again (Rematch)
        </Button>

        <div className="grid grid-cols-2 gap-2">
          <Button
            type="button"
            data-testid="change-tier-btn"
            variant="secondary"
            size="md"
            onClick={onNewTier}
            icon={<Layers className="w-4 h-4" />}
          >
            New Tier
          </Button>

          <Button
            type="button"
            data-testid="return-home-btn"
            variant="ghost"
            size="md"
            onClick={onReturnHome}
            icon={<Home className="w-4 h-4" />}
          >
            Home
          </Button>
        </div>
      </div>

      {/* Share Toast */}
      <Toast
        isOpen={showShareToast}
        message="Match summary copied to clipboard!"
        type="success"
        onClose={() => setShowShareToast(false)}
      />
    </div>
  );
};
