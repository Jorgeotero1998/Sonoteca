import { create } from "zustand";
import { sonotecaApi } from "../services/api/sonotecaApi";
import { toast } from "./uiStore";

type FavState = {
  refs: Set<string>;
  loaded: boolean;
  load: () => Promise<void>;
  has: (ref?: string | null) => boolean;
  toggle: (ref: string, label?: string) => Promise<void>;
  reset: () => void;
};

export const useFavoritesStore = create<FavState>((set, get) => ({
  refs: new Set(),
  loaded: false,
  load: async () => {
    try {
      const rows = await sonotecaApi.me.favorites();
      const refs = new Set<string>();
      for (const r of rows || []) {
        const ref = r?.ref || r?.item?.ref;
        if (ref) refs.add(ref);
      }
      set({ refs, loaded: true });
    } catch {
      set({ loaded: true });
    }
  },
  has: (ref) => (ref ? get().refs.has(ref) : false),
  toggle: async (ref, label) => {
    const has = get().refs.has(ref);
    const next = new Set(get().refs);
    if (has) next.delete(ref);
    else next.add(ref);
    set({ refs: next });
    try {
      if (has) await sonotecaApi.me.favoriteDel(ref);
      else await sonotecaApi.me.favoriteAdd(ref);
      toast(has ? `Removed${label ? ` “${label}”` : ""} from favorites` : `Saved${label ? ` “${label}”` : ""} to favorites`, "success");
    } catch (e) {
      // revert on failure
      const revert = new Set(get().refs);
      if (has) revert.add(ref);
      else revert.delete(ref);
      set({ refs: revert });
      toast(e instanceof Error ? e.message : "Could not update favorites", "error");
    }
  },
  reset: () => set({ refs: new Set(), loaded: false }),
}));
