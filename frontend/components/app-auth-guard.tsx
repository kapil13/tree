"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { auth, isApiError } from "@/lib/api";
import { useAuth, useAuthHydrated } from "@/lib/auth-store";
import { syncSessionCookieFromToken } from "@/lib/session-cookie";

type AuthStatus = "loading" | "authenticated" | "unauthenticated";

export function AppAuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const hydrated = useAuthHydrated();
  const { user, setUser, logout, getAccessToken } = useAuth();
  const [status, setStatus] = useState<AuthStatus>("loading");

  useEffect(() => {
    if (!hydrated) return;

    const token = getAccessToken();
    if (!token) {
      setStatus("unauthenticated");
      router.replace("/auth?mode=signin");
      return;
    }

    syncSessionCookieFromToken();

    if (user) {
      setStatus("authenticated");
      return;
    }

    let cancelled = false;
    auth
      .me()
      .then((profile) => {
        if (cancelled) return;
        setUser(profile);
        setStatus("authenticated");
      })
      .catch((err) => {
        if (cancelled) return;
        if (isApiError(err) && err.response?.status === 401) {
          logout();
        }
        setStatus("unauthenticated");
        router.replace("/auth?mode=signin");
      });

    return () => {
      cancelled = true;
    };
  }, [hydrated, user, router, setUser, logout, getAccessToken]);

  if (!hydrated || status !== "authenticated") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-stone-50 dark:bg-stone-950">
        <Loader2 className="h-8 w-8 animate-spin text-forest-600" aria-label="Loading" />
      </div>
    );
  }

  return <>{children}</>;
}
