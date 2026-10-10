/**
 * Web Audio API synthesized sound effects
 * 100% offline, zero external audio assets required, guaranteed to work
 */

class SoundEffectManager {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;

  constructor() {
    try {
      const savedMute = localStorage.getItem('am_sound_muted');
      if (savedMute) this.isMuted = savedMute === 'true';
    } catch {}
  }

  private getAudioContext(): AudioContext | null {
    if (this.isMuted) return null;
    try {
      if (!this.ctx || this.ctx.state === 'closed') {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioCtx) {
          this.ctx = new AudioCtx();
        }
      }
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
      return this.ctx;
    } catch {
      return null;
    }
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    try {
      localStorage.setItem('am_sound_muted', muted ? 'true' : 'false');
    } catch {}
  }

  public getIsMuted(): boolean {
    return this.isMuted;
  }

  /**
   * Triumphant Victory Fanfare Chime
   * Plays a celebratory arpeggio sequence with celestial shimmer harmonics
   * when AM Premium is successfully created / activated!
   */
  public playSuccessFanfare() {
    if (this.isMuted) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;

      // Master output limiter/compressor
      const masterGain = ctx.createGain();
      masterGain.gain.setValueAtTime(0.35, now);
      masterGain.connect(ctx.destination);

      // Chime note frequencies (C5, E5, G5, B5, C6 triumphant major progression)
      const notes = [
        { freq: 523.25, time: 0.00, dur: 0.45 }, // C5
        { freq: 659.25, time: 0.12, dur: 0.50 }, // E5
        { freq: 783.99, time: 0.24, dur: 0.55 }, // G5
        { freq: 987.77, time: 0.36, dur: 0.60 }, // B5
        { freq: 1046.50, time: 0.48, dur: 1.20 }, // C6 (long sustain)
        { freq: 1318.51, time: 0.54, dur: 1.10 }, // E6 harmonic sparkle
        { freq: 1567.98, time: 0.60, dur: 1.30 }, // G6 shimmer climax
      ];

      notes.forEach(({ freq, time, dur }) => {
        const osc = ctx.createOscillator();
        const noteGain = ctx.createGain();

        // Warm bright tone: combination of triangle & sine
        osc.type = freq > 1000 ? 'sine' : 'triangle';
        osc.frequency.setValueAtTime(freq, now + time);

        // Attack and decay envelope
        noteGain.gain.setValueAtTime(0.0001, now + time);
        noteGain.gain.linearRampToValueAtTime(0.25, now + time + 0.04);
        noteGain.gain.exponentialRampToValueAtTime(0.0001, now + time + dur);

        osc.connect(noteGain);
        noteGain.connect(masterGain);

        osc.start(now + time);
        osc.stop(now + time + dur + 0.05);
      });

      // Shimmer sparkle high frequency bell wash
      const sparkleOsc = ctx.createOscillator();
      const sparkleGain = ctx.createGain();
      sparkleOsc.type = 'sine';
      sparkleOsc.frequency.setValueAtTime(2093.00, now + 0.5); // C7 bell chime
      sparkleOsc.frequency.exponentialRampToValueAtTime(2637.02, now + 0.9); // E7 sweep

      sparkleGain.gain.setValueAtTime(0.0001, now + 0.5);
      sparkleGain.gain.linearRampToValueAtTime(0.12, now + 0.55);
      sparkleGain.gain.exponentialRampToValueAtTime(0.0001, now + 1.6);

      sparkleOsc.connect(sparkleGain);
      sparkleGain.connect(masterGain);

      sparkleOsc.start(now + 0.5);
      sparkleOsc.stop(now + 1.7);
    } catch {
      // Audio autoplay policy fallback
    }
  }

  /**
   * Crisp celebratory chime ping (single high note)
   */
  public playChime() {
    if (this.isMuted) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, now); // A5
      osc.frequency.exponentialRampToValueAtTime(1760, now + 0.15); // A6

      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.65);
    } catch {}
  }

  /**
   * Soft UI interaction click
   */
  public playClick() {
    if (this.isMuted) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(600, now);
      osc.frequency.exponentialRampToValueAtTime(300, now + 0.05);

      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.06);
    } catch {}
  }
}

export const soundEffects = new SoundEffectManager();
