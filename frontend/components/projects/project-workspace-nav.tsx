"use client";

import Link from "next/link";
import { cn } from "@/lib/cn";
import {
  PROJECT_SECONDARY_LABELS,
  PROJECT_SECONDARY_TABS,
  projectOverviewHref,
  projectSecondaryHref,
  type ProjectSecondaryTab,
} from "@/lib/project-focused-ui";

type ProjectWorkspaceNavProps = {
  projectId: string;
  active: "overview" | ProjectSecondaryTab;
  openViolations?: number;
  variant?: "mobile" | "footer";
};

export function ProjectWorkspaceNav({
  projectId,
  active,
  openViolations = 0,
  variant = "footer",
}: ProjectWorkspaceNavProps) {
  const complianceLabel =
    openViolations > 0
      ? `Compliance (${openViolations} open)`
      : PROJECT_SECONDARY_LABELS.compliance;

  if (variant === "mobile") {
    return (
      <nav
        className="sticky top-0 z-20 -mx-4 border-b border-stone-200 bg-white/95 px-4 py-2 backdrop-blur md:hidden dark:border-stone-800 dark:bg-stone-950/95"
        aria-label="Project sections"
      >
        <div className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <NavPill
            href={projectOverviewHref(projectId)}
            active={active === "overview"}
            label="Overview"
          />
          {PROJECT_SECONDARY_TABS.map((tab) => (
            <NavPill
              key={tab}
              href={projectSecondaryHref(projectId, tab)}
              active={active === tab}
              label={tab === "compliance" ? complianceLabel : PROJECT_SECONDARY_LABELS[tab]}
            />
          ))}
        </div>
      </nav>
    );
  }

  return (
    <nav
      className="flex flex-wrap gap-x-6 gap-y-2 border-t border-stone-200 pt-6 text-sm dark:border-stone-800"
      aria-label="Project sections"
    >
      <FooterLink
        href={projectOverviewHref(projectId)}
        active={active === "overview"}
        label="Overview"
      />
      {PROJECT_SECONDARY_TABS.map((tab) => (
        <FooterLink
          key={tab}
          href={projectSecondaryHref(projectId, tab)}
          active={active === tab}
          label={tab === "compliance" ? complianceLabel : PROJECT_SECONDARY_LABELS[tab]}
        />
      ))}
    </nav>
  );
}

function NavPill({
  href,
  active,
  label,
}: {
  href: string;
  active: boolean;
  label: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition",
        active
          ? "bg-forest-600 text-white"
          : "bg-stone-100 text-stone-700 hover:bg-stone-200 dark:bg-stone-800 dark:text-stone-200",
      )}
    >
      {label}
    </Link>
  );
}

function FooterLink({
  href,
  active,
  label,
}: {
  href: string;
  active: boolean;
  label: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "hover:text-forest-700",
        active ? "font-medium text-forest-800" : "text-stone-500",
      )}
    >
      {label}
    </Link>
  );
}
