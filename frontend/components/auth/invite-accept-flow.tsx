"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, Users } from "lucide-react";
import { errorMessage } from "@/lib/api";
import { inviteErrorMessage, inviteLandingPath } from "@/lib/invite-landing";
import { organizations, type InvitePreview } from "@/lib/organizations-api";
import { useAuth } from "@/lib/auth-store";
import { formatOrgRole } from "@/lib/role-labels";

export function InviteAcceptHandler() {
  const router = useRouter();
  const params = useSearchParams();
  const { user, setUser } = useAuth();
  const inviteToken = params.get("invite");

  const [status, setStatus] = useState<"idle" | "accepting" | "done" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!inviteToken || !user || status !== "idle") return;

    let cancelled = false;
    setStatus("accepting");

    organizations
      .acceptInvite(inviteToken)
      .then(async (member) => {
        if (cancelled) return;
        const { auth } = await import("@/lib/api");
        const profile = await auth.me();
        setUser(profile);
        setStatus("done");
        router.replace(inviteLandingPath(member.org_role ?? profile.org_role));
      })
      .catch((err) => {
        if (cancelled) return;
        setStatus("error");
        setError(inviteErrorMessage(errorMessage(err)));
      });

    return () => {
      cancelled = true;
    };
  }, [inviteToken, user, status, setUser, router]);

  if (!inviteToken || !user) return null;

  if (status === "accepting") {
    return (
      <div className="mb-4 flex items-center gap-2 rounded-lg border border-forest-200 bg-forest-50 px-4 py-3 text-sm text-forest-900">
        <Loader2 className="h-4 w-4 animate-spin" />
        Joining organization…
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
        Could not accept invite: {error}
      </div>
    );
  }

  return null;
}

export function InviteAuthBanner({ preview }: { preview: InvitePreview }) {
  return (
    <div className="mb-6 rounded-2xl border border-forest-200 bg-forest-50/80 px-4 py-4 text-sm text-forest-950">
      <div className="flex items-start gap-3">
        <Users className="mt-0.5 h-5 w-5 shrink-0 text-forest-700" />
        <div>
          <p className="font-semibold">You&apos;re invited to join {preview.organization_name}</p>
          <p className="mt-1 text-forest-800/90">
            Role: {formatOrgRole(preview.org_role)} · Sign in or create an account with{" "}
            {preview.email || preview.phone || "the invited contact"} to accept.
          </p>
        </div>
      </div>
    </div>
  );
}
