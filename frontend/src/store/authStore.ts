import { create } from "zustand";
import { setToken } from "../services/api/client";

type AuthState = {
  token: string | null;
  setToken: (t: string | null) => void;
  logout: () => void;
};

export const useAuthStore = create<AuthState>((set) => ({
  token: localStorage.getItem("sonoteca_token"),
  setToken: (t) => {
    setToken(t);
    set({ token: t });
  },
  logout: () => {
    setToken(null);
    set({ token: null });
  },
}));
