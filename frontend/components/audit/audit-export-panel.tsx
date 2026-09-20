"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { Archive, CheckCircle2, Download, FileText, ShieldCheck } from "lucide-react";
import { auditEngagements, errorMessage, type AuditExportListItem } from "@/lib/api";
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

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

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

  const exportsQ = useQuery({
    queryKey: ["audit-exports", engagementId],
    queryFn: () => auditEngagements.listExports(engagementId),
    enabled: unlocked,
  });

  const download = useMutation({
    mutationFn: () => auditEngagements.downloadExportBundle(engagementId),
    onSuccess: (blob) => {
      downloadBlob(blob, `estate-watch-audit-${engagementId.slice(0, 8)}.zip`);
      void qc.invalidateQueries({ queryKey: ["audit-export-readiness", engagementId] });
      void qc.invalidateQueries({ queryKey: ["audit-engagement"] });
      void qc.invalidateQueries({ queryKey: ["audit-exports", engagementId] });
    },
  });

  const downloadFrozen = useMutation({
    mutationFn: (exportId: string) => auditEngagements.downloadFrozenExport(engagementId, exportId),
    onSuccess: (blob, exportId) => {
      downloadBlob(blob, `estate-watch-audit-${exportId.slice(0, 8)}.zip`);
    },
  });

  const verifyExport = useMutation({
    mutationFn: (exportId: string) => auditEngagements.verifyExport(engagementId, exportId),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["audit-exports", engagementId] }),
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
  const exports = exportsQ.data ?? [];

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

      <section className="mt-6 space-y-3">
        <h3 className="text-sm font-semibold text-stone-900 dark:text-stone-100">
          {t("historyTitle")}
        </h3>
        {exportsQ.isLoading ? (
          <p className="text-sm text-stone-500">{t("historyLoading")}</p>
        ) : exports.length === 0 ? (
          <p className="text-sm text-stone-500">{t("historyEmpty")}</p>
        ) : (
          <ul className="space-y-2">
            {exports.map((item: AuditExportListItem) => {
              const verification = verifyExport.data?.export_id === item.export_id
                ? verifyExport.data
                : null;
              return (
                <li
                  key={item.export_id}
                  className="rounded-xl border border-stone-200 p-3 text-sm dark:border-stone-700"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-stone-900 dark:text-stone-100">
                        {t("historyItem", {
                          version: item.export_version,
                          files: item.file_count,
                        })}
                      </p>
                      <p className="mt-1 text-xs text-stone-500">
                        {item.generated_at
                          ? new Date(item.generated_at).toLocaleString()
                          : t("historyPending")}
                        {item.methodology_version ? ` · ${item.methodology_version}` : ""}
                      </p>
                      <p className="mt-1 font-mono text-[11px] text-stone-400">
                        {item.package_sha256.slice(0, 16)}… · {formatBytes(item.zip_size_bytes)}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        className="btn-secondary inline-flex items-center gap-1 text-xs"
                        disabled={downloadFrozen.isPending}
                        onClick={() => downloadFrozen.mutate(item.export_id)}
                      >
                        <Download className="h-3.5 w-3.5" aria-hidden />
                        {t("downloadFrozen")}
                      </button>
                      <button
                        type="button"
                        className="btn-secondary inline-flex items-center gap-1 text-xs"
                        disabled={verifyExport.isPending}
                        onClick={() => verifyExport.mutate(item.export_id)}
                      >
                        <ShieldCheck className="h-3.5 w-3.5" aria-hidden />
                        {t("verify")}
                      </button>
                    </div>
                  </div>
                  {verification ? (
                    <p
                      className={cn(
                        "mt-2 text-xs font-medium",
                        verification.valid ? "text-emerald-700" : "text-rose-700",
                      )}
                    >
                      {verification.valid ? t("verifyValid") : t("verifyInvalid")}
                    </p>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
        {verifyExport.isError ? (
          <p className="text-sm text-rose-700">{errorMessage(verifyExport.error)}</p>
        ) : null}
      </section>
    </AuditPanelShell>
  );
}
