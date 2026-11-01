import React from 'react';
import { Timer } from 'lucide-react';

export interface TimerBarProps {
  timeRemainingMs: number;
  totalDurationMs?: number;
  className?: string;
}

export const TimerBar: React.FC<TimerBarProps> = ({
  timeRemainingMs,
  totalDurationMs = 15000,
  className = '',
}) => {
  const clampedTimeMs = Math.max(0, Math.min(totalDurationMs, timeRemainingMs));
  const secondsLeft = Math.ceil(clampedTimeMs / 1000);
  const progressRatio = totalDurationMs > 0 ? clampedTimeMs / totalDurationMs : 0;
  const progressPercent = Math.max(0, Math.min(100, progressRatio * 100));

  // Urgency thresholds
  let barColor = 'bg-[#1D7A4C]'; // Green > 5s
  let isPulsing = false;

  if (secondsLeft <= 3) {
    barColor = 'bg-[#E63946]'; // Red <= 3s
    isPulsing = true;
  } else if (secondsLeft <= 5) {
    barColor = 'bg-[#FFB703]'; // Yellow 3-5s
  }

  return (
    <div
      data-testid="timer-bar"
      aria-label={`Timer: ${secondsLeft} seconds remaining`}
      className={`relative w-full h-[28px] rounded-xl border-2 border-[#1E1B18] bg-[#F4EFE2] overflow-hidden shadow-[0_2px_0_#1E1B18] ${
        isPulsing ? 'animate-pulse' : ''
      } ${className}`}
    >
      {/* Fill Bar */}
      <div
        className={`h-full transition-all duration-200 ease-linear ${barColor}`}
        style={{ width: `${progressPercent}%` }}
      />

      {/* Centered Overlay Label */}
      <div className="absolute inset-0 flex items-center justify-between px-3 text-xs font-extrabold font-display pointer-events-none">
        <span className="flex items-center gap-1.5 text-[#1E1B18]">
          <Timer className="w-3.5 h-3.5" />
          <span>Timer</span>
        </span>
        <span
          data-testid="timer-countdown"
          className="tabular-nums tracking-wide text-[#1E1B18] drop-shadow-[0_1px_0_#FFFFFF]"
        >
          {secondsLeft}s remaining
        </span>
      </div>
    </div>
  );
};
