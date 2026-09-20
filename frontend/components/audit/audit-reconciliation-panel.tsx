"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { GitCompare, Sparkles } from "lucide-react";
import { auditEngagements, errorMessage } from "@/lib/api";
import { AuditExplainResult } from "@/components/audit/audit-explain-result";
import { AuditEvidenceGraphPanel } from "@/components/audit/audit-evidence-graph-panel";
import { AuditLockedSection } from "@/components/audit/audit-locked-section";
import { AuditPanelShell } from "@/components/audit/audit-panel-shell";
import { cn } from "@/lib/cn";

const GRADE_STYLES: Record<string, string> = {
  green: "bg-emerald-100 text-emerald-800 ring-emerald-300",
  amber: "bg-amber-100 text-amber-900 ring-amber-300",
  red: "bg-rose-100 text-rose-800 ring-rose-300",
  grey: "bg-stone-100 text-stone-600 ring-stone-300",
};

const STATUS_STYLES: Record<string, string> = {
  aligned: "text-emerald-700",
  mismatch: "text-rose-700",
  no_field_data: "text-amber-700",
  confidence_missing: "text-stone-500",
};

type ReconciliationBlock = {
  boundary_version_id: string;
  boundary_name?: string | null;
  confidence_grade?: string | null;
  confidence_score?: number | null;
  field_grade?: string | null;
  visit_count: number;
  reconciliation: string;
  aligned?: boolean | null;
};

