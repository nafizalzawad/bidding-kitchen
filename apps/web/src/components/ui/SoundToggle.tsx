import React, { useState } from 'react';
import { Volume2, VolumeX } from 'lucide-react';

export interface SoundToggleProps {
  muted?: boolean;
  onToggle?: (isMuted: boolean) => void;
  className?: string;
}

export const SoundToggle: React.FC<SoundToggleProps> = ({
  muted: controlledMuted,
  onToggle,
  className = '',
}) => {
  const [internalMuted, setInternalMuted] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    try {
      const saved = localStorage.getItem('bk_sound_muted');
      return saved === 'true';
    } catch {
      return false;
    }
  });

  const isMuted = controlledMuted !== undefined ? controlledMuted : internalMuted;

  const handleToggle = () => {
    const nextMuted = !isMuted;
    if (controlledMuted === undefined) {
      setInternalMuted(nextMuted);
      try {
        localStorage.setItem('bk_sound_muted', String(nextMuted));
      } catch {
        // Ignore localStorage errors
      }
    }
    onToggle?.(nextMuted);
  };

  return (
    <button
      onClick={handleToggle}
      aria-label={isMuted ? 'Unmute game sounds' : 'Mute game sounds'}
      title={isMuted ? 'Unmute game sounds' : 'Mute game sounds'}
      data-testid="sound-toggle-btn"
      className={`min-h-[44px] min-w-[44px] p-2.5 rounded-xl border-2 border-[#1E1B18] bg-[#FFFFFF] hover:bg-[#F4EFE2] text-[#1E1B18] shadow-[0_3px_0_#1E1B18] active:translate-y-[1px] active:shadow-[0_1px_0_#1E1B18] transition flex items-center justify-center cursor-pointer ${className}`}
    >
      {isMuted ? (
        <VolumeX className="w-5 h-5 text-[#DC2626]" />
      ) : (
        <Volume2 className="w-5 h-5 text-[#1D7A4C]" />
      )}
    </button>
  );
};
