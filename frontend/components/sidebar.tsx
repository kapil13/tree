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
  Map,
  Mic,
  Satellite,
  Settings,
  Sparkles,
  TreePine,
  Activity,
  Brain,
  UserCheck,
  type LucideIcon,
} from "lucide-react";
import { useAuth } from "@/lib/auth-store";
import { canSeeNavItem } from "@/lib/nav-access";
import { canAccessWebsiteCms, canManagePlatformUsers } from "@/lib/platform-access";
import { cn } from "@/lib/cn";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  audience?: import("@/lib/nav-access").NavAudience | import("@/lib/nav-access").NavAudience[];
};

export const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: BarChart3, audience: "all" },
  { href: "/field-ops", label: "Field ops", icon: ClipboardList, audience: ["professional", "field_supervisor"] },
  { href: "/monitoring", label: "Monitoring", icon: Activity, audience: ["professional", "field_supervisor"] },
  { href: "/intelligence", label: "Intelligence", icon: Brain, audience: ["professional", "field_supervisor"] },
  { href: "/projects", label: "Projects", icon: FolderKanban, audience: ["professional", "field_supervisor", "field_worker"] },
  { href: "/trees", label: "Trees", icon: TreePine, audience: "all" },
  { href: "/trees/new", label: "Add tree", icon: Leaf, audience: "all" },
  { href: "/map", label: "Map", icon: Map, audience: "all" },
  { href: "/satellite", label: "Satellite", icon: Satellite, audience: ["professional", "field_supervisor"] },
  { href: "/bioacoustic", label: "Biodiversity", icon: Mic, audience: "professional" },
  { href: "/assistant", label: "AI assistant", icon: Sparkles, audience: "all" },
  { href: "/reports", label: "Reports", icon: FileText, audience: ["professional", "field_supervisor"] },
  { href: "/alerts", label: "Alerts", icon: Bell, audience: "all" },
  { href: "/settings", label: "Settings", icon: Settings, audience: "all" },
];

export function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const path = usePathname();
  const { user } = useAuth();
  const adminItems: NavItem[] = [];
  if (canAccessWebsiteCms(user)) {
    adminItems.push({ href: "/platform/cms", label: "Website CMS", icon: Globe2, audience: "all" });
  }
  if (canManagePlatformUsers(user)) {
    adminItems.push({
      href: "/platform/program-access",
      label: "Program access",
      icon: UserCheck,
      audience: "all",
    });
  }
  const items = [...NAV_ITEMS, ...adminItems].filter((item) =>
    canSeeNavItem(user, item.audience ?? "all"),
  );

  return (
    <nav className="space-y-1">
      {items.map(({ href, label, icon: Icon }) => {
        const active = path === href || (href !== "/dashboard" && path?.startsWith(href));
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
    </nav>
  );
}

export function Sidebar() {
  return (
    <aside className="hidden w-60 shrink-0 border-r border-stone-200 bg-white p-4 dark:border-stone-800 dark:bg-stone-950 md:block">
      <Link href="/" className="mb-6 flex items-center gap-2 text-lg font-bold text-forest-800">
        🌳 BYOT
      </Link>
      <NavLinks />
    </aside>
  );
}
