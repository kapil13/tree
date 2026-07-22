"use client";

import Link from "next/link";
import { useEffect } from "react";
import { ShieldAlert } from "lucide-react";
import { useAuth, useAuthHydrated } from "@/lib/auth-store";
import { auth } from "@/lib/api";
import { canAccessWebsiteCms } from "@/lib/platform-access";

export function PlatformAdminGuard({ children }: { children: React.ReactNode }) {
  const hydrated = useAuthHydrated();
  const { user, setUser } = useAuth();

  useEffect(() => {
    if (!hydrated || !user || user.platform_access) return;
    auth.me().then(setUser).catch(() => undefined);
  }, [hydrated, user, setUser]);

  if (!hydrated) {
    return <p className="text-sm text-stone-500">Loading platform admin…</p>;
  }

  if (!user) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-900">
        Sign in to access platform administration.
      </div>
    );
  }

  if (!canAccessWebsiteCms(user)) {
    return (
      <div className="mx-auto max-w-lg rounded-2xl border border-stone-200 bg-white p-8 text-center shadow-sm dark:border-stone-800 dark:bg-stone-900">
        <ShieldAlert className="mx-auto h-10 w-10 text-amber-600" />
        <h1 className="mt-4 text-xl font-semibold">CMS access required</h1>
        <p className="mt-2 text-sm text-stone-600 dark:text-stone-300">
          Your role does not have permission to manage the marketing website. Ask a platform admin to
          grant CMS access for your role.
        </p>
        <Link href="/dashboard" className="btn-primary mt-6 inline-flex">
          Back to dashboard
        </Link>
      </div>
    );
  }

  return <>{children}</>;
}
