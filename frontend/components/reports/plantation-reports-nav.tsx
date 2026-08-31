"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { CalendarRange, FolderTree, MapPin, Trees } from "lucide-react";
import { cn } from "@/lib/cn";

const ITEMS = [
  {
    href: "/reports/plantation/project-wise",
    labelKey: "reportProjectWise",
    icon: FolderTree,
  },
  {
    href: "/reports/plantation/fy-wise",
    labelKey: "reportFyWise",
    icon: CalendarRange,
  },
  {
    href: "/reports/plantation/re-geotag",
    labelKey: "reportReGeotag",
    icon: MapPin,
  },
  {
    href: "/reports/plantation/total-records",
    labelKey: "reportTotalRecords",
    icon: Trees,
  },
] as const;

export function PlantationReportsNav() {
  const path = usePathname();
  const t = useTranslations("plantationReports");

  return (
    <nav
      aria-label={t("navLabel")}
      className="flex gap-1 overflow-x-auto border-b border-stone-200 pb-px dark:border-stone-800 md:flex-col md:overflow-visible md:border-b-0 md:border-r md:pr-4"
    >
      {ITEMS.map(({ href, labelKey, icon: Icon }) => {
        const active = path === href;
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-forest-100 text-forest-800 dark:bg-forest-950/50 dark:text-forest-200"
                : "text-stone-600 hover:bg-stone-50 hover:text-stone-900 dark:text-stone-300 dark:hover:bg-stone-900",
            )}
          >
            <Icon className="h-4 w-4 shrink-0" aria-hidden />
            {t(labelKey)}
          </Link>
        );
      })}
    </nav>
  );
}
