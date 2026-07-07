import { useEffect, useRef } from "react";
import { useAudioStore } from "../store/audioStore";

function prefersReducedMotion() {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Connects an <audio> element to a Web Audio AnalyserNode and publishes
 * frequency data into audioStore for visualizers / mesh reactivity.
 */
export function useAudioAnalyser(audioRef: React.RefObject<HTMLAudioElement | null>, isPlaying: boolean) {
  const ctxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const connectedRef = useRef(false);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const el = audioRef.current;
    if (!el || connectedRef.current) return;

    try {
      const ctx = new AudioContext();
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 64;
      analyser.smoothingTimeConstant = 0.82;
      const source = ctx.createMediaElementSource(el);
      source.connect(analyser);
      analyser.connect(ctx.destination);
      ctxRef.current = ctx;
      analyserRef.current = analyser;
      connectedRef.current = true;
    } catch {
      /* already connected or unsupported */
    }
  }, [audioRef]);

  useEffect(() => {
    const setAnalysis = useAudioStore.getState().setAnalysis;
    const reset = useAudioStore.getState().reset;

    if (!isPlaying || prefersReducedMotion()) {
      cancelAnimationFrame(rafRef.current);
      reset();
      return;
    }

    const analyser = analyserRef.current;
    const ctx = ctxRef.current;
    if (!analyser || !ctx) return;

    if (ctx.state === "suspended") ctx.resume().catch(() => {});

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
