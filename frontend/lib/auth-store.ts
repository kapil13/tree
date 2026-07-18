"use client";

import { useEffect, useState } from "react";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { User, Tokens } from "@/lib/api";

const ACCESS_TOKEN_KEY = "byot_access_token";
const PERSIST_KEY = "byot-auth";

type State = {
  user: User | null;
  access: string | null;
  refresh: string | null;
  setSession: (tokens: Tokens) => void;
  setUser: (u: User | null) => void;
  logout: () => void;
  getAccessToken: () => string | null;
};

export const useAuth = create<State>()(
  persist(
    (set, get) => ({
      user: null,
      access: null,
      refresh: null,
      setSession: (tokens) => {
        if (typeof window !== "undefined") {
          localStorage.setItem(ACCESS_TOKEN_KEY, tokens.access_token);
        }
        set({ access: tokens.access_token, refresh: tokens.refresh_token });
      },
      setUser: (u) => set({ user: u }),
      logout: () => {
        if (typeof window !== "undefined") {
          localStorage.removeItem(ACCESS_TOKEN_KEY);
          localStorage.removeItem(PERSIST_KEY);
        }
        set({ user: null, access: null, refresh: null });
      },
      getAccessToken: () => {
        const fromStore = get().access;
        if (fromStore) return fromStore;
        if (typeof window !== "undefined") {
          return localStorage.getItem(ACCESS_TOKEN_KEY);
        }
        return null;
      },
    }),
    {
      name: PERSIST_KEY,
      partialize: (state) => ({
        user: state.user,
        access: state.access,
        refresh: state.refresh,
      }),
      onRehydrateStorage: () => (state) => {
        if (typeof window === "undefined") return;
        const tok = localStorage.getItem(ACCESS_TOKEN_KEY);
        if (tok && !state?.access) {
          useAuth.setState({ access: tok });
        }
      },
    },
  ),
);

/** Wait for zustand persist to finish loading from localStorage before auth redirects. */
export function useAuthHydrated(): boolean {
  const [hydrated, setHydrated] = useState(() =>
    typeof window === "undefined" ? false : useAuth.persist.hasHydrated(),
  );

  useEffect(() => {
    if (useAuth.persist.hasHydrated()) {
      setHydrated(true);
      return;
    }
    return useAuth.persist.onFinishHydration(() => setHydrated(true));
  }, []);

  return hydrated;
}
