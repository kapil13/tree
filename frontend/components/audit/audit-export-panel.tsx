"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { Archive, CheckCircle2, Download, FileText } from "lucide-react";
import { auditEngagements, errorMessage } from "@/lib/api";
import { AuditLockedSection } from "@/components/audit/audit-locked-section";
import { AuditPanelShell } from "@/components/audit/audit-panel-shell";
import { cn } from "@/lib/cn";
import { downloadBlob } from "@/lib/download-blob";

type ExportSection = {
  id: string;
  label: string;
  met: boolean;
  detail?: string | null;
};

export function AuditExportPanel({
  engagementId,
  engagementStatus,
}: {
  engagementId: string;
  engagementStatus: string;
}) {
  const t = useTranslations("auditExport");
  const qc = useQueryClient();

  const unlocked =
    engagementStatus === "field_verified" ||
    engagementStatus === "export_ready" ||
    engagementStatus === "under_review" ||
    engagementStatus === "attested";

  const { data: readiness, isLoading } = useQuery({
    queryKey: ["audit-export-readiness", engagementId],
    queryFn: () => auditEngagements.getExportReadiness(engagementId),
    enabled: unlocked,
  });

  const download = useMutation({
    mutationFn: () => auditEngagements.downloadExportBundle(engagementId),
    onSuccess: (blob) => {
      downloadBlob(blob, `estate-watch-audit-${engagementId.slice(0, 8)}.zip`);
      qc.invalidateQueries({ queryKey: ["audit-export-readiness", engagementId] });
      qc.invalidateQueries({ queryKey: ["audit-engagement"] });
    },
  });

  if (!unlocked) {
    const message =
      engagementStatus === "sampling_planned" ? t("fieldVisitsRequired") : t("notReady");
    return <AuditLockedSection title={t("title")} message={message} />;
  }

  if (isLoading && !readiness) {
    return <p className="text-sm text-stone-500">{t("loading")}</p>;
  }

  const sections = (readiness?.sections ?? []) as ExportSection[];

  return (
    <AuditPanelShell
      icon={Archive}
      title={t("title")}
      subtitle={t("subtitle")}
      epistemicNote={t("epistemicNote")}
      statusBadge={
        engagementStatus === "export_ready" ||
        engagementStatus === "under_review" ||
        engagementStatus === "attested"
          ? (
            <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-800 ring-1 ring-emerald-200">
              {t("statusExported")}
            </span>
          )
          : undefined
      }
    >
      {(readiness?.reconciliation_mismatch_count ?? 0) > 0 ||
      (readiness?.reconciliation_no_field_count ?? 0) > 0 ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          {t("reconciliationWarning", {
            mismatch: readiness?.reconciliation_mismatch_count ?? 0,
            noField: readiness?.reconciliation_no_field_count ?? 0,
          })}
        </div>
      ) : (readiness?.reconciliation_aligned_count ?? 0) > 0 ? (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
          {t("reconciliationOk", { count: readiness?.reconciliation_aligned_count ?? 0 })}
        </div>
      ) : null}

      {sections.length > 0 && (
        <ul className="space-y-2 rounded-xl border border-stone-200 p-4 dark:border-stone-700">
          {sections.map((section) => (
            <li key={section.id} className="flex items-start gap-2 text-sm">
              {section.met ? (
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-hidden />
              ) : (
                <FileText className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" aria-hidden />
              )}
              <span className={cn(!section.met && "text-stone-500")}>
                {section.label}
                {!section.met && section.detail && (
                  <span className="block text-xs text-stone-400">{section.detail}</span>
                )}
              </span>
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          className="btn-primary inline-flex items-center gap-2 text-sm"
          disabled={!readiness?.exportable || download.isPending}
          onClick={() => download.mutate()}
        >
          <Download className="h-4 w-4" aria-hidden />
          {t("download")}
        </button>
        {download.isError && (
          <p className="text-sm text-rose-700">{errorMessage(download.error)}</p>
        )}
        {readiness?.last_export_sha256 && (
          <p className="text-xs text-stone-500">
            {t("lastExport", { sha: readiness.last_export_sha256.slice(0, 12) })}
          </p>
        )}
      </div>

      {!readiness?.exportable && readiness && (
        <p className="text-sm text-amber-700">{t("notReady")}</p>
      )}
    </AuditPanelShell>
  );
}
