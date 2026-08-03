"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  Building2,
  CreditCard,
  Globe2,
  HelpCircle,
  KeyRound,
  LayoutDashboard,
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
  label: string;
  icon: typeof LayoutDashboard;
  exact?: boolean;
  visible: (user: PlatformUser) => boolean;
};

const NAV: NavItem[] = [
  {
    href: "/platform",
    label: "Overview",
    icon: LayoutDashboard,
    exact: true,
    visible: (user) => hasAnyPlatformAccess(user),
  },
  {
    href: "/platform/users",
    label: "Users",
    icon: Users,
    visible: (user) => canManagePlatformUsers(user),
  },
  {
    href: "/platform/organizations",
    label: "Organizations",
    icon: Building2,
    visible: (user) => canManagePlatformUsers(user),
  },
  {
    href: "/platform/program-access",
    label: "Program access",
    icon: UserCheck,
    visible: (user) => canManageProgramAccess(user),
  },
  {
    href: "/platform/audit",
    label: "Audit log",
    icon: ScrollText,
    visible: (user) => canManagePlatformUsers(user),
  },
  {
    href: "/platform/governance",
    label: "Governance",
    icon: Shield,
    visible: (user) => isFullPlatformAdmin(user),
  },
  {
    href: "/platform/roles",
    label: "Roles & modules",
    icon: KeyRound,
    visible: (user) => hasAnyPlatformAccess(user),
  },
  {
    href: "/platform/billing",
    label: "Billing",
    icon: CreditCard,
    visible: (user) => canAccessBillingAdmin(user),
  },
  {
    href: "/platform/ops",
    label: "Operations",
    icon: Server,
    visible: (user) => canAccessOpsAdmin(user),
  },
  {
    href: "/platform/cms",
    label: "Website CMS",
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
  const path = usePathname();
  const { user } = useAuth();
  const fullAdmin = isFullPlatformAdmin(user);
  const items = NAV.filter((item) => item.visible(user));
  const [shortcutsOpen, setShortcutsOpen] = useState(false);

  usePlatformHotkeys(pageHotkeys, () => setShortcutsOpen(true));

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-1 sm:px-0">
      <div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="inline-flex items-center gap-2 rounded-full bg-stone-900 px-3 py-1 text-xs font-medium uppercase tracking-[0.18em] text-white dark:bg-stone-100 dark:text-stone-900">
            Platform admin
          </div>
          <div className="flex items-center gap-2">
            <AdminRunbookPanel />
            <button
              type="button"
              onClick={() => setShortcutsOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-stone-200 px-3 py-1.5 text-xs font-medium text-stone-600 hover:bg-stone-50 dark:border-stone-700 dark:text-stone-300 dark:hover:bg-stone-800"
              title="Keyboard shortcuts"
            >
              <HelpCircle className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Shortcuts</span>
              <kbd className="hidden rounded border border-stone-200 px-1 font-mono text-[10px] sm:inline dark:border-stone-600">
                ?
              </kbd>
            </button>
          </div>
        </div>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">Control plane</h1>
        <p className="mt-2 max-w-2xl text-sm text-stone-600 dark:text-stone-300">
          {fullAdmin
            ? "Full platform control — users, organizations, program onboarding, roles, CMS, and audit."
            : "Delegated platform modules assigned to your role or user grants."}
        </p>
      </div>

      <nav className="-mx-1 flex gap-2 overflow-x-auto border-b border-stone-200 pb-2 scrollbar-thin dark:border-stone-800">
        {items.map(({ href, label, icon: Icon, exact }) => {
          const active = exact ? path === href : path === href || path.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "inline-flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-forest-700 text-white"
                  : "text-stone-600 hover:bg-stone-100 dark:text-stone-300 dark:hover:bg-stone-800",
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          );
        })}
      </nav>

      {children}

      <ShortcutsHelpModal
        open={shortcutsOpen}
        onClose={() => setShortcutsOpen(false)}
        pageHotkeys={pageHotkeys}
      />
    </div>
  );
}
