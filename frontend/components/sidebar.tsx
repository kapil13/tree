"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import {
  BarChart3,
  Bell,
  ChevronDown,
  CloudOff,
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
import { LanguageSwitcher } from "@/components/settings/language-switcher";
import { useAuth } from "@/lib/auth-store";
import type { User } from "@/lib/api";
import { canSeeNavItem, type NavAudience } from "@/lib/nav-access";
import { hasAnyPlatformAccess } from "@/lib/platform-access";
import {
  isOrgFeatureEnabled,
  useOrgFeatureFlagMap,
  type OrgFeatureFlagKey,
} from "@/lib/use-org-feature-flags";
import { cn } from "@/lib/cn";

export type NavItem = {
  href: string;
  labelKey: string;
  icon: LucideIcon;
  audience?: NavAudience | NavAudience[];
  excludeViewers?: boolean;
  exact?: boolean;
  featureFlag?: OrgFeatureFlagKey;
  children?: NavItem[];
};

type NavGroup = {
  id: string;
  labelKey?: string;
  descKey?: string;
  hideHeader?: boolean;
  items: NavItem[];
};

/** Plantation lifecycle: overview → field work → intelligence → reports → account */
const NAV_GROUPS: NavGroup[] = [
  {
    id: "overview",
    hideHeader: true,
    items: [
      { href: "/dashboard", labelKey: "dashboard", icon: BarChart3, audience: "all", exact: true },
      { href: "/stewardship", labelKey: "stewardship", icon: Heart, audience: "byot", exact: true },
    ],
  },
  {
    id: "plantation",
    labelKey: "sectionPlantation",
    descKey: "sectionPlantationDesc",
    items: [
      {
        href: "/projects",
        labelKey: "projects",
        icon: FolderKanban,
        audience: ["professional", "field_supervisor", "field_worker"],
      },
      { href: "/trees", labelKey: "trees", icon: TreePine, audience: "all", exact: true },
      { href: "/map", labelKey: "map", icon: Map, audience: "all" },
      {
        href: "/field-ops",
        labelKey: "fieldOps",
        icon: ClipboardList,
        audience: ["professional", "field_supervisor"],
        excludeViewers: true,
      },
      {
        href: "/field-ops/offline-trees",
        labelKey: "offlineTrees",
        icon: CloudOff,
        audience: ["professional", "field_supervisor"],
        excludeViewers: true,
      },
    ],
  },
  {
    id: "intelligence",
    labelKey: "sectionIntelligence",
    descKey: "sectionIntelligenceDesc",
    items: [
      {
        href: "/portfolio-health",
        labelKey: "portfolioHealth",
        icon: Activity,
        audience: ["professional", "field_supervisor"],
        exact: true,
        featureFlag: "satellite",
      },
      {
        href: "/satellite",
        labelKey: "satellite",
        icon: Satellite,
        audience: ["professional", "field_supervisor"],
        featureFlag: "satellite",
      },
      { href: "/bioacoustic", labelKey: "biodiversity", icon: Mic, audience: "professional", featureFlag: "bioacoustic" },
      { href: "/alerts", labelKey: "alerts", icon: Bell, audience: "all" },
    ],
  },
  {
    id: "reports",
    labelKey: "sectionReports",
    descKey: "sectionReportsDesc",
    items: [
      {
        href: "/reports",
        labelKey: "reports",
        icon: FileText,
        audience: ["professional", "field_supervisor"],
        featureFlag: "reports",
        children: [
          {
            href: "/reports",
            labelKey: "reportComplianceExports",
            icon: FileText,
            audience: ["professional", "field_supervisor"],
            exact: true,
          },
          {
            href: "/reports/plantation/project-wise",
            labelKey: "reportProjectWise",
            icon: FileText,
            audience: ["professional", "field_supervisor"],
          },
          {
            href: "/reports/plantation/fy-wise",
            labelKey: "reportFyWise",
            icon: FileText,
            audience: ["professional", "field_supervisor"],
          },
          {
            href: "/reports/plantation/re-geotag",
            labelKey: "reportReGeotag",
            icon: FileText,
            audience: ["professional", "field_supervisor"],
          },
          {
            href: "/reports/plantation/total-records",
            labelKey: "reportTotalRecords",
            icon: FileText,
            audience: ["professional", "field_supervisor"],
          },
          {
            href: "/reports/plantation/species-wise",
            labelKey: "reportSpeciesWise",
            icon: FileText,
            audience: ["professional", "field_supervisor"],
          },
          {
            href: "/reports/plantation/work-area",
            labelKey: "reportWorkArea",
            icon: FileText,
            audience: ["professional", "field_supervisor"],
          },
          {
            href: "/reports/plantation/survival-mortality",
            labelKey: "reportSurvivalMortality",
            icon: FileText,
            audience: ["professional", "field_supervisor"],
          },
          {
            href: "/reports/plantation/compliance-violations",
            labelKey: "reportComplianceViolations",
            icon: FileText,
            audience: ["professional", "field_supervisor"],
          },
          {
            href: "/reports/plantation/satellite-health",
            labelKey: "reportSatelliteHealth",
            icon: FileText,
            audience: ["professional", "field_supervisor"],
          },
          {
            href: "/reports/plantation/scheme-kpi",
            labelKey: "reportSchemeKpi",
            icon: FileText,
            audience: ["professional", "field_supervisor"],
          },
          {
            href: "/reports/plantation/field-team",
            labelKey: "reportFieldTeam",
            icon: FileText,
            audience: ["professional", "field_supervisor"],
          },
          {
            href: "/reports/plantation/carbon-stock",
            labelKey: "reportCarbonStock",
            icon: FileText,
            audience: ["professional", "field_supervisor"],
          },
          {
            href: "/reports/plantation/photo-evidence",
            labelKey: "reportPhotoEvidence",
            icon: FileText,
            audience: ["professional", "field_supervisor"],
          },
          {
            href: "/reports/plantation/district-block",
            labelKey: "reportDistrictBlock",
            icon: FileText,
            audience: ["professional", "field_supervisor"],
          },
          {
            href: "/reports/plantation/pending-registration",
            labelKey: "reportPendingRegistration",
            icon: FileText,
            audience: ["professional", "field_supervisor"],
          },
          {
            href: "/reports/plantation/out-of-fence",
            labelKey: "reportOutOfFence",
            icon: FileText,
            audience: ["professional", "field_supervisor"],
          },
        ],
      },
      { href: "/assistant", labelKey: "aiAssistant", icon: Sparkles, audience: "all", featureFlag: "ai_scan" },
    ],
  },
  {
    id: "account",
    hideHeader: true,
    items: [{ href: "/settings", labelKey: "settings", icon: Settings, audience: "all" }],
  },
];

