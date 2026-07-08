import { useEffect, useRef } from "react";
import { getAudioContext, resumeAudioContext } from "../lib/audioContext";
import { useAudioStore } from "../store/audioStore";

function prefersReducedMotion() {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Taps an <audio> element for visualizer data via Web Audio.
 * Playback stays on the media element; we only connect when CORS allows it
 * (crossOrigin="anonymous" + Deezer CDN ACAO) so previews are not silenced.
 */
export function useAudioAnalyser(audioRef: React.RefObject<HTMLAudioElement | null>, isPlaying: boolean) {
  const analyserRef = useRef<AnalyserNode | null>(null);
  const connectedRef = useRef(false);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const el = audioRef.current;
    if (!el || connectedRef.current) return;

    // Required before createMediaElementSource on cross-origin Deezer previews.
    el.crossOrigin = "anonymous";

    try {
      const ctx = getAudioContext();
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 64;
      analyser.smoothingTimeConstant = 0.82;
      const source = ctx.createMediaElementSource(el);
      // Tap analyser in parallel — do not route playback only through analyser.
      source.connect(ctx.destination);
      source.connect(analyser);
      analyserRef.current = analyser;
      connectedRef.current = true;
    } catch {
      // Element already wired or Web Audio unavailable — native playback still works.
    }
  }, [audioRef]);

  useEffect(() => {
    const onGesture = () => resumeAudioContext();
    document.addEventListener("pointerdown", onGesture, true);
    document.addEventListener("keydown", onGesture, true);
    return () => {
      document.removeEventListener("pointerdown", onGesture, true);
      document.removeEventListener("keydown", onGesture, true);
    };
  }, []);

  useEffect(() => {
    const setAnalysis = useAudioStore.getState().setAnalysis;
    const reset = useAudioStore.getState().reset;

    if (!isPlaying || prefersReducedMotion()) {
      cancelAnimationFrame(rafRef.current);
      reset();
      return;
    }

    const analyser = analyserRef.current;
    if (!analyser) return;

    resumeAudioContext();

    const buf = new Uint8Array(analyser.frequencyBinCount);

    const tick = () => {
      analyser.getByteFrequencyData(buf);
      const slice = buf.slice(0, 16);
      let sum = 0;
      const bars = Array.from(slice, (v) => {
        const n = v / 255;
        sum += n;
        return n;
      });
      setAnalysis(sum / slice.length, bars);
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [isPlaying]);
}
