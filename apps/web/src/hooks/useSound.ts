import { useState, useCallback, useEffect } from 'react';
import { soundEngine, SoundCueName } from '../audio/sound-engine';

export function useSound() {
  const [isMuted, setIsMuted] = useState<boolean>(() => soundEngine.isMuted());

  useEffect(() => {
    // Keep local state in sync if initialized or updated elsewhere
    setIsMuted(soundEngine.isMuted());
  }, []);

  const playCue = useCallback((cue: SoundCueName) => {
    soundEngine.playCue(cue);
  }, []);

  const toggleMute = useCallback(() => {
    const next = soundEngine.toggleMute();
    setIsMuted(next);
    return next;
  }, []);

  const setMuted = useCallback((muted: boolean) => {
    soundEngine.setMuted(muted);
    setIsMuted(muted);
  }, []);

  return {
    isMuted,
    playCue,
    toggleMute,
    setMuted,
    soundLog: soundEngine.getSoundLog.bind(soundEngine),
    clearSoundLog: soundEngine.clearSoundLog.bind(soundEngine),
  };
}