function isActive(path: string | null, item: NavItem): boolean {
  if (!path) return false;
  if (item.children?.some((child) => isActive(path, child))) return true;
  if (item.exact) return path === item.href;
  if (item.href === "/dashboard") return path === "/dashboard";
  if (item.href === "/portfolio-health") return path === "/portfolio-health";
  if (item.href === "/trees") {
    return path === "/trees" || (path.startsWith("/trees/") && !path.startsWith("/trees/new"));
  }
  return path === item.href || path.startsWith(`${item.href}/`);
}

function NavItemLink({
  item,
  active,
  onNavigate,
  nested,
}: {
  item: NavItem;
  active: boolean;
  onNavigate?: () => void;
  nested?: boolean;
}) {
  const t = useTranslations("nav");
  const tReports = useTranslations("plantationReports");
  const label =
    item.labelKey.startsWith("report") &&
    (item.href.startsWith("/reports/plantation") || item.href === "/reports")
      ? tReports(item.labelKey as never)
      : t(item.labelKey);
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      title={label}
      className={cn(
        "flex items-center gap-3 rounded-lg py-2 text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest-600",
        nested ? "pl-9 pr-3" : "px-3",
        active
          ? "bg-forest-100 text-forest-800 dark:bg-forest-950/50 dark:text-forest-200"
          : "text-stone-600 hover:bg-stone-50 hover:text-stone-900 dark:text-stone-300 dark:hover:bg-stone-900 dark:hover:text-stone-50",
      )}
    >
      <Icon
        className={cn(
          "h-4 w-4 shrink-0",
          active ? "text-forest-700 dark:text-forest-300" : "text-stone-400",
        )}
        aria-hidden
      />
      {label}
    </Link>
  );
}

