import { create } from "zustand";
import { setToken } from "../services/api/client";

type AuthState = {
  token: string | null;
  setToken: (t: string | null) => void;
};

export const useAuthStore = create<AuthState>((set) => ({
  token: localStorage.getItem("sonoteca_token"),
  setToken: (t) => {
    setToken(t);
    set({ token: t });
  },
}));

