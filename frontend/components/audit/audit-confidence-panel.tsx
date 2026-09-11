"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { Grid3x3, Map } from "lucide-react";
import { auditEngagements, errorMessage } from "@/lib/api";
import { AuditConfidenceMap } from "@/components/audit/audit-confidence-map";
import { AuditLockedSection } from "@/components/audit/audit-locked-section";
import { type AuditBoundary } from "@/lib/audit-field-visit";
import { cn } from "@/lib/cn";

const GRADE_STYLES: Record<string, string> = {
  green: "bg-emerald-100 text-emerald-800 ring-emerald-300",
  amber: "bg-amber-100 text-amber-900 ring-amber-300",
  red: "bg-rose-100 text-rose-800 ring-rose-300",
  grey: "bg-stone-100 text-stone-600 ring-stone-300",
};

const GRADE_DOT: Record<string, string> = {
  green: "bg-emerald-500",
  amber: "bg-amber-500",
  red: "bg-rose-500",
  grey: "bg-stone-400",
};

const GRADE_EMOJI: Record<string, string> = {
  green: "🟢",
  amber: "🟡",
  red: "🔴",
  grey: "⚪",
};

type ConfidenceBlock = {
  id: string;
  boundary_version_id?: string;
  boundary_name?: string | null;
  confidence_grade: string;
  confidence_score: number;
  summary: string;
  epistemic_label?: string;
  grid_cells?: Array<{ row: number; col: number; grade: string }>;
};

