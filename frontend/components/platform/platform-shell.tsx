"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  Building2,
  CreditCard,
  Globe2,
  HelpCircle,
  KeyRound,
  LayoutDashboard,
  Satellite,
  ScrollText,
  Server,
  UserCheck,
  Shield,
  Users,
} from "lucide-react";
import { AdminRunbookPanel } from "@/components/platform/admin-runbook-panel";
import { ShortcutsHelpModal } from "@/components/platform/shortcuts-help-modal";
import { useAuth } from "@/lib/auth-store";
import {
  canAccessBillingAdmin,
  canAccessOpsAdmin,
  canAccessWebsiteCms,
  canManagePlatformUsers,
  canManageProgramAccess,
  hasAnyPlatformAccess,
  isFullPlatformAdmin,
  type PlatformAccess,
} from "@/lib/platform-access";
import { cn } from "@/lib/cn";
import { usePlatformHotkeys, type PlatformHotkey } from "@/lib/use-platform-hotkeys";

type PlatformUser = { role?: string; platform_access?: Partial<PlatformAccess> } | null;

type NavItem = {
  href: string;
  labelKey:
    | "overview"
    | "users"
    | "organizations"
    | "programAccess"
    | "activityLog"
    | "governance"
    | "roles"
    | "billing"
    | "operations"
    | "satelliteHealth"
    | "websiteCms";
  icon: typeof LayoutDashboard;
  exact?: boolean;
  visible: (user: PlatformUser) => boolean;
};

const NAV: NavItem[] = [
  {
    href: "/platform",
    labelKey: "overview",
    icon: LayoutDashboard,
    exact: true,
    visible: (user) => hasAnyPlatformAccess(user),
  },
  {
    href: "/platform/users",
    labelKey: "users",
    icon: Users,
    visible: (user) => canManagePlatformUsers(user),
  },
  {
    href: "/platform/organizations",
    labelKey: "organizations",
    icon: Building2,
    visible: (user) => canManagePlatformUsers(user),
  },
  {
    href: "/platform/program-access",
    labelKey: "programAccess",
    icon: UserCheck,
    visible: (user) => canManageProgramAccess(user),
  },
  {
    href: "/platform/audit",
    labelKey: "activityLog",
    icon: ScrollText,
    visible: (user) => canManagePlatformUsers(user),
  },
  {
    href: "/platform/governance",
    labelKey: "governance",
    icon: Shield,
    visible: (user) => isFullPlatformAdmin(user),
  },
  {
    href: "/platform/roles",
    labelKey: "roles",
    icon: KeyRound,
    visible: (user) => hasAnyPlatformAccess(user),
  },
  {
    href: "/platform/billing",
    labelKey: "billing",
    icon: CreditCard,
    visible: (user) => canAccessBillingAdmin(user),
  },
  {
    href: "/platform/ops",
    labelKey: "operations",
    icon: Server,
    visible: (user) => canAccessOpsAdmin(user),
  },
  {
    href: "/platform/satellite",
    labelKey: "satelliteHealth",
    icon: Satellite,
    visible: (user) => canAccessOpsAdmin(user),
  },
  {
    href: "/platform/cms",
    labelKey: "websiteCms",
    icon: Globe2,
    visible: (user) => canAccessWebsiteCms(user),
  },
];

export function PlatformShell({
  children,
  pageHotkeys = [],
}: {
  children: React.ReactNode;
  pageHotkeys?: PlatformHotkey[];
}) {
  const t = useTranslations("platformAdmin.shell");
  const path = usePathname();
  const { user } = useAuth();
  const fullAdmin = isFullPlatformAdmin(user);
  const items = NAV.filter((item) => item.visible(user));
  const [shortcutsOpen, setShortcutsOpen] = useState(false);

  usePlatformHotkeys(pageHotkeys, () => setShortcutsOpen(true));

  return (
    <div className="mx-auto max-w-6xl space-y-5 px-1 sm:px-0">
      <header className="sticky top-0 z-20 -mx-1 border-b border-stone-200/80 bg-stone-50/95 px-1 pb-2 pt-1 backdrop-blur dark:border-stone-800/80 dark:bg-stone-950/95 sm:mx-0 sm:px-0">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-3">
            <div className="inline-flex items-center gap-2 rounded-full bg-stone-900 px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-[0.16em] text-white dark:bg-stone-100 dark:text-stone-900">
              {t("badge")}
            </div>
            <p className="truncate text-xs text-stone-500 dark:text-stone-400">
              {fullAdmin ? t("subtitleFull") : t("subtitleDelegated")}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <AdminRunbookPanel />
            <button
              type="button"
              onClick={() => setShortcutsOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-stone-200 px-3 py-1.5 text-xs font-medium text-stone-600 hover:bg-stone-50 dark:border-stone-700 dark:text-stone-300 dark:hover:bg-stone-800"
              title={t("shortcutsTitle")}
            >
              <HelpCircle className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{t("shortcuts")}</span>
              <kbd className="hidden rounded border border-stone-200 px-1 font-mono text-[10px] sm:inline dark:border-stone-600">
                ?
              </kbd>
            </button>
          </div>
        </div>

        <nav className="-mx-1 mt-2 flex gap-1.5 overflow-x-auto pb-0.5 scrollbar-thin">
          {items.map(({ href, labelKey, icon: Icon, exact }) => {
            const active = exact ? path === href : path === href || path.startsWith(`${href}/`);
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "inline-flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium transition-colors",
                  active
                    ? "bg-forest-700 text-white"
                    : "text-stone-600 hover:bg-stone-100 dark:text-stone-300 dark:hover:bg-stone-800",
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {t(`nav.${labelKey}`)}
              </Link>
            );
          })}
        </nav>
      </header>

      {children}

      <ShortcutsHelpModal
        open={shortcutsOpen}
        onClose={() => setShortcutsOpen(false)}
        pageHotkeys={pageHotkeys}
      />
    </div>
  );
}
