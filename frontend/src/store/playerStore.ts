import { create } from "zustand";
import { persist } from "zustand/middleware";
import { resumeAudioContext } from "../lib/audioContext";

export type RepeatMode = "off" | "one" | "all";

export type Track = {
  ref: string; // deezer:{id}
  title: string;
  artist: string;
  album?: string;
  cover_url?: string | null;
  duration_ms?: number | null;
  preview_url?: string | null;
  external_urls?: { deezer?: string };
};

type PlayerState = {
  queue: Track[];
  idx: number;
  isPlaying: boolean;
  vol: number;
  shuffle: boolean;
  repeat: RepeatMode;
  compact: boolean;
  setQueue: (q: Track[], idx?: number) => void;
  playAt: (idx: number) => void;
  togglePlay: () => void;
  next: () => void;
  prev: () => void;
  setVol: (v: number) => void;
  toggleShuffle: () => void;
  cycleRepeat: () => void;
  toggleCompact: () => void;
  clear: () => void;
};

export const usePlayerStore = create<PlayerState>()(
  persist(
    (set, get) => ({
      queue: [],
      idx: 0,
      isPlaying: false,
      vol: 0.85,
      shuffle: false,
      repeat: "off",
      compact: false,
      setQueue: (q, startIdx = 0) => {
        resumeAudioContext();
        set({ queue: q, idx: Math.max(0, startIdx), isPlaying: true });
      },
      playAt: (i) => {
        resumeAudioContext();
        set({ idx: i, isPlaying: true });
      },
      togglePlay: () => {
        resumeAudioContext();
        set({ isPlaying: !get().isPlaying });
      },
      next: () => {
        const s = get();
        const n = s.queue.length;
        if (!n) return;
        if (s.repeat === "one") {
          set({ isPlaying: true });
          return;
        }
        if (s.shuffle && n > 1) {
          const nextIdx = Math.floor(Math.random() * n);
          set({ idx: nextIdx, isPlaying: true });
          return;
        }
        const isLast = s.idx >= n - 1;
        if (isLast && s.repeat === "off") {
          set({ isPlaying: false });
          return;
        }
        set({ idx: (s.idx + 1) % n, isPlaying: true });
      },
      prev: () => {
        const s = get();
        const n = s.queue.length;
        if (!n) return;
        set({ idx: (s.idx - 1 + n) % n, isPlaying: true });
      },
      setVol: (v) => set({ vol: Math.max(0, Math.min(1, v)) }),
      toggleShuffle: () => set({ shuffle: !get().shuffle }),
      cycleRepeat: () => {
        const r = get().repeat;
        set({ repeat: r === "off" ? "all" : r === "all" ? "one" : "off" });
      },
      toggleCompact: () => set({ compact: !get().compact }),
      clear: () => set({ queue: [], idx: 0, isPlaying: false }),
    }),
    {
      name: "sonoteca_player_state_v1",
      partialize: (s) => ({
        queue: s.queue,
        idx: s.idx,
        vol: s.vol,
        shuffle: s.shuffle,
        repeat: s.repeat,
        compact: s.compact,
      }),
    }
  )
);