export function AuditConfidencePanel({
  engagementId,
  engagementStatus,
  boundaries = [],
}: {
  engagementId: string;
  engagementStatus: string;
  boundaries?: AuditBoundary[];
}) {
  const t = useTranslations("auditConfidence");
  const qc = useQueryClient();

  const showReconciliation =
    engagementStatus === "sampling_planned" ||
    engagementStatus === "field_verified" ||
    engagementStatus === "export_ready" ||
    engagementStatus === "under_review" ||
    engagementStatus === "attested";

  const { data: reconciliation } = useQuery({
    queryKey: ["audit-reconciliation", engagementId],
    queryFn: () => auditEngagements.getReconciliation(engagementId),
    enabled: showReconciliation,
  });

  const { data, isLoading } = useQuery({
    queryKey: ["audit-confidence-map", engagementId],
    queryFn: () => auditEngagements.getConfidenceMap(engagementId),
    enabled:
      engagementStatus === "analysis_ready" ||
      engagementStatus === "confidence_mapped" ||
      engagementStatus === "risk_assessed" ||
      engagementStatus === "sampling_planned" ||
      engagementStatus === "field_verified" ||
      engagementStatus === "export_ready" ||
      engagementStatus === "under_review" ||
      engagementStatus === "attested",
  });

  const compute = useMutation({
    mutationFn: (includeFieldSignals: boolean = false) => {
      return auditEngagements.computeConfidenceMap(engagementId, { includeFieldSignals });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["audit-confidence-map", engagementId] });
      qc.invalidateQueries({ queryKey: ["audit-reconciliation", engagementId] });
      qc.invalidateQueries({ queryKey: ["audit-export-readiness", engagementId] });
      qc.invalidateQueries({ queryKey: ["audit-engagement"] });
    },
  });

  const canComputeInitial = engagementStatus === "analysis_ready";
  const canRefreshWithField =
    engagementStatus === "sampling_planned" ||
    engagementStatus === "field_verified" ||
    engagementStatus === "export_ready";

  const unlocked =
    engagementStatus === "analysis_ready" ||
    engagementStatus === "confidence_mapped" ||
    engagementStatus === "risk_assessed" ||
    engagementStatus === "sampling_planned" ||
    engagementStatus === "field_verified" ||
    engagementStatus === "export_ready" ||
    engagementStatus === "under_review" ||
    engagementStatus === "attested";

  if (!unlocked) {
    return <AuditLockedSection title={t("title")} message={t("analysisRequired")} />;
  }

  if (isLoading) {
    return <p className="text-sm text-stone-500">{t("loading")}</p>;
  }

  const blocks = (data?.blocks ?? []) as ConfidenceBlock[];
  const gradeCounts = data?.grade_counts ?? {};

  return (
    <section className="space-y-6">
      <header className="space-y-2">
        <div className="flex flex-wrap items-center gap-3">
          <Map className="h-6 w-6 text-forest-700" aria-hidden />
          <h2 className="text-lg font-semibold text-stone-900 dark:text-stone-100">
            {t("title")}
          </h2>
          {engagementStatus === "confidence_mapped" && (
            <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-800 ring-1 ring-emerald-200">
              {t("statusMapped")}
            </span>
          )}
        </div>
        <p className="text-sm text-stone-600 dark:text-stone-400">{t("subtitle")}</p>
        <p className="text-xs text-stone-500">{t("epistemicNote")}</p>
      </header>

      {boundaries.length > 0 && blocks.length > 0 && (
        <AuditConfidenceMap
          boundaries={boundaries}
          blocks={blocks}
          reconciliationBlocks={reconciliation?.blocks ?? []}
        />
      )}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          className="btn-primary text-sm"
          disabled={compute.isPending || !canComputeInitial}
          onClick={() => compute.mutate(false)}
        >
          {t("compute")}
        </button>
        {canRefreshWithField && (
          <button
            type="button"
            className="btn-secondary text-sm"
            disabled={compute.isPending}
            onClick={() => compute.mutate(true)}
          >
            {t("refreshWithField")}
          </button>
        )}
        {compute.isError && (
          <p className="text-sm text-rose-700">{errorMessage(compute.error)}</p>
        )}
        {Object.keys(gradeCounts).length > 0 && (
          <div className="flex flex-wrap gap-2 text-xs">
            {(["green", "amber", "red", "grey"] as const).map((g) =>
              gradeCounts[g] ? (
                <span key={g} className={cn("rounded-full px-2 py-0.5 ring-1", GRADE_STYLES[g])}>
                  {GRADE_EMOJI[g]} {gradeCounts[g]}
                </span>
              ) : null,
            )}
          </div>
        )}
      </div>

      <div className="space-y-4">
        {blocks.length === 0 ? (
          <p className="text-sm text-stone-500">{t("noBlocks")}</p>
        ) : (
          blocks.map((block) => (
            <article
              key={block.id}
              className="rounded-xl border border-stone-200 p-4 dark:border-stone-700"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="font-medium text-stone-900 dark:text-stone-100">
                    {GRADE_EMOJI[block.confidence_grade] ?? "⚪"} {block.boundary_name}
                  </h3>
                  <p className="mt-1 text-sm text-stone-600">{block.summary}</p>
                  <p className="mt-1 text-xs text-stone-400">
                    {t("score", { score: block.confidence_score })} · {block.epistemic_label}
                  </p>
                </div>
                <span
                  className={cn(
                    "shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold uppercase ring-1",
                    GRADE_STYLES[block.confidence_grade] ?? GRADE_STYLES.grey,
                  )}
                >
                  {block.confidence_grade}
                </span>
              </div>
              {block.grid_cells && block.grid_cells.length > 0 && (
                <div className="mt-4">
                  <p className="mb-2 flex items-center gap-1.5 text-xs font-medium text-stone-500">
                    <Grid3x3 className="h-3.5 w-3.5" aria-hidden />
                    {t("gridPreview")}
                  </p>
                  <div className="inline-grid grid-cols-3 gap-1">
                    {block.grid_cells
                      .sort((a, b) => a.row * 3 + a.col - (b.row * 3 + b.col))
                      .map((cell) => (
                        <div
                          key={`${cell.row}-${cell.col}`}
                          className={cn(
                            "h-8 w-8 rounded ring-1 ring-inset ring-black/10",
                            GRADE_DOT[cell.grade] ?? GRADE_DOT.grey,
                          )}
                          title={`${cell.grade} zone ${cell.row},${cell.col}`}
                        />
                      ))}
                  </div>
                </div>
              )}
            </article>
          ))
        )}
      </div>
    </section>
  );
}
