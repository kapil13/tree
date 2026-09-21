"use client";

import { useTranslations } from "next-intl";
import { MetricGrid } from "@/components/ui";
import type { AuditEngagementDetail } from "@/lib/api";
import { auditEngagementStatusLabel } from "@/lib/audit-portfolio-status";

export function AuditMetricsStrip({
  engagement,
  plotsVisited,
  plotsTotal,
  reconciliationMismatch,
}: {
  engagement: AuditEngagementDetail;
  plotsVisited?: number;
  plotsTotal?: number;
  reconciliationMismatch?: number;
}) {
  const t = useTranslations("auditWorkspace");

  const metrics = [
    {
      label: t("metricPhase"),
      value: auditEngagementStatusLabel(engagement.status),
      tone: engagement.status === "attested" ? "positive" : "default",
    },
    {
      label: t("metricBlocks"),
      value: engagement.boundary_count,
      hint: t("metricBlocksHint"),
    },
    {
      label: t("metricFieldPlots"),
      value: plotsTotal != null ? `${plotsVisited ?? 0}/${plotsTotal}` : "—",
      tone:
        plotsTotal && plotsVisited !== plotsTotal
          ? "warning"
          : plotsTotal && plotsVisited === plotsTotal
            ? "positive"
            : "default",
      hint: t("metricFieldPlotsHint"),
    },
    {
      label: t("metricReconciliation"),
      value:
        reconciliationMismatch != null && reconciliationMismatch > 0
          ? t("metricMismatchCount", { count: reconciliationMismatch })
          : reconciliationMismatch === 0
            ? t("metricAligned")
            : "—",
      tone: reconciliationMismatch && reconciliationMismatch > 0 ? "critical" : "default",
    },
  ] as const;

  return <MetricGrid metrics={[...metrics]} columns={4} />;
}