export function AuditReconciliationPanel({
  engagementId,
  engagementStatus,
}: {
  engagementId: string;
  engagementStatus: string;
}) {
  const t = useTranslations("auditReconciliation");
  const qc = useQueryClient();
  const [explainBoundaryId, setExplainBoundaryId] = useState<string | null>(null);

  const unlocked =
    engagementStatus === "sampling_planned" ||
    engagementStatus === "field_verified" ||
    engagementStatus === "export_ready" ||
    engagementStatus === "under_review" ||
    engagementStatus === "attested";

  const { data, isLoading } = useQuery({
    queryKey: ["audit-reconciliation", engagementId],
    queryFn: () => auditEngagements.getReconciliation(engagementId),
    enabled: unlocked,
  });

  const compute = useMutation({
    mutationFn: () => auditEngagements.computeReconciliation(engagementId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["audit-reconciliation", engagementId] });
      void qc.invalidateQueries({ queryKey: ["audit-export-readiness", engagementId] });
    },
  });

  const explainAll = useMutation({
    mutationFn: () => auditEngagements.explainReconciliation(engagementId),
  });

  const explainBlock = useMutation({
    mutationFn: (boundaryVersionId: string) =>
      auditEngagements.explainReconciliation(engagementId, boundaryVersionId),
    onSuccess: () => setExplainBoundaryId(null),
  });

  if (!unlocked) {
    return <AuditLockedSection title={t("title")} message={t("fieldRequired")} />;
  }

  if (isLoading) {
    return <p className="text-sm text-stone-500">{t("loading")}</p>;
  }

  const blocks = (data?.blocks ?? []) as ReconciliationBlock[];
  const lastComputedAt = compute.data?.computed_at;

  return (
    <div className="space-y-6">
      <AuditPanelShell icon={GitCompare} title={t("title")} subtitle={t("subtitle")}>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            className="btn-primary text-sm"
            disabled={compute.isPending || engagementStatus === "attested"}
            onClick={() => compute.mutate()}
          >
            {compute.isPending ? t("computing") : t("compute")}
          </button>
          <button
            type="button"
            className="btn-secondary inline-flex items-center gap-2 text-sm"
            disabled={explainAll.isPending || blocks.length === 0}
            onClick={() => explainAll.mutate()}
          >
            <Sparkles className="h-4 w-4" aria-hidden />
            {explainAll.isPending ? t("explaining") : t("explainAll")}
          </button>
          {lastComputedAt ? (
            <span className="text-xs text-stone-500">
              {t("lastComputed", { time: new Date(lastComputedAt).toLocaleString() })}
            </span>
          ) : null}
          {compute.isError ? (
            <p className="text-sm text-rose-700">{errorMessage(compute.error)}</p>
          ) : null}
        </div>

        {explainAll.data ? <AuditExplainResult run={explainAll.data} className="mt-4" /> : null}
        {explainAll.isError ? (
          <p className="text-sm text-rose-700">{errorMessage(explainAll.error)}</p>
        ) : null}

        {data && (
          <div className="flex flex-wrap gap-2 text-xs">
            <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-emerald-800 ring-1 ring-emerald-200">
              {t("aligned", { count: data.aligned_count })}
            </span>
            <span className="rounded-full bg-rose-50 px-2.5 py-1 text-rose-800 ring-1 ring-rose-200">
              {t("mismatch", { count: data.mismatch_count })}
            </span>
            <span className="rounded-full bg-amber-50 px-2.5 py-1 text-amber-900 ring-1 ring-amber-200">
              {t("noField", { count: data.no_field_data_count })}
            </span>
          </div>
        )}

        {blocks.length === 0 ? (
          <p className="text-sm text-stone-500">{t("noBlocks")}</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-stone-200 dark:border-stone-700">
            <table className="min-w-full text-sm">
              <thead className="bg-stone-50 text-left text-xs uppercase text-stone-500 dark:bg-stone-900">
                <tr>
                  <th className="px-3 py-2">{t("block")}</th>
                  <th className="px-3 py-2">{t("satellite")}</th>
                  <th className="px-3 py-2">{t("field")}</th>
                  <th className="px-3 py-2">{t("visits")}</th>
                  <th className="px-3 py-2">{t("status")}</th>
                  <th className="px-3 py-2" />
                </tr>
              </thead>
              <tbody>
                {blocks.map((block) => (
                  <tr
                    key={block.boundary_version_id}
                    className="border-t border-stone-100 dark:border-stone-800"
                  >
                    <td className="px-3 py-2 font-medium">{block.boundary_name}</td>
                    <td className="px-3 py-2">
                      {block.confidence_grade ? (
                        <span
                          className={cn(
                            "rounded-full px-2 py-0.5 text-xs ring-1",
                            GRADE_STYLES[block.confidence_grade] ?? GRADE_STYLES.grey,
                          )}
                        >
                          {block.confidence_grade}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-3 py-2">
                      {block.field_grade ? (
                        <span
                          className={cn(
                            "rounded-full px-2 py-0.5 text-xs ring-1",
                            GRADE_STYLES[block.field_grade] ?? GRADE_STYLES.grey,
                          )}
                        >
                          {block.field_grade}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-3 py-2 text-stone-600">{block.visit_count}</td>
                    <td
                      className={cn(
                        "px-3 py-2 text-xs font-medium capitalize",
                        STATUS_STYLES[block.reconciliation] ?? "text-stone-600",
                      )}
                    >
                      {block.reconciliation.replaceAll("_", " ")}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <button
                        type="button"
                        className="text-xs text-forest-700 hover:underline dark:text-forest-300"
                        disabled={
                          explainBlock.isPending &&
                          explainBoundaryId === block.boundary_version_id
                        }
                        onClick={() => {
                          setExplainBoundaryId(block.boundary_version_id);
                          explainBlock.mutate(block.boundary_version_id);
                        }}
                      >
                        {t("explainBlock")}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {explainBlock.data && explainBoundaryId ? (
          <AuditExplainResult run={explainBlock.data} className="mt-4" />
        ) : null}
        {explainBlock.isError ? (
          <p className="text-sm text-rose-700">{errorMessage(explainBlock.error)}</p>
        ) : null}
      </AuditPanelShell>

      <AuditEvidenceGraphPanel engagementId={engagementId} engagementStatus={engagementStatus} />
    </div>
  );
}
