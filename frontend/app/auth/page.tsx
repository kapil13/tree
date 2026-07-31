"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AuthGateway } from "@/components/auth/auth-gateway";
import { auth } from "@/lib/api";
import { useAuth, useAuthHydrated } from "@/lib/auth-store";
import { syncSessionCookieFromToken } from "@/lib/session-cookie";

function getSafeNextPath(next: string | null): string | null {
  if (!next?.startsWith("/") || next.startsWith("//")) return null;
  return next;
}

function AlreadySignedInRedirect() {
  const router = useRouter();
  const params = useSearchParams();
  const hydrated = useAuthHydrated();
  const { user, setUser, getAccessToken, logout } = useAuth();

  useEffect(() => {
    if (!hydrated) return;

    const token = getAccessToken();
    if (!token) return;

    const invite = params.get("invite");
    const next = getSafeNextPath(params.get("next"));
    const destination = next ?? (invite ? `/dashboard?invite=${encodeURIComponent(invite)}` : "/dashboard");

    const go = async () => {
      // Edge middleware requires this cookie; localStorage token alone causes /auth ↔ /dashboard loops.
      await syncSessionCookieFromToken();
      router.replace(destination);
    };

    if (user) {
      void go();
      return;
    }

    let cancelled = false;
    auth
      .me()
      .then((profile) => {
        if (cancelled) return;
        setUser(profile);
        void go();
      })
      .catch(() => {
        if (cancelled) return;
        logout();
      });

    return () => {
      cancelled = true;
    };
  }, [hydrated, user, getAccessToken, setUser, logout, router, params]);

  return null;
}

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
        "Google sign-in failed. Add https://aranyix.tech/api/v1/auth/google/callback to Google Cloud Console authorized redirect URIs.",
      );
    } else if (err === "google_state_invalid") {
      setOauthError("Google sign-in expired or was invalid. Please try again.");
    } else if (err === "google_email_unverified") {
      setOauthError("Your Google account email is not verified. Verify it with Google, then try again.");
    } else if (err === "google_link_requires_verified") {
      setOauthError(
        "An account with this email already exists but is not verified. Sign in with email/password or complete verification, then link Google.",
      );
    } else if (err === "organization_suspended") {
      setOauthError("Your organization is suspended. Contact your administrator.");
    }
  }, [params]);

  return (
    <>
      <AlreadySignedInRedirect />
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
