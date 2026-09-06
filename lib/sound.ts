/**
 * RewardNova Audio Utilities
 * Synthesizes sparkling, crisp, pleasant chimes using the browser's Web Audio API
 * and plays audio files with graceful fallback.
 */
let lastPlayedTime = 0;

export function playRewardSound(customUrl?: string) {
  if (typeof window === "undefined") return;

  const now = Date.now();
  if (now - lastPlayedTime < 1000) {
    return; // Prevent duplicate rapid playback
  }
  lastPlayedTime = now;

  try {
    const soundUrl = customUrl || "/assets/sounds/notification.mp3";
    const audio = new Audio(soundUrl);
    audio.volume = 0.75;
    const playPromise = audio.play();
    if (playPromise !== undefined) {
      playPromise
        .then(() => {})
        .catch(() => {
          playSynthesizedChime();
        });
      return;
    }
  } catch {
    // Fallback below
  }

  playSynthesizedChime();
}

export function playNotificationSound() {
  playRewardSound();
}

function playSynthesizedChime() {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;

    if (!AudioContextClass) return;

    const ctx = new AudioContextClass();

    if (ctx.state === "suspended") {
      ctx.resume().catch(() => {});
    }

    const now = ctx.currentTime;

    // A pleasant 4-note ascending chime (C6, E6, G6, C7) with metallic harmonic sparkle
    const notes = [
      { freq: 1046.5, time: 0.0, duration: 0.28, gain: 0.18 }, // C6
      { freq: 1318.5, time: 0.08, duration: 0.28, gain: 0.2 }, // E6
      { freq: 1567.98, time: 0.16, duration: 0.35, gain: 0.22 }, // G6
      { freq: 2093.0, time: 0.24, duration: 0.55, gain: 0.25 }, // C7
    ];

    notes.forEach(({ freq, time, duration, gain }) => {
      // Primary chime oscillator (pure sine tone)
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, now + time);

      gainNode.gain.setValueAtTime(0.0001, now + time);
      gainNode.gain.linearRampToValueAtTime(gain, now + time + 0.012);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, now + time + duration);

      osc.connect(gainNode);
      gainNode.connect(ctx.destination);

      osc.start(now + time);
      osc.stop(now + time + duration);

      // Shimmer harmonic (subtle 2nd harmonic for metallic bell character)
      const shimmer = ctx.createOscillator();
      const shimmerGain = ctx.createGain();

      shimmer.type = "triangle";
      shimmer.frequency.setValueAtTime(freq * 2, now + time);

      shimmerGain.gain.setValueAtTime(0.0001, now + time);
      shimmerGain.gain.linearRampToValueAtTime(gain * 0.25, now + time + 0.008);
      shimmerGain.gain.exponentialRampToValueAtTime(
        0.0001,
        now + time + duration * 0.5
      );

      shimmer.connect(shimmerGain);
      shimmerGain.connect(ctx.destination);

      shimmer.start(now + time);
      shimmer.stop(now + time + duration * 0.5);
    });
  } catch (err) {
    console.warn("Could not play reward sound:", err);
  }
}
