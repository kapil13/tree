"use client";

import { Bell, LogOut, Menu, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AranyixMark } from "@/components/brand/aranyix-logo";
import { NavLinks } from "@/components/sidebar";
import { clearAppQueryCache } from "@/app/providers";
import { alerts } from "@/lib/api";
import { useAuth } from "@/lib/auth-store";
import { onboardingRedirectPath } from "@/lib/onboarding-routing";
import { scopedKey } from "@/lib/query-keys";
import { formatOrgRole, formatPlatformRole } from "@/lib/role-labels";

export function Topbar() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  const { data: unreadAlerts = [] } = useQuery({
    queryKey: scopedKey(user, "alerts-unread"),
    queryFn: () => alerts.list(true),
    refetchInterval: 60_000,
    enabled: Boolean(user),
  });
  const unreadCount = unreadAlerts.filter((a) => !a.is_read).length;

  const onboardingHref = onboardingRedirectPath(user);
  const onboardingChipLabel =
    user?.onboarding_status === "profile_required"
      ? "Complete profile"
      : user?.onboarding_status === "pending_approval"
        ? "Pending approval"
        : user?.onboarding_status === "rejected"
          ? "Request update"
          : null;

  const roleLine = user?.org_role
    ? `${formatOrgRole(user.org_role)} · ${formatPlatformRole(user.role)}`
    : formatPlatformRole(user?.role);

  return (
    <>
      <div className="flex h-14 items-center justify-between border-b border-stone-200 bg-white px-4 dark:border-stone-800 dark:bg-stone-950 md:px-6">
        <div className="flex items-center gap-3">
          <button
            type="button"
            className="btn-ghost md:hidden"
            aria-label="Open menu"
            onClick={() => setMenuOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="text-sm text-stone-600">
            {user?.organization_name
              ? user.organization_name
              : user?.organization_id
                ? "Organization workspace"
                : "Personal workspace"}
          </div>
        </div>
        <div className="flex items-center gap-3">
          {onboardingHref && onboardingChipLabel ? (
            <Link
              href={onboardingHref}
              className="hidden rounded-full border border-amber-300 bg-amber-50 px-3 py-1 text-xs font-medium text-amber-950 hover:bg-amber-100 sm:inline-flex dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100"
            >
              {onboardingChipLabel}
            </Link>
          ) : null}
          <Link
            href="/alerts"
            className="btn-ghost relative"
            aria-label={unreadCount ? `${unreadCount} unread alerts` : "Alerts"}
          >
            <Bell className="h-4 w-4" />
            {unreadCount > 0 ? (
              <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-600 px-1 text-[10px] font-semibold text-white">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            ) : null}
          </Link>
          <div className="hidden text-sm sm:block">
            <div className="font-medium text-stone-800 dark:text-stone-100">{user?.full_name || "…"}</div>
            <div className="text-xs text-stone-500">{roleLine}</div>
          </div>
          <button
            className="btn-ghost"
            aria-label="Sign out"
            onClick={() => {
              logout();
              clearAppQueryCache();
              router.push("/auth?mode=signin");
            }}
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>

      {menuOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/40"
            aria-label="Close menu"
            onClick={() => setMenuOpen(false)}
          />
          <div className="absolute left-0 top-0 flex h-full w-72 flex-col overflow-y-auto bg-white p-4 shadow-xl dark:bg-stone-950">
            <div className="mb-4 flex items-center justify-between">
              <Link
                href="/dashboard"
                className="flex items-center gap-2"
                onClick={() => setMenuOpen(false)}
              >
                <AranyixMark className="h-8 w-8" />
                <span className="text-lg font-bold text-forest-900">Aranyix</span>
              </Link>
              <button type="button" className="btn-ghost" onClick={() => setMenuOpen(false)}>
                <X className="h-5 w-5" />
              </button>
            </div>
            <NavLinks onNavigate={() => setMenuOpen(false)} />
          </div>
        </div>
      )}
    </>
  );
}
