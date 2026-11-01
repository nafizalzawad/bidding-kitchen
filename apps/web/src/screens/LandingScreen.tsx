import React, { useState, useEffect } from 'react';
import type { TierId } from '@bidding-kitchen/shared';
import { TIERS } from '@bidding-kitchen/shared';
import { Button } from '../components/ui/Button.js';
import { Card } from '../components/ui/Card.js';
import { Utensils, Users, Zap, Sparkles, Loader2, X } from 'lucide-react';

export interface LandingScreenProps {
  initialNickname?: string;
  initialRoomCode?: string;
  isSubmitting?: boolean;
  selectedTier?: TierId;
  isSearchingMatch?: boolean;
  onSelectTier?: (tier: TierId) => void;
  onCreateRoom?: (nickname: string, tier?: TierId) => void;
  onJoinRoom?: (code: string, nickname: string) => void;
  onQuickMatch?: (nickname: string, tier: TierId) => void;
  onCancelQuickMatch?: () => void;
}

export const LandingScreen: React.FC<LandingScreenProps> = ({
  initialNickname = 'ChefNafiz',
  initialRoomCode = '',
  isSubmitting = false,
  selectedTier: externalTier = 'STREET',
  isSearchingMatch = false,
  onSelectTier,
  onCreateRoom,
  onJoinRoom,
  onQuickMatch,
  onCancelQuickMatch,
}) => {
  const [nickname, setNickname] = useState(initialNickname);
  const [joinCode, setJoinCode] = useState(initialRoomCode.toUpperCase());
  const [tier, setTier] = useState<TierId>(externalTier);
  const [nicknameError, setNicknameError] = useState('');
  const [joinCodeError, setJoinCodeError] = useState('');

  useEffect(() => {
    if (initialRoomCode) {
      setJoinCode(initialRoomCode.toUpperCase());
    }
  }, [initialRoomCode]);

  useEffect(() => {
    if (initialNickname) {
      setNickname(initialNickname);
    }
  }, [initialNickname]);

  useEffect(() => {
    if (externalTier) {
      setTier(externalTier);
    }
  }, [externalTier]);

  const handleSelectTier = (newTier: TierId) => {
    setTier(newTier);
    onSelectTier?.(newTier);
  };

  const validateNickname = (name: string): boolean => {
    const trimmed = name.trim();
    if (trimmed.length < 2) {
      setNicknameError('Nickname must be at least 2 characters.');
      return false;
    }
    if (trimmed.length > 16) {
      setNicknameError('Nickname must be 16 characters or fewer.');
      return false;
    }
    setNicknameError('');
    return true;
  };

  const handleCreate = () => {
    if (isSubmitting || isSearchingMatch) return;
    if (validateNickname(nickname)) {
      if (tier === 'STREET') {
        onCreateRoom?.(nickname.trim());
      } else {
        onCreateRoom?.(nickname.trim(), tier);
      }
    }
  };

  const handleQuickMatch = () => {
    if (isSubmitting || isSearchingMatch) return;
    if (validateNickname(nickname)) {
      onQuickMatch?.(nickname.trim(), tier);
    }
  };

  const handleJoin = () => {
    if (isSubmitting || isSearchingMatch) return;
    const validNick = validateNickname(nickname);
    const trimmedCode = joinCode.trim().toUpperCase();
    if (!trimmedCode || trimmedCode.length < 4) {
      setJoinCodeError('Enter a valid 4 to 6-character room code.');
      return;
    }
    setJoinCodeError('');

    if (validNick) {
      onJoinRoom?.(trimmedCode, nickname.trim());
    }
  };

  const isDeepLink = Boolean(initialRoomCode);

  return (
    <div
      data-testid="screen-landing"
      className="flex-1 flex flex-col items-center justify-center max-w-lg mx-auto w-full py-4 animate-fade-in"
    >
      {/* Hero Cartoon Header */}
      <div className="text-center mb-5">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-[#FFB703] border-3 border-[#1E1B18] shadow-[0_6px_0_#1E1B18] mb-3 text-4xl select-none">
          {tier === 'BISTRO' ? '🍕' : tier === 'CHEFS_TABLE' ? '🥩' : '🍔'}
        </div>
        <h2 className="text-3xl sm:text-4xl font-black font-display text-[#1E1B18] tracking-tight">
          Bidding Kitchen
        </h2>
        <p className="text-xs sm:text-sm text-[#57514A] font-medium mt-1 max-w-xs sm:max-w-sm mx-auto">
          Out-bid, out-flavor, and craft the ultimate culinary dish in an intense auction showdown!
        </p>
      </div>

      {/* Tier Selector Tabs */}
      <div className="w-full mb-4 grid grid-cols-3 gap-2" data-testid="tier-selector-tabs">
        {(['STREET', 'BISTRO', 'CHEFS_TABLE'] as TierId[]).map((t) => {
          const tDef = TIERS[t];
          const isSelected = tier === t;
          return (
            <button
              key={t}
              type="button"
              data-testid={`tier-tab-${t.toLowerCase()}`}
              onClick={() => handleSelectTier(t)}
              className={`p-2.5 rounded-2xl border-2 border-[#1E1B18] flex flex-col items-center justify-center text-center transition-all cursor-pointer ${
                isSelected
                  ? 'bg-[#FFB703] shadow-[0_4px_0_#1E1B18] -translate-y-0.5'
                  : 'bg-[#FFFDF7] shadow-[0_2px_0_#1E1B18] hover:bg-[#F4EFE2]'
              }`}
            >
              <span className="text-lg mb-0.5">
                {t === 'BISTRO' ? '🍕' : t === 'CHEFS_TABLE' ? '🥩' : '🍔'}
              </span>
              <span className="text-xs font-black uppercase tracking-tight text-[#1E1B18]">
                {t === 'CHEFS_TABLE' ? "Chef's Table" : tDef.name}
              </span>
              <span className={`text-[10px] font-extrabold ${isSelected ? 'text-[#1E1B18]' : 'text-[#57514A]'}`}>
                ${tDef.startingBudget} • {tDef.roundsCount}R
              </span>
            </button>
          );
        })}
      </div>

      {/* Deep Link Invite Banner if joining via URL */}
      {isDeepLink && (
        <div
          data-testid="deep-link-banner"
          className="w-full mb-4 px-4 py-3 rounded-2xl bg-[#FFB703]/25 border-2 border-[#1E1B18] shadow-[0_3px_0_#1E1B18] flex items-center justify-center gap-2 text-center"
        >
          <Sparkles className="w-5 h-5 text-[#FFB703] shrink-0" />
          <span className="text-xs sm:text-sm font-black font-display text-[#1E1B18]">
            Joining Kitchen Room: <span className="tracking-widest text-[#E63946]">{joinCode}</span>
          </span>
        </div>
      )}

      {/* Searching Quick Match Queue State */}
      {isSearchingMatch && (
        <Card padding="md" className="w-full mb-4 bg-gradient-to-r from-[#FEF3C7] to-[#FDE68A] border-[#D97706] shadow-[0_4px_0_#B45309]">
          <div className="flex flex-col items-center justify-center text-center p-2">
            <div className="w-12 h-12 rounded-2xl bg-[#FFB703] border-2 border-[#1E1B18] flex items-center justify-center mb-3">
              <Loader2 className="w-6 h-6 text-[#1E1B18] animate-spin" />
            </div>
            <h3 className="text-base font-black text-[#1E1B18]">
              Finding Random Opponent...
            </h3>
            <p className="text-xs text-[#57514A] font-semibold mt-1 mb-4">
              Searching queue for {TIERS[tier].name} (${TIERS[tier].startingBudget} budget)
            </p>
            <Button
              type="button"
              data-testid="cancel-queue-btn"
              variant="secondary"
              size="sm"
              onClick={onCancelQuickMatch}
              icon={<X className="w-4 h-4" />}
            >
              Cancel Search
            </Button>
          </div>
        </Card>
      )}

      {/* Main Action Card */}
      <Card padding="md" className="w-full mb-4">
        {/* Nickname Input */}
        <div className="mb-4">
          <label
            htmlFor="nickname-input"
            className="block text-xs font-black font-display text-[#1E1B18] uppercase tracking-wider mb-1.5"
          >
            Your Chef Nickname
          </label>
          <input
            id="nickname-input"
            type="text"
            data-testid="nickname-input"
            value={nickname}
            onChange={(e) => {
              setNickname(e.target.value);
              if (nicknameError) validateNickname(e.target.value);
            }}
            placeholder="e.g. ChefNafiz"
            maxLength={16}
            disabled={isSubmitting || isSearchingMatch}
            className="w-full min-h-[48px] px-4 rounded-xl border-2 border-[#1E1B18] bg-[#F4EFE2] text-[#1E1B18] font-bold text-sm focus:outline-none focus:ring-2 focus:ring-[#FFB703] shadow-[0_2px_0_#1E1B18] disabled:opacity-60"
          />
          {nicknameError && (
            <p className="text-xs text-[#DC2626] font-bold mt-1.5">{nicknameError}</p>
          )}
        </div>

        {/* Quick Match Action Button */}
        <div className="mb-3">
          <Button
            type="button"
            data-testid="quick-match-btn"
            variant="gold"
            size="lg"
            fullWidth
            disabled={isSubmitting || isSearchingMatch}
            onClick={handleQuickMatch}
            icon={<Zap className="w-5 h-5" />}
          >
            {isSearchingMatch ? 'Searching...' : `Quick Match (${TIERS[tier].name})`}
          </Button>
        </div>

        {/* Create Room Button */}
        <div className="mb-4">
          <Button
            type="button"
            data-testid="create-room-btn"
            variant={isDeepLink ? 'secondary' : 'primary'}
            size="md"
            fullWidth
            disabled={isSubmitting || isSearchingMatch}
            onClick={handleCreate}
            icon={<Utensils className="w-4 h-4" />}
          >
            {isSubmitting ? 'Creating Room...' : `Create Room (${TIERS[tier].name})`}
          </Button>
        </div>

        {/* Divider */}
        <div className="relative flex items-center justify-center my-3">
          <div className="border-t-2 border-[#1E1B18] w-full" />
          <span className="bg-[#FFFFFF] px-3 text-xs font-black font-display text-[#57514A] uppercase tracking-wider absolute">
            {isDeepLink ? 'OR ENTER CODE' : 'OR JOIN FRIEND'}
          </span>
        </div>

        {/* Join by Code */}
        <div className="space-y-2 mt-4">
          <div className="flex gap-2">
            <input
              type="text"
              data-testid="join-room-code-input"
              value={joinCode}
              onChange={(e) => {
                setJoinCode(e.target.value.toUpperCase());
                if (joinCodeError) setJoinCodeError('');
              }}
              placeholder="ROOM CODE"
              maxLength={6}
              disabled={isSubmitting || isSearchingMatch}
              className="flex-1 min-h-[48px] px-4 rounded-xl border-2 border-[#1E1B18] bg-[#F4EFE2] text-[#1E1B18] font-black text-sm uppercase tracking-widest placeholder:normal-case placeholder:font-normal focus:outline-none focus:ring-2 focus:ring-[#FFB703] shadow-[0_2px_0_#1E1B18] disabled:opacity-60"
            />
            <Button
              type="button"
              data-testid="join-room-submit-btn"
              variant="secondary"
              size="md"
              disabled={isSubmitting || isSearchingMatch}
              onClick={handleJoin}
              icon={<Users className="w-4 h-4" />}
            >
              {isSubmitting ? 'Joining...' : isDeepLink ? `Join ${joinCode}` : 'Join'}
            </Button>
          </div>
          {joinCodeError && (
            <p className="text-xs text-[#DC2626] font-bold">{joinCodeError}</p>
          )}
        </div>
      </Card>
    </div>
  );
};
