export type SoundCueName =
  | 'cardSlide'
  | 'bidTick'
  | 'bidLockDing'
  | 'cardFlipWhoosh'
  | 'cashRegisterChime'
  | 'ingredientSlapSizzle'
  | 'fallbackBoop'
  | 'victoryFanfare';

/**
 * Procedural Web Audio API sound engine.
 * Generates all 8 signature cartoon-kitchen sound effects dynamically
 * using oscillators, noise buffers, and filters without external audio assets.
 */
export class SoundEngine {
  private audioCtx: AudioContext | null = null;
  private muted: boolean = false;
  private soundLog: SoundCueName[] = [];

  constructor() {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('bk_sound_muted');
        this.muted = saved === 'true';
      } catch {
        this.muted = false;
      }
    }
  }

  public isMuted(): boolean {
    return this.muted;
  }

  public setMuted(muted: boolean): void {
    this.muted = muted;
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('bk_sound_muted', String(muted));
      } catch {
        // ignore localStorage errors
      }
    }
  }

  public toggleMute(): boolean {
    const next = !this.muted;
    this.setMuted(next);
    return next;
  }

  public getSoundLog(): SoundCueName[] {
    return [...this.soundLog];
  }

  public clearSoundLog(): void {
    this.soundLog = [];
  }

  private getAudioContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (this.audioCtx) return this.audioCtx;

    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;

    if (!AudioContextClass) return null;

    try {
      this.audioCtx = new AudioContextClass();
      return this.audioCtx;
    } catch {
      return null;
    }
  }

  private createNoiseBuffer(ctx: AudioContext, durationSec: number): AudioBuffer {
    const bufferSize = Math.max(1, Math.floor(ctx.sampleRate * durationSec));
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    return buffer;
  }

  public playCue(cue: SoundCueName): void {
    this.soundLog.push(cue);

    if (this.muted) return;

    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      if (ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }

      const now = ctx.currentTime;

      switch (cue) {
        case 'cardSlide': {
          // 80ms bandpass noise sweep (400Hz -> 1200Hz)
          const buffer = this.createNoiseBuffer(ctx, 0.08);
          const source = ctx.createBufferSource();
          source.buffer = buffer;

          const filter = ctx.createBiquadFilter();
          filter.type = 'bandpass';
          filter.frequency.setValueAtTime(400, now);
          filter.frequency.exponentialRampToValueAtTime(1200, now + 0.08);

          const gain = ctx.createGain();
          gain.gain.setValueAtTime(0.01, now);
          gain.gain.linearRampToValueAtTime(0.18, now + 0.02);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

          source.connect(filter);
          filter.connect(gain);
          gain.connect(ctx.destination);

          source.start(now);
          source.stop(now + 0.08);
          break;
        }

        case 'bidTick': {
          // 35ms crisp woodblock sine pop (660Hz)
          const osc = ctx.createOscillator();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(660, now);
          osc.frequency.exponentialRampToValueAtTime(440, now + 0.035);

          const gain = ctx.createGain();
          gain.gain.setValueAtTime(0.2, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.035);

          osc.connect(gain);
          gain.connect(ctx.destination);

          osc.start(now);
          osc.stop(now + 0.035);
          break;
        }

        case 'bidLockDing': {
          // 220ms service bell dual-sine chime (880Hz + 1760Hz)
          const osc1 = ctx.createOscillator();
          const osc2 = ctx.createOscillator();
          osc1.type = 'sine';
          osc2.type = 'sine';
          osc1.frequency.setValueAtTime(880, now);
          osc2.frequency.setValueAtTime(1760, now);

          const gain = ctx.createGain();
          gain.gain.setValueAtTime(0.25, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

          osc1.connect(gain);
          osc2.connect(gain);
          gain.connect(ctx.destination);

          osc1.start(now);
          osc2.start(now);
          osc1.stop(now + 0.22);
          osc2.stop(now + 0.22);
          break;
        }

        case 'cardFlipWhoosh': {
          // 180ms bandpass noise sweep (300Hz -> 900Hz)
          const buffer = this.createNoiseBuffer(ctx, 0.18);
          const source = ctx.createBufferSource();
          source.buffer = buffer;

          const filter = ctx.createBiquadFilter();
          filter.type = 'bandpass';
          filter.frequency.setValueAtTime(300, now);
          filter.frequency.exponentialRampToValueAtTime(900, now + 0.18);

          const gain = ctx.createGain();
          gain.gain.setValueAtTime(0.01, now);
          gain.gain.linearRampToValueAtTime(0.2, now + 0.05);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

          source.connect(filter);
          filter.connect(gain);
          gain.connect(ctx.destination);

          source.start(now);
          source.stop(now + 0.18);
          break;
        }

        case 'cashRegisterChime': {
          // 300ms two-tone metallic chime (C6: 1046.5Hz -> C7: 2093Hz)
          const osc1 = ctx.createOscillator();
          osc1.type = 'sine';
          osc1.frequency.setValueAtTime(1046.5, now);
          osc1.frequency.setValueAtTime(2093, now + 0.1);

          const osc2 = ctx.createOscillator();
          osc2.type = 'triangle';
          osc2.frequency.setValueAtTime(1046.5 * 1.5, now);
          osc2.frequency.setValueAtTime(2093 * 1.5, now + 0.1);

          const gain = ctx.createGain();
          gain.gain.setValueAtTime(0.18, now);
          gain.gain.exponentialRampToValueAtTime(0.22, now + 0.1);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

          osc1.connect(gain);
          osc2.connect(gain);
          gain.connect(ctx.destination);

          osc1.start(now);
          osc2.start(now);
          osc1.stop(now + 0.3);
          osc2.stop(now + 0.3);
          break;
        }

        case 'ingredientSlapSizzle': {
          // 90ms low triangle thud (140Hz -> 55Hz)
          const thudOsc = ctx.createOscillator();
          thudOsc.type = 'triangle';
          thudOsc.frequency.setValueAtTime(140, now);
          thudOsc.frequency.exponentialRampToValueAtTime(55, now + 0.09);

          const thudGain = ctx.createGain();
          thudGain.gain.setValueAtTime(0.3, now);
          thudGain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);

          thudOsc.connect(thudGain);
          thudGain.connect(ctx.destination);

          thudOsc.start(now);
          thudOsc.stop(now + 0.09);

          // 260ms highpass noise sizzle
          const sizzleBuffer = this.createNoiseBuffer(ctx, 0.26);
          const sizzleSource = ctx.createBufferSource();
          sizzleSource.buffer = sizzleBuffer;

          const sizzleFilter = ctx.createBiquadFilter();
          sizzleFilter.type = 'highpass';
          sizzleFilter.frequency.setValueAtTime(2000, now + 0.03);

          const sizzleGain = ctx.createGain();
          sizzleGain.gain.setValueAtTime(0.01, now);
          sizzleGain.gain.linearRampToValueAtTime(0.15, now + 0.05);
          sizzleGain.gain.exponentialRampToValueAtTime(0.001, now + 0.26);

          sizzleSource.connect(sizzleFilter);
          sizzleFilter.connect(sizzleGain);
          sizzleGain.connect(ctx.destination);

          sizzleSource.start(now + 0.02);
          sizzleSource.stop(now + 0.26);
          break;
        }

        case 'fallbackBoop': {
          // 200ms descending whistle (440Hz -> 330Hz)
          const osc = ctx.createOscillator();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(440, now);
          osc.frequency.linearRampToValueAtTime(330, now + 0.2);

          const gain = ctx.createGain();
          gain.gain.setValueAtTime(0.18, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

          osc.connect(gain);
          gain.connect(ctx.destination);

          osc.start(now);
          osc.stop(now + 0.2);
          break;
        }

        case 'victoryFanfare': {
          // 500ms C-major arpeggio (C5: 523.25, E5: 659.25, G5: 783.99, C6: 1046.5)
          const notes = [
            { freq: 523.25, start: 0, dur: 0.1 },
            { freq: 659.25, start: 0.1, dur: 0.1 },
            { freq: 783.99, start: 0.2, dur: 0.1 },
            { freq: 1046.5, start: 0.3, dur: 0.2 },
          ];

          for (const note of notes) {
            const osc = ctx.createOscillator();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(note.freq, now + note.start);

            const gain = ctx.createGain();
            gain.gain.setValueAtTime(0.2, now + note.start);
            gain.gain.exponentialRampToValueAtTime(0.001, now + note.start + note.dur);

            osc.connect(gain);
            gain.connect(ctx.destination);

            osc.start(now + note.start);
            osc.stop(now + note.start + note.dur);
          }
          break;
        }
      }
    } catch {
      // Audio playback errors are non-fatal
    }
  }
}

export const soundEngine = new SoundEngine();
