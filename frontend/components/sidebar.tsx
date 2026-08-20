"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  BarChart3,
  Bell,
  FileText,
  ClipboardList,
  FolderKanban,
  Heart,
  LayoutDashboard,
  Map,
  Mic,
  Satellite,
  Settings,
  Sparkles,
  TreePine,
  Activity,
  type LucideIcon,
} from "lucide-react";
import { AranyixMark } from "@/components/brand/aranyix-logo";
import { useAuth } from "@/lib/auth-store";
import { canSeeNavItem, type NavAudience } from "@/lib/nav-access";
import { hasAnyPlatformAccess } from "@/lib/platform-access";
import { cn } from "@/lib/cn";

export type NavItem = {
  href: string;
  labelKey: string;
  icon: LucideIcon;
  audience?: NavAudience | NavAudience[];
  excludeViewers?: boolean;
  exact?: boolean;
};

type NavGroup = {
  id: string;
  labelKey: string;
  items: NavItem[];
};

const NAV_GROUPS: NavGroup[] = [
  {
    id: "home",
    labelKey: "home",
    items: [
      { href: "/dashboard", labelKey: "dashboard", icon: BarChart3, audience: "all", exact: true },
      { href: "/stewardship", labelKey: "stewardship", icon: Heart, audience: "byot", exact: true },
    ],
  },
  {
    id: "operate",
    labelKey: "operate",
    items: [
      {
        href: "/field-ops",
        labelKey: "fieldOps",
        icon: ClipboardList,
        audience: ["professional", "field_supervisor"],
        excludeViewers: true,
      },
      {
        href: "/projects",
        labelKey: "projects",
        icon: FolderKanban,
        audience: ["professional", "field_supervisor", "field_worker"],
      },
      { href: "/trees", labelKey: "trees", icon: TreePine, audience: "all", exact: true },
      { href: "/map", labelKey: "map", icon: Map, audience: "all" },
    ],
  },
  {
    id: "monitor",
    labelKey: "monitor",
    items: [
      {
        href: "/portfolio-health",
        labelKey: "portfolioHealth",
        icon: Activity,
        audience: ["professional", "field_supervisor"],
        exact: true,
      },
      {
        href: "/satellite",
        labelKey: "satellite",
        icon: Satellite,
        audience: ["professional", "field_supervisor"],
      },
      { href: "/bioacoustic", labelKey: "biodiversity", icon: Mic, audience: "professional" },
      { href: "/alerts", labelKey: "alerts", icon: Bell, audience: "all" },
    ],
  },
  {
    id: "evidence",
    labelKey: "evidence",
    items: [
      {
        href: "/reports",
        labelKey: "reports",
        icon: FileText,
        audience: ["professional", "field_supervisor"],
      },
      { href: "/assistant", labelKey: "aiAssistant", icon: Sparkles, audience: "all" },
    ],
  },
  {
    id: "account",
    labelKey: "account",
    items: [{ href: "/settings", labelKey: "settings", icon: Settings, audience: "all" }],
  },
];

function isActive(path: string | null, item: NavItem): boolean {
  if (!path) return false;
  if (item.exact) return path === item.href;
  if (item.href === "/dashboard") return path === "/dashboard";
  if (item.href === "/portfolio-health") return path === "/portfolio-health";
  if (item.href === "/trees") {
    return path === "/trees" || (path.startsWith("/trees/") && !path.startsWith("/trees/new"));
  }
  return path === item.href || path.startsWith(`${item.href}/`);
}

export function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const path = usePathname();
  const { user } = useAuth();
  const t = useTranslations("nav");

  const adminItems: NavItem[] = [];
  if (hasAnyPlatformAccess(user)) {
    adminItems.push({
      href: "/platform",
      labelKey: "platformAdmin",
      icon: LayoutDashboard,
      audience: "all",
      exact: true,
    });
  }

  const groups = NAV_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((item) =>
      canSeeNavItem(user, item.audience ?? "all", { excludeViewers: item.excludeViewers }),
    ),
  })).filter((group) => group.items.length > 0);

  if (adminItems.length) {
    groups.push({ id: "admin", labelKey: "platformAdmin", items: adminItems });
  }

  return (
    <nav className="space-y-4" aria-label={t("home")}>
      {groups.map((group) => (
        <div key={group.id}>
          {group.id !== "home" ? (
            <p className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-wider text-stone-400">
              {t(group.labelKey)}
            </p>
          ) : null}
          <div className="space-y-1">
            {group.items.map(({ href, labelKey, icon: Icon, exact, audience }) => {
              const active = isActive(path, { href, labelKey, icon: Icon, exact, audience });
              const label = t(labelKey);
              return (
                <Link
                  key={href}
                  href={href}
                  onClick={onNavigate}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest-600",
                    active
                      ? "bg-forest-100 text-forest-800"
                      : "text-stone-700 hover:bg-stone-100 dark:text-stone-200 dark:hover:bg-stone-800",
                  )}
                >
                  <Icon className="h-4 w-4" aria-hidden />
                  {label}
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}

export function Sidebar() {
  return (
    <aside className="hidden w-60 shrink-0 border-r border-stone-200 bg-white p-4 dark:border-stone-800 dark:bg-stone-950 md:block">
      <Link href="/dashboard" className="mb-6 flex items-center gap-2.5">
        <AranyixMark className="h-8 w-8 shrink-0" />
        <div className="min-w-0">
          <div className="text-base font-bold leading-tight text-forest-900">Aranyix</div>
          <div className="truncate text-[10px] font-medium uppercase tracking-wider text-stone-500">
            Nature intelligence
          </div>
        </div>
      </Link>
      <NavLinks />
    </aside>
  );
}
