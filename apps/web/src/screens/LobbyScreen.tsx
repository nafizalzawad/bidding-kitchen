import React, { useState } from 'react';
import { TIERS, type PublicMatchView, type TierId } from '@bidding-kitchen/shared';
import { Button } from '../components/ui/Button.js';
import { Card } from '../components/ui/Card.js';
import { Toast } from '../components/ui/Toast.js';
import { Copy, Check, Users, Play, LogOut, Sparkles } from 'lucide-react';

export interface LobbyScreenProps {
  match: PublicMatchView;
  myPlayerId: string;
  isSubmitting?: boolean;
  onToggleReady?: () => void;
  onSelectTier?: (tier: TierId) => void;
  onLeaveLobby?: () => void;
  onCopyInviteLink?: () => void;
}

export const LobbyScreen: React.FC<LobbyScreenProps> = ({
  match,
  myPlayerId,
  isSubmitting = false,
  onToggleReady,
  onSelectTier,
  onLeaveLobby,
  onCopyInviteLink,
}) => {
  const [copied, setCopied] = useState(false);
  const [showToast, setShowToast] = useState(false);

  const p0 = match.players[0];
  const p1 = match.players[1];

  const me = (p0?.id === myPlayerId ? p0 : p1?.id === myPlayerId ? p1 : p0) ?? {
    id: myPlayerId,
    nickname: 'Chef',
    seat: 0 as const,
    ready: false,
    connected: true,
    disconnectedAt: null,
    budget: 20,
    dish: [],
    secretOrder: null,
    chefsTipGranted: false,
  };


  const bothSeated = !!p0 && !!p1;
  const isReady = me.ready;
  const tierDef = TIERS[match.tier] ?? TIERS.STREET;

  const handleCopy = async () => {
    const inviteUrl = `${window.location.origin}/?room=${match.roomCode}`;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(inviteUrl);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = inviteUrl;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
    } catch {
      // fallback copy
    }
    setCopied(true);
    setShowToast(true);
    onCopyInviteLink?.();
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div
      data-testid="screen-lobby"
      className="flex-1 flex flex-col max-w-lg mx-auto w-full py-4 animate-fade-in"
    >
      {/* Room Code Card */}
      <div className="flex items-center justify-between p-4 mb-5 rounded-2xl border-2 border-[#1E1B18] bg-[#FFFFFF] shadow-[0_4px_0_#1E1B18]">
        <div>
          <span className="text-[11px] font-black font-display text-[#57514A] uppercase tracking-wider block">
            Kitchen Room Code
          </span>
          <span
            data-testid="room-code-display"
            className="text-2xl font-black font-display tracking-widest text-[#1E1B18]"
          >
            <span data-testid="lobby-room-code">{match.roomCode}</span>
          </span>
        </div>

        <button
          type="button"
          data-testid="copy-link-btn"
          onClick={handleCopy}
          aria-label="Copy invite link to clipboard"
          className="min-h-[44px] min-w-[44px] px-3.5 py-2 rounded-xl border-2 border-[#1E1B18] bg-[#F4EFE2] hover:bg-[#FFB703] text-[#1E1B18] font-bold text-xs flex items-center gap-2 shadow-[0_2px_0_#1E1B18] active:translate-y-[1px] transition cursor-pointer"
        >
          {copied ? <Check className="w-4 h-4 text-[#1D7A4C]" /> : <Copy className="w-4 h-4" />}
          <span>{copied ? 'Copied!' : 'Copy Link'}</span>
        </button>
      </div>

      {/* Two Chef Seats */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        {/* Seat 1: Host (Seat 0) */}
        <div
          data-testid="player-slot-0"
          className="p-3.5 rounded-2xl border-2 border-[#1E1B18] bg-[#FFFFFF] shadow-[0_3px_0_#1E1B18] flex flex-col items-center text-center justify-between min-h-[140px]"
        >
          <div className="flex flex-col items-center gap-1.5">
            <div className="w-10 h-10 rounded-full bg-[#FFB703] border-2 border-[#1E1B18] flex items-center justify-center text-lg shadow-[0_2px_0_#1E1B18]">
              👨‍🍳
            </div>
            <span className="text-xs sm:text-sm font-extrabold font-display text-[#1E1B18] truncate max-w-[120px]">
              {p0?.nickname ?? 'Host Chef'}
            </span>
            <span className="px-2 py-0.5 rounded-full bg-[#1E1B18] text-[#FFFDF7] text-[10px] font-extrabold uppercase">
              Host
            </span>
          </div>

          <div className="mt-2">
            {p0?.ready ? (
              <span className="text-[11px] font-black text-[#1D7A4C] flex items-center gap-1">
                ✓ Ready to Cook
              </span>
            ) : (
              <span className="text-[11px] font-bold text-[#57514A]">Waiting...</span>
            )}
          </div>
        </div>

        {/* Seat 2: Guest (Seat 1) or Empty */}
        <div
          data-testid="player-slot-1"
          className={`p-3.5 rounded-2xl border-2 border-[#1E1B18] shadow-[0_3px_0_#1E1B18] flex flex-col items-center text-center justify-between min-h-[140px] ${
            p1 ? 'bg-[#FFFFFF]' : 'bg-[#F4EFE2] border-dashed border-[#57514A]'
          }`}
        >
          {p1 ? (
            <>
              <div className="flex flex-col items-center gap-1.5">
                <div className="w-10 h-10 rounded-full bg-[#2563EB] border-2 border-[#1E1B18] flex items-center justify-center text-lg text-white shadow-[0_2px_0_#1E1B18]">
                  👩‍🍳
                </div>
                <span className="text-xs sm:text-sm font-extrabold font-display text-[#1E1B18] truncate max-w-[120px]">
                  {p1.nickname}
                </span>
                <span className="px-2 py-0.5 rounded-full bg-[#F4EFE2] border border-[#1E1B18] text-[#1E1B18] text-[10px] font-extrabold uppercase">
                  Guest
                </span>
              </div>

              <div className="mt-2">
                {p1.ready ? (
                  <span className="text-[11px] font-black text-[#1D7A4C] flex items-center gap-1">
                    ✓ Ready to Cook
                  </span>
                ) : (
                  <span className="text-[11px] font-bold text-[#57514A]">Thinking...</span>
                )}
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center my-auto py-3">
              <Users className="w-8 h-8 text-[#57514A] mb-1 animate-pulse" />
              <p className="text-xs font-extrabold text-[#57514A]">Waiting for friend...</p>
              <p className="text-[10px] text-[#57514A] mt-0.5">Share code above</p>
            </div>
          )}
        </div>
      </div>

      {/* Tier Specification Card */}
      <Card padding="sm" className="mb-6">
        <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#F4EFE2]">
          <span className="text-xs font-black font-display text-[#1E1B18] flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-[#FFB703]" />
            <span>Tier: {tierDef.name} (${tierDef.startingBudget} Starting Budget)</span>
          </span>
          <span className="text-[11px] font-extrabold px-2 py-0.5 rounded-full bg-[#FFB703] border border-[#1E1B18]">
            {tierDef.roundsCount} Rounds
          </span>
        </div>
        <p className="text-xs text-[#57514A] font-medium leading-relaxed">
          Culinary Slots: {tierDef.slots.join(' → ')}.
        </p>

        {p0?.id === myPlayerId && !p0?.ready && (
          <div className="grid grid-cols-3 gap-2 mt-2 pt-2 border-t border-[#F4EFE2]" data-testid="lobby-tier-picker">
            {(['STREET', 'BISTRO', 'CHEFS_TABLE'] as TierId[]).map((t) => (
              <button
                key={t}
                type="button"
                data-testid={`lobby-select-tier-${t.toLowerCase()}`}
                onClick={() => onSelectTier?.(t)}
                className={`min-h-[44px] py-2 px-2 rounded-xl text-xs font-black uppercase border-2 border-[#1E1B18] shadow-[0_2px_0_#1E1B18] flex items-center justify-center transition cursor-pointer ${
                  match.tier === t ? 'bg-[#FFB703]' : 'bg-white hover:bg-[#F4EFE2]'
                }`}
              >
                {t === 'CHEFS_TABLE' ? 'Steak' : t === 'BISTRO' ? 'Pizza' : 'Burger'}
              </button>
            ))}
          </div>
        )}
      </Card>

      {/* Action Buttons: Ready Up / Start Match & Leave */}
      <div className="space-y-3 mt-auto">
        <Button
          type="button"
          data-testid="lobby-ready-btn"
          variant={isReady ? 'gold' : 'primary'}
          size="lg"
          fullWidth
          disabled={!bothSeated || isSubmitting}
          onClick={onToggleReady}
          icon={isReady ? <Check className="w-5 h-5" /> : <Play className="w-5 h-5" />}
        >
          {isSubmitting
            ? 'Updating...'
            : !bothSeated
            ? 'Waiting for Player 2...'
            : isReady
            ? 'Ready! (Click to Unready)'
            : 'Ready Up & Start Match'}
        </Button>

        <button
          type="button"
          data-testid="leave-lobby-btn"
          onClick={onLeaveLobby}
          aria-label="Leave lobby"
          className="w-full min-h-[44px] py-2 text-xs font-bold text-[#57514A] hover:text-[#DC2626] flex items-center justify-center gap-1.5 transition cursor-pointer"
        >
          <LogOut className="w-4 h-4" />
          <span>Leave Kitchen</span>
        </button>
      </div>

      {/* Copy Toast */}
      <Toast
        isOpen={showToast}
        type="success"
        message="Invite link copied to clipboard!"
        onClose={() => setShowToast(false)}
      />
    </div>
  );
};