function ReportsNavDropdown({
  item,
  path,
  onNavigate,
}: {
  item: NavItem;
  path: string | null;
  onNavigate?: () => void;
}) {
  const t = useTranslations("nav");
  const children = item.children ?? [];
  const sectionActive = isActive(path, item);
  const [open, setOpen] = useState(sectionActive);

  useEffect(() => {
    if (sectionActive) setOpen(true);
  }, [sectionActive]);

  const parentActive = path === item.href;

  return (
    <div>
      <div className="flex items-center gap-0.5">
        <Link
          href={item.href}
          onClick={onNavigate}
          aria-current={parentActive ? "page" : undefined}
          className={cn(
            "flex min-w-0 flex-1 items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
            parentActive
              ? "bg-forest-100 text-forest-800 dark:bg-forest-950/50 dark:text-forest-200"
              : sectionActive
                ? "text-forest-800 dark:text-forest-200"
                : "text-stone-600 hover:bg-stone-50 hover:text-stone-900 dark:text-stone-300 dark:hover:bg-stone-900 dark:hover:text-stone-50",
          )}
        >
          <item.icon
            className={cn(
              "h-4 w-4 shrink-0",
              sectionActive ? "text-forest-700 dark:text-forest-300" : "text-stone-400",
            )}
            aria-hidden
          />
          <span className="truncate">{t(item.labelKey)}</span>
        </Link>
        <button
          type="button"
          aria-expanded={open}
          aria-label={t("reportsMenuToggle")}
          onClick={() => setOpen((value) => !value)}
          className="rounded-lg p-2 text-stone-400 hover:bg-stone-50 hover:text-stone-700 dark:hover:bg-stone-900"
        >
          <ChevronDown className={cn("h-4 w-4 transition-transform", open && "rotate-180")} />
        </button>
      </div>
      {open ? (
        <div className="mt-0.5 space-y-0.5">
          {children.map((child) => (
            <NavItemLink
              key={child.href}
              item={child}
              active={isActive(path, child)}
              onNavigate={onNavigate}
              nested
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function filterNavTree(
  items: NavItem[],
  user: User | null,
  flags: ReturnType<typeof useOrgFeatureFlagMap>["flags"],
  inheritedFlag?: OrgFeatureFlagKey,
): NavItem[] {
  const out: NavItem[] = [];
  for (const item of items) {
    if (!canSeeNavItem(user, item.audience ?? "all", { excludeViewers: item.excludeViewers })) {
      continue;
    }
    const flag = item.featureFlag ?? inheritedFlag;
    if (flag && !isOrgFeatureEnabled(flags, flag)) {
      continue;
    }
    if (item.children?.length) {
      const children = filterNavTree(item.children, user, flags, flag);
      if (children.length === 0) continue;
      out.push({ ...item, children });
      continue;
    }
    out.push(item);
  }
  return out;
}

export function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const path = usePathname();
  const { user } = useAuth();
  const { flags } = useOrgFeatureFlagMap();
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
    items: filterNavTree(group.items, user, flags),
  })).filter((group) => group.items.length > 0);

  if (adminItems.length) {
    groups.push({ id: "admin", labelKey: "platformAdmin", hideHeader: true, items: adminItems });
  }

  return (
    <nav className="space-y-1" aria-label={t("home")}>
      {groups.map((group, groupIndex) => (
        <div
          key={group.id}
          className={cn(
            groupIndex > 0 && "pt-3",
            group.id === "account" && "mt-2 border-t border-stone-200 pt-3 dark:border-stone-800",
          )}
        >
          {!group.hideHeader && group.labelKey ? (
            <div className="mb-2 px-3">
              <p className="text-xs font-semibold text-stone-700 dark:text-stone-200">
                {t(group.labelKey)}
              </p>
              {group.descKey ? (
                <p className="mt-0.5 text-[11px] leading-snug text-stone-400">{t(group.descKey)}</p>
              ) : null}
            </div>
          ) : null}
          <div className="space-y-0.5">
            {group.items.map((item) => {
              if (item.children?.length) {
                return (
                  <ReportsNavDropdown
                    key={item.href}
                    item={item}
                    path={path}
                    onNavigate={onNavigate}
                  />
                );
              }
              const active = isActive(path, item);
              return (
                <NavItemLink
                  key={item.href}
                  item={item}
                  active={active}
                  onNavigate={onNavigate}
                />
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
    <aside className="hidden w-60 shrink-0 flex-col border-r border-stone-200 bg-white dark:border-stone-800 dark:bg-stone-950 md:flex md:max-h-screen">
      <div className="shrink-0 p-4 pb-0">
        <Link href="/dashboard" className="mb-6 flex items-center gap-2.5">
          <AranyixMark className="h-8 w-8 shrink-0" />
          <div className="min-w-0">
            <div className="text-base font-bold leading-tight text-forest-900">Aranyix</div>
            <div className="truncate text-[10px] font-medium text-stone-400">
              Environmental intelligence platform
            </div>
          </div>
        </Link>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-4">
        <NavLinks />
      </div>
      <div className="shrink-0 border-t border-stone-100 p-4 pt-4 dark:border-stone-800">
        <LanguageSwitcher variant="compact" />
      </div>
    </aside>
  );
}
