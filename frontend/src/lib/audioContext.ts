/** Shared Web Audio context for preview playback + visualizers. */
let ctx: AudioContext | null = null;

export function getAudioContext(): AudioContext {
  if (!ctx) ctx = new AudioContext();
  return ctx;
}

/** Call synchronously from a user gesture (click/key) before play(). */
export function resumeAudioContext(): void {
  const c = getAudioContext();
  if (c.state === "suspended") c.resume().catch(() => {});
}
