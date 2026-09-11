"use client";

import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { GitCompare } from "lucide-react";
import { auditEngagements } from "@/lib/api";
import { AuditLockedSection } from "@/components/audit/audit-locked-section";
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

  if (!unlocked) {
    return <AuditLockedSection title={t("title")} message={t("fieldRequired")} />;
  }

  if (isLoading) {
    return <p className="text-sm text-stone-500">{t("loading")}</p>;
  }

  const blocks = (data?.blocks ?? []) as ReconciliationBlock[];

  return (
    <section className="space-y-4">
      <header className="space-y-2">
        <div className="flex flex-wrap items-center gap-3">
          <GitCompare className="h-6 w-6 text-forest-700" aria-hidden />
          <h2 className="text-lg font-semibold text-stone-900 dark:text-stone-100">
            {t("title")}
          </h2>
        </div>
        <p className="text-sm text-stone-600 dark:text-stone-400">{t("subtitle")}</p>
      </header>

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
              </tr>
            </thead>
            <tbody>
              {blocks.map((block) => (
                <tr key={block.boundary_version_id} className="border-t border-stone-100 dark:border-stone-800">
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
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
