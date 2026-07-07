import { create } from "zustand";

export type ToastKind = "success" | "error" | "info";
export type Toast = { id: number; kind: ToastKind; message: string };

type UIState = {
  toasts: Toast[];
  sidebarOpen: boolean;
  nowPlayingOpen: boolean;
  toast: (message: string, kind?: ToastKind) => void;
  dismiss: (id: number) => void;
  setSidebar: (open: boolean) => void;
  toggleSidebar: () => void;
  setNowPlaying: (open: boolean) => void;
};

let counter = 0;

export const useUIStore = create<UIState>((set, get) => ({
  toasts: [],
  sidebarOpen: false,
  nowPlayingOpen: false,
  toast: (message, kind = "info") => {
    const id = ++counter;
    set({ toasts: [...get().toasts, { id, kind, message }] });
    setTimeout(() => get().dismiss(id), 3500);
  },
  dismiss: (id) => set({ toasts: get().toasts.filter((t) => t.id !== id) }),
  setSidebar: (open) => set({ sidebarOpen: open }),
  toggleSidebar: () => set({ sidebarOpen: !get().sidebarOpen }),
  setNowPlaying: (open) => set({ nowPlayingOpen: open }),
}));

/** Convenience helper usable outside React components. */
export const toast = (message: string, kind?: ToastKind) => useUIStore.getState().toast(message, kind);
