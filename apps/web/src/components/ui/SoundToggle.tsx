import React from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import { useSound } from '../../hooks/useSound';

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
  const { isMuted: engineMuted, toggleMute, setMuted } = useSound();

  const isMuted = controlledMuted !== undefined ? controlledMuted : engineMuted;

  const handleToggle = () => {
    if (controlledMuted !== undefined) {
      const nextMuted = !controlledMuted;
      setMuted(nextMuted);
      onToggle?.(nextMuted);
    } else {
      const nextMuted = toggleMute();
      onToggle?.(nextMuted);
    }
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
