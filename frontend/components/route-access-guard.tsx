"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ShieldAlert } from "lucide-react";
import { useAuth, useAuthHydrated } from "@/lib/auth-store";
import { canAccessPath, routeAccessDeniedMessage } from "@/lib/route-access";

export function RouteAccessGuard({ children }: { children: React.ReactNode }) {
  const hydrated = useAuthHydrated();
  const pathname = usePathname();
  const { user } = useAuth();

  if (!hydrated || !pathname) {
    return <>{children}</>;
  }

  if (!user || canAccessPath(user, pathname)) {
    return <>{children}</>;
  }

  return (
    <div className="mx-auto max-w-lg rounded-2xl border border-stone-200 bg-white p-8 text-center shadow-sm dark:border-stone-800 dark:bg-stone-900">
      <ShieldAlert className="mx-auto h-10 w-10 text-amber-600" />
      <h1 className="mt-4 text-xl font-semibold">Access restricted</h1>
      <p className="mt-2 text-sm text-stone-600 dark:text-stone-300">
        {routeAccessDeniedMessage(pathname)}
      </p>
      <Link href="/dashboard" className="btn-primary mt-6 inline-flex">
        Back to dashboard
      </Link>
    </div>
  );
}
