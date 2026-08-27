"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { ShieldAlert } from "lucide-react";
import { useAuth, useAuthHydrated } from "@/lib/auth-store";
import { canAccessPath, routeAccessDeniedKey } from "@/lib/route-access";

export function RouteAccessGuard({ children }: { children: React.ReactNode }) {
  const hydrated = useAuthHydrated();
  const pathname = usePathname();
  const { user } = useAuth();
  const t = useTranslations("access");

  if (!hydrated || !pathname) {
    return <>{children}</>;
  }

  if (!user || canAccessPath(user, pathname)) {
    return <>{children}</>;
  }

  const key = routeAccessDeniedKey(pathname);
  const message = t(key);

  return (
    <div className="mx-auto max-w-lg rounded-2xl border border-stone-200 bg-white p-8 text-center shadow-sm dark:border-stone-800 dark:bg-stone-900">
      <ShieldAlert className="mx-auto h-10 w-10 text-amber-600" />
      <h1 className="mt-4 text-xl font-semibold">{t("restrictedTitle")}</h1>
      <p className="mt-2 text-sm text-stone-600 dark:text-stone-300">{message}</p>
      <Link href="/dashboard" className="btn-primary mt-6 inline-flex">
        {t("backToDashboard")}
      </Link>
    </div>
  );
}
