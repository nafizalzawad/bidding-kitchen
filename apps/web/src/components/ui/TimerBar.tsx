import React from 'react';
import { Timer } from 'lucide-react';

export interface TimerBarProps {
  timeRemainingMs: number;
  totalDurationMs?: number;
  className?: string;
}

export const TimerBar: React.FC<TimerBarProps> = ({
  timeRemainingMs,
  totalDurationMs = 30000,
  className = '',
}) => {
  const clampedTimeMs = Math.max(0, Math.min(totalDurationMs, timeRemainingMs));
  const secondsLeft = Math.ceil(clampedTimeMs / 1000);
  const progressRatio = totalDurationMs > 0 ? clampedTimeMs / totalDurationMs : 0;
  const progressPercent = Math.max(0, Math.min(100, progressRatio * 100));

  // Urgency thresholds
  let barColor = 'bg-[#1D7A4C]'; // Green > 10s
  let isPulsing = false;

  if (secondsLeft <= 5) {
    barColor = 'bg-[#DC2626]'; // Red <= 5s
    isPulsing = true;
  } else if (secondsLeft <= 10) {
    barColor = 'bg-[#FFB703]'; // Yellow 6-10s
  }

  return (
    <div className={`w-full ${className}`}>
      <div className="flex items-center justify-between text-xs font-extrabold font-display text-[#1E1B18] mb-1">
        <span className="flex items-center gap-1.5">
          <Timer className="w-3.5 h-3.5 text-[#FFB703]" />
          <span>Timer</span>
        </span>
        <span
          data-testid="timer-countdown"
          className="tabular-nums tracking-wide text-[#1E1B18]"
        >
          {secondsLeft}s remaining
        </span>
      </div>

      <div
        data-testid="timer-bar"
        role="progressbar"
        aria-label={`Timer: ${secondsLeft} seconds remaining`}
        aria-valuemin={0}
        aria-valuemax={Math.ceil(totalDurationMs / 1000)}
        aria-valuenow={secondsLeft}
        className={`w-full h-3 rounded-full border-2 border-[#1E1B18] bg-[#F4EFE2] overflow-hidden shadow-[0_2px_0_#1E1B18] ${
          isPulsing ? 'animate-pulse' : ''
        }`}
      >
        {/* Fill Bar */}
        <div
          className={`h-full transition-all duration-200 ease-linear ${barColor}`}
          style={{ width: `${progressPercent}%` }}
        />
      </div>
    </div>
  );
};
