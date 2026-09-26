"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { AuthGateway } from "@/components/auth/auth-gateway";
import { MarketingShell } from "@/components/marketing/marketing-shell";
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
  const t = useTranslations("auth");
  const mode = params.get("mode") === "signup" ? "signup" : "signin";
  const [oauthError, setOauthError] = useState<string | null>(null);

  useEffect(() => {
    const err = params.get("error");
    if (err === "google_denied") {
      setOauthError(t("errorGoogleDenied"));
    } else if (err === "google_exchange_failed") {
      setOauthError(t("errorGoogleExchange"));
    } else if (err === "google_state_invalid") {
      setOauthError(t("errorGoogleState"));
    } else if (err === "google_email_unverified") {
      setOauthError(t("errorGoogleUnverified"));
    } else if (err === "google_link_requires_verified") {
      setOauthError(t("errorGoogleLink"));
    } else if (err === "organization_suspended") {
      setOauthError(t("errorOrgSuspended"));
    }
  }, [params, t]);

  return (
    <MarketingShell authMode={mode} footerVariant="compact" mainClassName="min-h-0">
      <AlreadySignedInRedirect />
      {oauthError && (
        <div className="mx-auto mt-2 max-w-lg shrink-0 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {oauthError}
        </div>
      )}
      <AuthGateway initialMode={mode} />
    </MarketingShell>
  );
}

export default function AuthPage() {
  const t = useTranslations("auth");
  return (
    <Suspense
      fallback={
        <div className="marketing-page flex min-h-screen items-center justify-center text-sm text-stone-600">
          {t("loadingAuth")}
        </div>
      }
    >
      <AuthPageInner />
    </Suspense>
  );
}
