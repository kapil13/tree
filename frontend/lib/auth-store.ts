"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { User, Tokens } from "@/lib/api";

type State = {
  user: User | null;
  access: string | null;
  refresh: string | null;
  setSession: (tokens: Tokens) => void;
  setUser: (u: User | null) => void;
  logout: () => void;
};

export const useAuth = create<State>()(
  persist(
    (set) => ({
      user: null,
      access: null,
      refresh: null,
      setSession: (tokens) => {
        if (typeof window !== "undefined") {
          localStorage.setItem("byot_access_token", tokens.access_token);
        }
        set({ access: tokens.access_token, refresh: tokens.refresh_token });
      },
      setUser: (u) => set({ user: u }),
      logout: () => {
        if (typeof window !== "undefined") {
          localStorage.removeItem("byot_access_token");
        }
        set({ user: null, access: null, refresh: null });
      },
    }),
    { name: "byot-auth" }
  )
);
