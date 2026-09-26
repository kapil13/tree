"use client";

import { useTranslations } from "next-intl";
import {
  AlertTriangle,
  Bug,
  ClipboardCheck,
  Download,
  Link2,
  ListChecks,
  Shield,
  TrendingDown,
  Wind,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/cn";

export type ComplianceSection =
  | "overview"
  | "checklist"
  | "safeguards"
  | "integrity"
  | "emissions"
  | "pest_intel"
  | "exports"
  | "share"
  | "issues";

type SectionDef = {
  id: ComplianceSection;
  labelKey: string;
  shortLabelKey: string;
  icon: LucideIcon;
  badge?: number;
};

export function complianceSectionDefs(
  openViolations: number,
  showPestIntel = false,
  monitoringMode = false,
): SectionDef[] {
  if (monitoringMode) {
    const sections: SectionDef[] = [
      { id: "checklist", labelKey: "sectionChecklistMonitoring", shortLabelKey: "sectionChecklistShort", icon: ClipboardCheck },
    ];
    if (showPestIntel) {
      sections.push({
        id: "pest_intel",
        labelKey: "sectionPestIntel",
        shortLabelKey: "sectionPestIntelShort",
        icon: Bug,
      });
    }
    sections.push(
      { id: "exports", labelKey: "sectionExports", shortLabelKey: "sectionExportsShort", icon: Download },
      { id: "share", labelKey: "sectionShare", shortLabelKey: "sectionShareShort", icon: Link2 },
      {
        id: "issues",
        labelKey: "sectionIssues",
        shortLabelKey: "sectionIssuesShort",
        icon: AlertTriangle,
        badge: openViolations > 0 ? openViolations : undefined,
      },
    );
    return sections;
  }

  const sections: SectionDef[] = [
    { id: "overview", labelKey: "sectionOverview", shortLabelKey: "sectionOverviewShort", icon: ListChecks },
    { id: "checklist", labelKey: "sectionChecklist", shortLabelKey: "sectionChecklistShort", icon: ClipboardCheck },
    { id: "safeguards", labelKey: "sectionSafeguards", shortLabelKey: "sectionSafeguardsShort", icon: Shield },
    { id: "integrity", labelKey: "sectionIntegrity", shortLabelKey: "sectionIntegrityShort", icon: TrendingDown },
    { id: "emissions", labelKey: "sectionEmissions", shortLabelKey: "sectionEmissionsShort", icon: Wind },
  ];
  if (showPestIntel) {
    sections.push({
      id: "pest_intel",
      labelKey: "sectionPestIntel",
      shortLabelKey: "sectionPestIntelShort",
      icon: Bug,
    });
  }
  sections.push(
    { id: "exports", labelKey: "sectionExports", shortLabelKey: "sectionExportsShort", icon: Download },
    { id: "share", labelKey: "sectionShare", shortLabelKey: "sectionShareShort", icon: Link2 },
    {
      id: "issues",
      labelKey: "sectionIssues",
      shortLabelKey: "sectionIssuesShort",
      icon: AlertTriangle,
      badge: openViolations > 0 ? openViolations : undefined,
    },
  );
  return sections;
}

export function ProjectComplianceSectionNav({
  active,
  onChange,
  openViolations = 0,
  showPestIntel = false,
  monitoringMode = false,
}: {
  active: ComplianceSection;
  onChange: (section: ComplianceSection) => void;
  openViolations?: number;
  showPestIntel?: boolean;
  monitoringMode?: boolean;
}) {
  const t = useTranslations("projectCompliance");
  const sections = complianceSectionDefs(openViolations, showPestIntel, monitoringMode);

  return (
    <nav aria-label={t("sectionsAria")} className="space-y-3">
      {/* Mobile: horizontal scroll */}
      <div
        className="flex gap-1 overflow-x-auto rounded-xl border border-stone-200 bg-stone-100/80 p-1 md:hidden [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        role="tablist"
      >
        {sections.map((item) => (
          <SectionTab
            key={item.id}
            item={item}
            label={t(item.labelKey)}
            shortLabel={t(item.shortLabelKey)}
            active={active === item.id}
            compact
            onSelect={() => onChange(item.id)}
          />
        ))}
      </div>

      {/* Desktop: vertical sidebar */}
      <div
        className="hidden flex-col gap-0.5 rounded-xl border border-stone-200 bg-stone-50/80 p-1.5 md:flex"
        role="tablist"
      >
        {sections.map((item) => (
          <SectionTab
            key={item.id}
            item={item}
            label={t(item.labelKey)}
            shortLabel={t(item.shortLabelKey)}
            active={active === item.id}
            onSelect={() => onChange(item.id)}
          />
        ))}
      </div>
    </nav>
  );
}

function SectionTab({
  item,
  label,
  shortLabel,
  active,
  compact = false,
  onSelect,
}: {
  item: SectionDef;
  label: string;
  shortLabel: string;
  active: boolean;
  compact?: boolean;
  onSelect: () => void;
}) {
  const Icon = item.icon;

  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onSelect}
      className={cn(
        "inline-flex shrink-0 items-center gap-2 font-medium transition-colors",
        compact
          ? "rounded-lg px-3 py-1.5 text-xs"
          : "w-full rounded-lg px-3 py-2.5 text-left text-sm",
        active
          ? "bg-white text-forest-900 shadow-sm ring-1 ring-stone-200/80"
          : compact
            ? "text-stone-600 hover:text-stone-900"
            : "text-stone-600 hover:bg-white/70 hover:text-stone-900",
      )}
    >
      <Icon
        className={cn("shrink-0", compact ? "h-3.5 w-3.5" : "h-4 w-4", active && "text-forest-700")}
        aria-hidden
      />
      <span className={cn("whitespace-nowrap", !compact && "flex-1")}>
        {compact ? shortLabel : label}
      </span>
      {item.badge != null && item.badge > 0 ? (
        <span
          className={cn(
            "inline-flex min-w-[1.25rem] items-center justify-center rounded-full bg-rose-100 font-semibold text-rose-800 ring-1 ring-rose-200",
            compact ? "px-1.5 py-0.5 text-[10px]" : "px-1.5 py-0.5 text-[11px]",
          )}
        >
          {item.badge}
        </span>
      ) : null}
    </button>
  );
}
