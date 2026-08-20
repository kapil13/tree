"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AranyixLogo } from "@/components/brand/aranyix-logo";
import { auth } from "@/lib/api";
import { useAuth } from "@/lib/auth-store";
import { consumePendingInviteToken, inviteErrorMessage, inviteLandingPath } from "@/lib/invite-landing";
import { organizations } from "@/lib/organizations-api";
import { syncSessionCookieFromToken } from "@/lib/session-cookie";

export default function GoogleCallbackPage() {
  const router = useRouter();
  const { setSession, setUser } = useAuth();
  const [message, setMessage] = useState("Completing Google sign-in…");
  const [failed, setFailed] = useState(false);

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
      setFailed(true);
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
        const profile = await auth.me();
        setUser(profile);
        await syncSessionCookieFromToken();

        const pendingInvite = consumePendingInviteToken();
        if (pendingInvite) {
          try {
            const member = await organizations.acceptInvite(pendingInvite);
            const refreshed = await auth.me();
            setUser(refreshed);
            router.replace(inviteLandingPath(member.org_role ?? refreshed.org_role));
            return;
          } catch (err) {
            const { errorMessage } = await import("@/lib/api");
            setMessage(
              `Signed in, but invite could not be accepted: ${inviteErrorMessage(errorMessage(err))}`,
            );
            setFailed(true);
            return;
          }
        }

        router.replace("/dashboard");
      } catch {
        setMessage("Signed in with Google but session setup failed. Try signing in again.");
        setFailed(true);
      }
    })();
  }, [router, setSession, setUser]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f4faf6] px-6">
      <div className="w-full max-w-md space-y-5 rounded-2xl border border-stone-200 bg-white px-6 py-8 text-center shadow-lg">
        <AranyixLogo className="mx-auto h-12 w-auto max-w-[220px]" />
        <p className="text-sm text-stone-700">{message}</p>
        {failed ? (
          <Link href="/auth?mode=signin" className="btn-primary inline-flex">
            Back to sign in
          </Link>
        ) : null}
      </div>
    </div>
  );
}
