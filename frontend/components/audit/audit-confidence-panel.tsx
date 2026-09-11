"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { Grid3x3, Map, MapPin } from "lucide-react";
import { auditEngagements, errorMessage } from "@/lib/api";
import { AuditConfidenceMap } from "@/components/audit/audit-confidence-map";
import { AuditLockedSection } from "@/components/audit/audit-locked-section";
import { AuditPanelShell } from "@/components/audit/audit-panel-shell";
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

const GRADE_LABEL: Record<string, string> = {
  green: "Plausible",
  amber: "Uncertain",
  red: "Inconsistent",
  grey: "No data",
};

function GradeBadge({ grade, count }: { grade: string; count?: number }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ring-1",
        GRADE_STYLES[grade] ?? GRADE_STYLES.grey,
      )}
    >
      <span
        className={cn("h-2 w-2 shrink-0 rounded-full", GRADE_DOT[grade] ?? GRADE_DOT.grey)}
        aria-hidden
      />
      {GRADE_LABEL[grade] ?? grade}
      {count != null ? ` · ${count}` : null}
    </span>
  );
}

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
    <AuditPanelShell
      icon={Map}
      title={t("title")}
      subtitle={t("subtitle")}
      epistemicNote={t("epistemicNote")}
      statusBadge={
        engagementStatus === "confidence_mapped" ? (
          <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-800 ring-1 ring-emerald-200">
            {t("statusMapped")}
          </span>
        ) : undefined
      }
    >
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
          <div className="flex flex-wrap gap-2">
            {(["green", "amber", "red", "grey"] as const).map((g) =>
              gradeCounts[g] ? <GradeBadge key={g} grade={g} count={gradeCounts[g]} /> : null,
            )}
          </div>
        )}
      </div>

      {blocks.length === 0 ? (
        <p className="text-sm text-stone-500">{t("noBlocks")}</p>
      ) : (
        <div className="space-y-4">
          {blocks.map((block) => (
            <article
              key={block.id}
              className="rounded-xl border border-stone-200 p-4 dark:border-stone-700"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="flex items-center gap-2 font-medium text-stone-900 dark:text-stone-100">
                    <MapPin className="h-4 w-4 text-stone-400" aria-hidden />
                    {block.boundary_name}
                  </h3>
                  <p className="mt-1 text-sm text-stone-600">{block.summary}</p>
                  <p className="mt-1 text-xs text-stone-400">
                    {t("score", { score: block.confidence_score })} · {block.epistemic_label}
                  </p>
                </div>
                <GradeBadge grade={block.confidence_grade} />
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
          ))}
        </div>
      )}
    </AuditPanelShell>
  );
}
