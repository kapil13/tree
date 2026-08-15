"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Calculator, ClipboardCheck, CreditCard, Globe2, ScrollText, Settings2, Shield, Sprout, UserCheck, Users, Webhook } from "lucide-react";
import { useAuth } from "@/lib/auth-store";
import { isOrgAdmin, canGenerateReports } from "@/lib/nav-access";
import { canAccessWebsiteCms, canManagePlatformUsers } from "@/lib/platform-access";
import { cn } from "@/lib/cn";

type NavItem = {
  href: string;
  label: string;
  icon: typeof Settings2;
  match?: (path: string) => boolean;
};

function baseItems(showTeam: boolean, showAudit: boolean, showWebhooks: boolean): NavItem[] {
  const items: NavItem[] = [
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
      href: "/settings/billing",
      label: "Billing",
      icon: CreditCard,
      match: (path) => path.startsWith("/settings/billing"),
    },
  ];
  if (showTeam) {
    items.push({
      href: "/settings/team",
      label: "Team",
      icon: Users,
      match: (p) => p.startsWith("/settings/team"),
    });
  }
  items.push(
    {
      href: "/settings/carbon",
      label: "Carbon calculator",
      icon: Calculator,
      match: (path) => path.startsWith("/settings/carbon"),
    },
    {
      href: "/settings/privacy",
      label: "Privacy",
      icon: Shield,
      match: (path) => path.startsWith("/settings/privacy"),
    },
    {
      href: "/settings/sprint-verify",
      label: "Sprint verify",
      icon: ClipboardCheck,
      match: (path) => path.startsWith("/settings/sprint-verify"),
    },
  );
  if (showAudit) {
    items.push({
      href: "/settings/audit",
      label: "Audit trail",
      icon: ScrollText,
      match: (path) => path.startsWith("/settings/audit"),
    });
  }
  if (showWebhooks) {
    items.push({
      href: "/settings/webhooks",
      label: "Webhooks",
      icon: Webhook,
      match: (path) => path.startsWith("/settings/webhooks"),
    });
  }
  return items;
}

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

  const orgAdmin = isOrgAdmin(user);
  const items = [
    ...baseItems(orgAdmin, orgAdmin || canGenerateReports(user), orgAdmin),
    ...adminItems,
  ];

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
