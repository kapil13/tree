"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Building2,
  CreditCard,
  Globe2,
  KeyRound,
  LayoutDashboard,
  ScrollText,
  Server,
  UserCheck,
  Users,
} from "lucide-react";
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

export function PlatformShell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const { user } = useAuth();
  const fullAdmin = isFullPlatformAdmin(user);
  const items = NAV.filter((item) => item.visible(user));

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <div className="inline-flex items-center gap-2 rounded-full bg-stone-900 px-3 py-1 text-xs font-medium uppercase tracking-[0.18em] text-white dark:bg-stone-100 dark:text-stone-900">
          Platform admin
        </div>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight">Control plane</h1>
        <p className="mt-2 max-w-2xl text-sm text-stone-600 dark:text-stone-300">
          {fullAdmin
            ? "Full platform control — users, organizations, program onboarding, roles, CMS, and audit."
            : "Delegated platform modules assigned to your role or user grants."}
        </p>
      </div>

      <nav className="flex flex-wrap gap-2 border-b border-stone-200 pb-2 dark:border-stone-800">
        {items.map(({ href, label, icon: Icon, exact }) => {
          const active = exact ? path === href : path === href || path.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
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
    </div>
  );
}
