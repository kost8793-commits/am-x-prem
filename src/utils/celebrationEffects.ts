import confetti from 'canvas-confetti';
import { soundEffects } from './soundEffects';

/**
 * Triggers the full AM Premium Success Celebration:
 * 1. Triumphant synthesized fanfare audio chime
 * 2. Multi-stage colorful confetti blast
 */
export function triggerAmPremiumCelebration(options?: { sound?: boolean; confetti?: boolean }) {
  const shouldPlaySound = options?.sound ?? true;
  const shouldFireConfetti = options?.confetti ?? true;

  if (shouldPlaySound) {
    try {
      soundEffects.playSuccessFanfare();
    } catch {}
  }

  if (shouldFireConfetti) {
    try {
      // Stage 1: Big Center Cannon Explosion
      confetti({
        particleCount: 80,
        spread: 80,
        origin: { y: 0.55 },
        colors: ['#06b6d4', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#3b82f6'],
        disableForReducedMotion: true,
      });

      // Stage 2: Left & Right Cross-Cannons (at 220ms)
      setTimeout(() => {
        try {
          confetti({
            particleCount: 50,
            angle: 60,
            spread: 60,
            origin: { x: 0.05, y: 0.65 },
            colors: ['#10b981', '#3b82f6', '#fbbf24', '#06b6d4'],
            disableForReducedMotion: true,
          });
          confetti({
            particleCount: 50,
            angle: 120,
            spread: 60,
            origin: { x: 0.95, y: 0.65 },
            colors: ['#ec4899', '#8b5cf6', '#fbbf24', '#34d399'],
            disableForReducedMotion: true,
          });
        } catch {}
      }, 220);

      // Stage 3: High Golden Shower Cascade (at 450ms)
      setTimeout(() => {
        try {
          confetti({
            particleCount: 45,
            spread: 120,
            origin: { y: 0.4 },
            colors: ['#fbbf24', '#f59e0b', '#fef08a', '#10b981'],
            disableForReducedMotion: true,
          });
        } catch {}
      }, 450);
    } catch {}
  }
}
