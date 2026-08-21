"use client";

import Link from "next/link";
import {
  ClipboardCheck,
  Coins,
  LayoutDashboard,
  Settings2,
  Users,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/cn";
import {
  PROJECT_WORKSPACE_NAV,
  projectOverviewHref,
  projectSecondaryHref,
  type ProjectSecondaryTab,
  type ProjectWorkspaceSection,
} from "@/lib/project-focused-ui";

const SECTION_ICONS: Record<ProjectWorkspaceSection, LucideIcon> = {
  overview: LayoutDashboard,
  compliance: ClipboardCheck,
  credits: Coins,
  team: Users,
  settings: Settings2,
};

type ProjectWorkspaceNavProps = {
  projectId: string;
  active: ProjectWorkspaceSection;
  openViolations?: number;
};

export function ProjectWorkspaceNav({
  projectId,
  active,
  openViolations = 0,
}: ProjectWorkspaceNavProps) {
  return (
    <nav
      className="sticky top-0 z-20 -mx-4 border-b border-stone-200/90 bg-white/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-white/80 md:-mx-6 md:px-6 dark:border-stone-800 dark:bg-stone-950/95"
      aria-label="Project sections"
    >
      <div
        className="flex gap-0.5 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        role="tablist"
      >
        {PROJECT_WORKSPACE_NAV.map((item) => {
          const isActive = active === item.id;
          const href =
            item.id === "overview"
              ? projectOverviewHref(projectId)
              : projectSecondaryHref(projectId, item.id as ProjectSecondaryTab);
          const Icon = SECTION_ICONS[item.id];
          const showViolationBadge = item.id === "compliance" && openViolations > 0;

          return (
            <Link
              key={item.id}
              href={href}
              role="tab"
              aria-selected={isActive}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "group relative flex shrink-0 items-center gap-2 border-b-2 px-3 py-3 text-sm font-medium transition sm:px-4",
                isActive
                  ? "border-forest-600 text-forest-800 dark:text-forest-300"
                  : "border-transparent text-stone-600 hover:border-stone-300 hover:text-stone-900 dark:text-stone-400 dark:hover:border-stone-600 dark:hover:text-stone-100",
              )}
            >
              <Icon
                className={cn(
                  "h-4 w-4 shrink-0",
                  isActive
                    ? "text-forest-700 dark:text-forest-400"
                    : "text-stone-400 group-hover:text-stone-600",
                )}
                aria-hidden
              />
              <span className="whitespace-nowrap sm:hidden">{item.shortLabel}</span>
              <span className="hidden whitespace-nowrap sm:inline">{item.label}</span>
              {showViolationBadge && (
                <span
                  className="inline-flex min-w-[1.25rem] items-center justify-center rounded-full bg-rose-100 px-1.5 py-0.5 text-[10px] font-semibold leading-none text-rose-800 ring-1 ring-rose-200 dark:bg-rose-950/60 dark:text-rose-200 dark:ring-rose-900"
                  title={`${openViolations} open compliance issue${openViolations === 1 ? "" : "s"}`}
                >
                  {openViolations}
                </span>
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
