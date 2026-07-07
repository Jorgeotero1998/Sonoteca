import { create } from "zustand";
import { sonotecaApi } from "../services/api/sonotecaApi";

export type PlaylistSummary = {
  id: string;
  name: string;
  description?: string;
  is_public?: boolean;
  share_slug?: string;
  cover_url?: string | null;
  items_count?: number;
};

type PlaylistsState = {
  list: PlaylistSummary[];
  loaded: boolean;
  loading: boolean;
  refresh: () => Promise<void>;
  reset: () => void;
};

export const usePlaylistsStore = create<PlaylistsState>((set) => ({
  list: [],
  loaded: false,
  loading: false,
  refresh: async () => {
    set({ loading: true });
    try {
      const rows = await sonotecaApi.playlists.list();
      set({ list: rows || [], loaded: true });
    } catch {
      set({ loaded: true });
    } finally {
      set({ loading: false });
    }
  },
  reset: () => set({ list: [], loaded: false }),
}));
