import React, { useState, useEffect } from 'react';
import { Button } from '../components/ui/Button.js';
import { Card } from '../components/ui/Card.js';
import { Utensils, Users, Zap, Sparkles } from 'lucide-react';

export interface LandingScreenProps {
  initialNickname?: string;
  initialRoomCode?: string;
  isSubmitting?: boolean;
  onCreateRoom?: (nickname: string) => void;
  onJoinRoom?: (code: string, nickname: string) => void;
}

export const LandingScreen: React.FC<LandingScreenProps> = ({
  initialNickname = 'ChefNafiz',
  initialRoomCode = '',
  isSubmitting = false,
  onCreateRoom,
  onJoinRoom,
}) => {
  const [nickname, setNickname] = useState(initialNickname);
  const [joinCode, setJoinCode] = useState(initialRoomCode.toUpperCase());
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
    if (isSubmitting) return;
    if (validateNickname(nickname)) {
      onCreateRoom?.(nickname.trim());
    }
  };

  const handleJoin = () => {
    if (isSubmitting) return;
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
      <div className="text-center mb-6">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-[#FFB703] border-3 border-[#1E1B18] shadow-[0_6px_0_#1E1B18] mb-3 text-4xl select-none">
          🍔
        </div>
        <h2 className="text-3xl sm:text-4xl font-black font-display text-[#1E1B18] tracking-tight">
          Bidding Kitchen
        </h2>
        <p className="text-xs sm:text-sm text-[#57514A] font-medium mt-1 max-w-xs sm:max-w-sm mx-auto">
          Out-bid, out-flavor, and build the champion burger in a 5-round auction battle!
        </p>
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

      {/* Main Action Card */}
      <Card padding="md" className="w-full mb-6">
        {/* Nickname Input */}
        <div className="mb-5">
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
            disabled={isSubmitting}
            className="w-full min-h-[48px] px-4 rounded-xl border-2 border-[#1E1B18] bg-[#F4EFE2] text-[#1E1B18] font-bold text-sm focus:outline-none focus:ring-2 focus:ring-[#FFB703] shadow-[0_2px_0_#1E1B18] disabled:opacity-60"
          />
          {nicknameError && (
            <p className="text-xs text-[#DC2626] font-bold mt-1.5">{nicknameError}</p>
          )}
        </div>

        {/* Create Room Button (Disabled or Secondary when in Deep Link mode) */}
        <div className="mb-5">
          <Button
            type="button"
            data-testid="create-room-btn"
            variant={isDeepLink ? 'secondary' : 'primary'}
            size="lg"
            fullWidth
            disabled={isSubmitting}
            onClick={handleCreate}
            icon={<Utensils className="w-5 h-5" />}
          >
            {isSubmitting ? 'Creating Kitchen...' : 'Create New Kitchen'}
          </Button>
        </div>

        {/* Divider */}
        <div className="relative flex items-center justify-center my-4">
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
              disabled={isSubmitting}
              className="flex-1 min-h-[48px] px-4 rounded-xl border-2 border-[#1E1B18] bg-[#F4EFE2] text-[#1E1B18] font-black text-sm uppercase tracking-widest placeholder:normal-case placeholder:font-normal focus:outline-none focus:ring-2 focus:ring-[#FFB703] shadow-[0_2px_0_#1E1B18] disabled:opacity-60"
            />
            <Button
              type="button"
              data-testid="join-room-submit-btn"
              variant="gold"
              size="md"
              disabled={isSubmitting}
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

      {/* Quick Match Feature (v1.5 Roadmap Badge) */}
      <div
        data-testid="quick-match-card"
        className="w-full p-3.5 rounded-2xl border-2 border-[#1E1B18] bg-[#F4EFE2] flex items-center justify-between text-xs font-bold text-[#57514A]"
      >
        <span className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-[#FFB703]" />
          <span>Quick Matchmaking Queue</span>
        </span>
        <span className="px-2 py-0.5 rounded-full bg-[#1E1B18] text-[#FFFDF7] text-[10px] font-black uppercase">
          Coming in v1.5
        </span>
      </div>
    </div>
  );
};
