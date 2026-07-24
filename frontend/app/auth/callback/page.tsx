"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { auth } from "@/lib/api";
import { useAuth } from "@/lib/auth-store";
import { syncSessionCookieFromToken } from "@/lib/session-cookie";

export default function GoogleCallbackPage() {
  const router = useRouter();
  const { setSession, setUser } = useAuth();
  const [message, setMessage] = useState("Completing Google sign-in…");

  useEffect(() => {
    const hash = window.location.hash.startsWith("#")
      ? window.location.hash.slice(1)
      : window.location.hash;
    const params = new URLSearchParams(hash);
    const access = params.get("access_token");
    const refresh = params.get("refresh_token");
    const expiresIn = Number(params.get("expires_in") || "900");

    if (!access || !refresh) {
      setMessage("Google sign-in did not return tokens. Please try again.");
      return;
    }

    (async () => {
      try {
        setSession({
          access_token: access,
          refresh_token: refresh,
          token_type: "Bearer",
          expires_in: expiresIn,
        });
        setUser(await auth.me());
        syncSessionCookieFromToken();
        router.replace("/dashboard");
      } catch {
        setMessage("Signed in with Google but session setup failed. Try signing in again.");
      }
    })();
  }, [router, setSession, setUser]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f4faf6] px-6">
      <div className="rounded-2xl border border-stone-200 bg-white px-6 py-5 text-sm text-stone-700 shadow-lg">
        {message}
      </div>
    </div>
  );
}
