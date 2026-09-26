"use client";

import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { AlertTriangle } from "lucide-react";
import { auth } from "@/lib/api";
import { useAuth } from "@/lib/auth-store";
import { platformAdmin } from "@/lib/platform-api";

const BACKUP_KEY = "byot_impersonation_backup";

export function ImpersonationBanner() {
  const router = useRouter();
  const { user, setSession, setUser } = useAuth();

  const stop = useMutation({
    mutationFn: () => platformAdmin.stopImpersonation(),
    onSuccess: async (tokens) => {
      sessionStorage.removeItem(BACKUP_KEY);
      setSession({
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        token_type: "Bearer",
        expires_in: tokens.expires_in,
      });
      const me = await auth.me();
      setUser(me);
      router.push("/platform/users");
    },
  });

  if (!user?.impersonation) return null;

  return (
    <div className="border-b border-amber-300 bg-amber-50 px-4 py-2 text-sm text-amber-950 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2">
        <div className="inline-flex items-center gap-2">
          <AlertTriangle className="h-4 w-4" />
          <span>
            Viewing as <strong>{user.full_name}</strong> ({user.email}). Signed in as admin{" "}
            {user.impersonation.admin_email}.
            {user.impersonation.read_only ? (
              <span className="ml-1 font-medium">Read-only.</span>
            ) : null}
          </span>
        </div>
        <button
          type="button"
          className="btn-secondary text-xs"
          disabled={stop.isPending}
          onClick={() => stop.mutate()}
        >
          Exit impersonation
        </button>
      </div>
    </div>
  );
}

export function backupSessionForImpersonation() {
  if (typeof window === "undefined") return;
  const backup = {
    access: localStorage.getItem("byot_access_token"),
    refresh: localStorage.getItem("byot-auth")
      ? JSON.parse(localStorage.getItem("byot-auth") || "{}")?.state?.refresh
      : null,
  };
  sessionStorage.setItem(BACKUP_KEY, JSON.stringify(backup));
}
