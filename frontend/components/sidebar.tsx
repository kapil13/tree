"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Bell,
  FileText,
  ClipboardList,
  FolderKanban,
  Globe2,
  Leaf,
  LayoutDashboard,
  Map,
  Mic,
  Satellite,
  Settings,
  Sparkles,
  TreePine,
  Users,
  Activity,
  UserCheck,
  type LucideIcon,
} from "lucide-react";
import { AranyixMark } from "@/components/brand/aranyix-logo";
import { useAuth } from "@/lib/auth-store";
import { canSeeNavItem, type NavAudience } from "@/lib/nav-access";
import { canAccessWebsiteCms, canManagePlatformUsers } from "@/lib/platform-access";
import { cn } from "@/lib/cn";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  audience?: NavAudience | NavAudience[];
  excludeViewers?: boolean;
  exact?: boolean;
};

type NavGroup = {
  id: string;
  label: string;
  items: NavItem[];
};

const NAV_GROUPS: NavGroup[] = [
  {
    id: "home",
    label: "Home",
    items: [{ href: "/dashboard", label: "Dashboard", icon: BarChart3, audience: "all", exact: true }],
  },
  {
    id: "operate",
    label: "Operate",
    items: [
      {
        href: "/field-ops",
        label: "Field ops",
        icon: ClipboardList,
        audience: ["professional", "field_supervisor"],
        excludeViewers: true,
      },
      { href: "/projects", label: "Projects", icon: FolderKanban, audience: ["professional", "field_supervisor", "field_worker"] },
      { href: "/trees", label: "Trees", icon: TreePine, audience: "all", exact: true },
      { href: "/trees/new", label: "Add tree", icon: Leaf, audience: "can_write", exact: true },
      { href: "/map", label: "Map", icon: Map, audience: "all" },
    ],
  },
  {
    id: "monitor",
    label: "Monitor",
    items: [
      {
        href: "/portfolio-health",
        label: "Portfolio health",
        icon: Activity,
        audience: ["professional", "field_supervisor"],
        exact: true,
      },
      { href: "/satellite", label: "Satellite", icon: Satellite, audience: ["professional", "field_supervisor"] },
      { href: "/bioacoustic", label: "Biodiversity", icon: Mic, audience: "professional" },
      { href: "/alerts", label: "Alerts", icon: Bell, audience: "all" },
    ],
  },
  {
    id: "evidence",
    label: "Evidence",
    items: [
      { href: "/reports", label: "Reports", icon: FileText, audience: ["professional", "field_supervisor"] },
      { href: "/assistant", label: "AI assistant", icon: Sparkles, audience: "all" },
      { href: "/settings", label: "Settings", icon: Settings, audience: "all" },
    ],
  },
];

function isActive(path: string | null, item: NavItem): boolean {
  if (!path) return false;
  if (item.exact) return path === item.href;
  if (item.href === "/dashboard") return path === "/dashboard";
  if (item.href === "/portfolio-health") return path === "/portfolio-health";
  if (item.href === "/trees") return path === "/trees" || (path.startsWith("/trees/") && !path.startsWith("/trees/new"));
  return path === item.href || path.startsWith(`${item.href}/`);
}

export function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const path = usePathname();
  const { user } = useAuth();

  const adminItems: NavItem[] = [];
  if (canManagePlatformUsers(user)) {
    adminItems.push({
      href: "/platform",
      label: "Platform admin",
      icon: LayoutDashboard,
      audience: "all",
      exact: true,
    });
    adminItems.push({
      href: "/platform/users",
      label: "Users",
      icon: Users,
      audience: "all",
    });
    adminItems.push({
      href: "/platform/program-access",
      label: "Program access",
      icon: UserCheck,
      audience: "all",
    });
  }
  if (canAccessWebsiteCms(user)) {
    adminItems.push({ href: "/platform/cms", label: "Website CMS", icon: Globe2, audience: "all" });
  }

  const groups = NAV_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((item) =>
      canSeeNavItem(user, item.audience ?? "all", { excludeViewers: item.excludeViewers }),
    ),
  })).filter((group) => group.items.length > 0);

  if (adminItems.length) {
    groups.push({ id: "admin", label: "Admin", items: adminItems });
  }

  return (
    <nav className="space-y-4">
      {groups.map((group) => (
        <div key={group.id}>
          {group.id !== "home" ? (
            <p className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-wider text-stone-400">
              {group.label}
            </p>
          ) : null}
          <div className="space-y-1">
            {group.items.map(({ href, label, icon: Icon, exact, audience }) => {
              const active = isActive(path, { href, label, icon: Icon, exact, audience });
              return (
                <Link
                  key={href}
                  href={href}
                  onClick={onNavigate}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium",
                    active
                      ? "bg-forest-100 text-forest-800"
                      : "text-stone-700 hover:bg-stone-100 dark:text-stone-200 dark:hover:bg-stone-800",
                  )}
                >
                  <Icon className="h-4 w-4" />
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
