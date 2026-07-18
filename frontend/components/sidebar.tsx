"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Bell,
  FileText,
  FolderKanban,
  Leaf,
  Map,
  Mic,
  Satellite,
  Settings,
  Shield,
  Sparkles,
  TreePine,
  type LucideIcon,
} from "lucide-react";
import { useAuth } from "@/lib/auth-store";
import { isPlatformAdmin } from "@/lib/auth-utils";
import { cn } from "@/lib/cn";

export type NavItem = { href: string; label: string; icon: LucideIcon; adminOnly?: boolean };

export const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: BarChart3 },
  { href: "/projects", label: "Projects", icon: FolderKanban },
  { href: "/trees", label: "Trees", icon: TreePine },
  { href: "/trees/new", label: "Add tree", icon: Leaf },
  { href: "/map", label: "Map", icon: Map },
  { href: "/satellite", label: "Satellite", icon: Satellite },
  { href: "/bioacoustic", label: "Biodiversity", icon: Mic },
  { href: "/assistant", label: "AI assistant", icon: Sparkles },
  { href: "/reports", label: "Reports", icon: FileText },
  { href: "/alerts", label: "Alerts", icon: Bell },
  { href: "/settings", label: "Settings", icon: Settings },
  { href: "/admin", label: "Superadmin", icon: Shield, adminOnly: true },
];

export function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const path = usePathname();
  const { user } = useAuth();
  const items = NAV_ITEMS.filter((item) => !item.adminOnly || isPlatformAdmin(user?.role));
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
                : "text-stone-700 hover:bg-stone-100 dark:text-stone-200 dark:hover:bg-stone-800"
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
