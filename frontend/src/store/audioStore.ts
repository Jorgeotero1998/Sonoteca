import { create } from "zustand";

type AudioState = {
  /** Overall audio energy 0–1 from AnalyserNode */
  energy: number;
  /** Per-bar frequency levels (0–1), length ~16 */
  bars: number[];
  setAnalysis: (energy: number, bars: number[]) => void;
  reset: () => void;
};

const EMPTY = Array.from({ length: 16 }, () => 0);

export const useAudioStore = create<AudioState>((set) => ({
  energy: 0,
  bars: EMPTY,
  setAnalysis: (energy, bars) => set({ energy, bars }),
  reset: () => set({ energy: 0, bars: EMPTY }),
}));
