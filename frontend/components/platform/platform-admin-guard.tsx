"use client";

import Link from "next/link";
import { ShieldAlert } from "lucide-react";
import { useAuth, useAuthHydrated } from "@/lib/auth-store";

export function PlatformAdminGuard({ children }: { children: React.ReactNode }) {
  const hydrated = useAuthHydrated();
  const { user } = useAuth();

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

  if (user.role !== "admin") {
    return (
      <div className="mx-auto max-w-lg rounded-2xl border border-stone-200 bg-white p-8 text-center shadow-sm dark:border-stone-800 dark:bg-stone-900">
        <ShieldAlert className="mx-auto h-10 w-10 text-amber-600" />
        <h1 className="mt-4 text-xl font-semibold">Platform admin required</h1>
        <p className="mt-2 text-sm text-stone-600 dark:text-stone-300">
          Only platform administrators can manage the marketing website CMS.
        </p>
        <Link href="/dashboard" className="btn-primary mt-6 inline-flex">
          Back to dashboard
        </Link>
      </div>
    );
  }

  return <>{children}</>;
}
