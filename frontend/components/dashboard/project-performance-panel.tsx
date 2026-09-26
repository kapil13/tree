"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import type { CompliancePortfolioSummary } from "@/lib/api";
import {
  buildProjectPerformanceRows,
  integrityBarColor,
} from "@/lib/project-performance";
import { cn } from "@/lib/cn";

type ProjectPerformancePanelProps = {
  monitoring: {
    projects?: Array<{
      id: string;
      code: string;
      name: string;
      progress_pct: number | null;
    }>;
    work_area_monitoring?: Array<{
      project_id: string | null;
      sar_forest_integrity?: number | null;
      latest_ndvi?: number | null;
      days_since_scan?: number | null;
      sar_at_risk?: boolean;
    }>;
  } | null | undefined;
  complianceSummary: CompliancePortfolioSummary | null | undefined;
  selectedProjectId?: string | null;
};

export function ProjectPerformancePanel({
  monitoring,
  complianceSummary,
  selectedProjectId,
}: ProjectPerformancePanelProps) {
  const te = useTranslations("executive");
  const rows = buildProjectPerformanceRows(monitoring, complianceSummary);

  if (rows.length === 0) {
    return null;
  }

  const maxScore = Math.max(...rows.map((row) => row.integrityScore), 1);

  return (
    <section className="cc-proj-section" aria-label={te("projectPerformance")}>
      <div className="cc-proj-head">
        <h2 className="cc-proj-title">{te("projectPerformance")}</h2>
        <p className="cc-proj-desc">{te("projectPerformanceDesc")}</p>
      </div>
      <div className="cc-proj-perf">
        {rows.map((row) => (
          <Link
            key={row.id}
            href={row.href}
            className={cn(
              "cc-proj-row",
              selectedProjectId === row.id && "cc-proj-row--selected",
            )}
          >
            <span className="cc-proj-name" title={row.name}>{row.shortName}</span>
            <div className="cc-proj-bar">
              <div
                className="cc-proj-fill"
                style={{
                  width: `${(row.integrityScore / maxScore) * 100}%`,
                  background: integrityBarColor(row.integrityScore),
                }}
              />
            </div>
            <span className="cc-proj-score">{row.integrityScore}</span>
            <span
              className={cn(
                "cc-proj-secondary",
                row.secondaryDown && "cc-proj-secondary--down",
              )}
            >
              {row.secondaryLabel === "ndvi"
                ? row.secondaryValue
                : row.secondaryLabel === "stale"
                  ? te("projectStale", { days: row.secondaryValue })
                  : row.secondaryValue}
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
