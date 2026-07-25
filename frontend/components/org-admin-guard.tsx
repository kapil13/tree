"use client";

import Link from "next/link";
import { ShieldAlert } from "lucide-react";
import { useAuth, useAuthHydrated } from "@/lib/auth-store";
import { isOrgAdmin } from "@/lib/nav-access";

export function OrgAdminGuard({ children }: { children: React.ReactNode }) {
  const hydrated = useAuthHydrated();
  const { user } = useAuth();

  if (!hydrated) {
    return <p className="text-sm text-stone-500">Loading team settings…</p>;
  }

  if (!user) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-900">
        Sign in to manage your organization team.
      </div>
    );
  }

  if (!isOrgAdmin(user)) {
    return (
      <div className="mx-auto max-w-lg rounded-2xl border border-stone-200 bg-white p-8 text-center shadow-sm dark:border-stone-800 dark:bg-stone-900">
        <ShieldAlert className="mx-auto h-10 w-10 text-amber-600" />
        <h1 className="mt-4 text-xl font-semibold">Org admin required</h1>
        <p className="mt-2 text-sm text-stone-600 dark:text-stone-300">
          Only organization administrators can invite teammates and change roles. Ask your program
          manager to grant org admin access.
        </p>
        <Link href="/settings" className="btn-primary mt-6 inline-flex">
          Back to settings
        </Link>
      </div>
    );
  }

  return <>{children}</>;
}
