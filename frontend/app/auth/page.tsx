"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AuthGateway } from "@/components/auth/auth-gateway";

function AuthPageInner() {
  const params = useSearchParams();
  const mode = params.get("mode") === "signup" ? "signup" : "signin";
  const [oauthError, setOauthError] = useState<string | null>(null);

  useEffect(() => {
    const err = params.get("error");
    if (err === "google_denied") {
      setOauthError("Google sign-in was cancelled.");
    } else if (err === "google_exchange_failed") {
      setOauthError(
        "Google sign-in failed. Check GOOGLE_REDIRECT_URI matches Google Cloud Console exactly.",
      );
    }
  }, [params]);

  return (
    <>
      {oauthError && (
        <div className="fixed inset-x-0 top-4 z-50 mx-auto max-w-lg rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 shadow-lg">
          {oauthError}
        </div>
      )}
      <AuthGateway initialMode={mode} />
    </>
  );
}

export default function AuthPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#f4faf6] text-sm text-stone-600">
          Loading secure sign-in…
        </div>
      }
    >
      <AuthPageInner />
    </Suspense>
  );
}
