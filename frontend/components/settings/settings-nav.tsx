"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Calculator, Globe2, ScrollText, Settings2, Sprout, UserCheck, Webhook } from "lucide-react";
import { useAuth } from "@/lib/auth-store";
import { canAccessWebsiteCms, canManagePlatformUsers } from "@/lib/platform-access";
import { cn } from "@/lib/cn";

type NavItem = {
  href: string;
  label: string;
  icon: typeof Settings2;
  match?: (path: string) => boolean;
};

const BASE_ITEMS: NavItem[] = [
  {
    href: "/settings",
    label: "General",
    icon: Settings2,
    match: (path) => path === "/settings",
  },
  {
    href: "/settings/programs",
    label: "Programs",
    icon: Sprout,
    match: (path) => path.startsWith("/settings/programs"),
  },
  {
    href: "/settings/carbon",
    label: "Carbon calculator",
    icon: Calculator,
    match: (path) => path.startsWith("/settings/carbon"),
  },
  {
    href: "/settings/audit",
    label: "Audit trail",
    icon: ScrollText,
    match: (path) => path.startsWith("/settings/audit"),
  },
  {
    href: "/settings/webhooks",
    label: "Webhooks",
    icon: Webhook,
    match: (path) => path.startsWith("/settings/webhooks"),
  },
];

export function SettingsNav() {
  const path = usePathname();
  const { user } = useAuth();

  const adminItems: NavItem[] = [];
  if (canAccessWebsiteCms(user)) {
    adminItems.push({
      href: "/platform/cms",
      label: "Website CMS",
      icon: Globe2,
      match: (p: string) => p.startsWith("/platform/cms"),
    });
  }
  if (canManagePlatformUsers(user)) {
    adminItems.push({
      href: "/platform/program-access",
      label: "Program access",
      icon: UserCheck,
      match: (p: string) => p.startsWith("/platform/program-access"),
    });
  }

  const items = [...BASE_ITEMS, ...adminItems];

  return (
    <nav aria-label="Settings sections" className="lg:w-52 lg:shrink-0">
      <ul className="flex gap-1 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible lg:pb-0">
        {items.map(({ href, label, icon: Icon, match }) => {
          const active = match ? match(path ?? "") : path === href;
          return (
            <li key={href} className="shrink-0 lg:shrink">
              <Link
                href={href}
                className={cn(
                  "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium whitespace-nowrap transition",
                  active
                    ? "bg-forest-100 text-forest-900 dark:bg-forest-950/50 dark:text-forest-200"
                    : "text-stone-600 hover:bg-stone-100 hover:text-stone-900 dark:text-stone-400 dark:hover:bg-stone-800 dark:hover:text-stone-100",
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
