import React from 'react';
import { WifiOff, RefreshCw } from 'lucide-react';

export interface ConnectionBannerProps {
  isDisconnected?: boolean;
  opponentDisconnected?: boolean;
  countdownSeconds?: number;
  onReconnect?: () => void;
  className?: string;
}

export const ConnectionBanner: React.FC<ConnectionBannerProps> = ({
  isDisconnected = false,
  opponentDisconnected = false,
  countdownSeconds = 30,
  onReconnect,
  className = '',
}) => {
  if (!isDisconnected && !opponentDisconnected) return null;

  return (
    <div
      role="alert"
      data-testid="connection-banner"
      className={`w-full p-3 rounded-2xl border-2 border-[#1E1B18] shadow-[0_4px_0_#1E1B18] bg-[#DC2626] text-[#FFFFFF] flex items-center justify-between gap-3 animate-pulse ${className}`}
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <WifiOff className="w-5 h-5 shrink-0" />
        <span className="text-xs sm:text-sm font-extrabold truncate">
          {isDisconnected
            ? `Connection lost! Attempting to reconnect (${countdownSeconds}s)...`
            : `Opponent disconnected! Waiting for reconnect (${countdownSeconds}s remaining)...`}
        </span>
      </div>

      {isDisconnected && onReconnect && (
        <button
          onClick={onReconnect}
          aria-label="Retry connection"
          className="min-h-[44px] min-w-[44px] px-3 py-1.5 rounded-xl bg-[#FFFFFF] text-[#1E1B18] border-2 border-[#1E1B18] font-bold text-xs flex items-center gap-1 shadow-[0_2px_0_#1E1B18] shrink-0 active:translate-y-[1px] cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Retry</span>
        </button>
      )}
    </div>
  );
};
