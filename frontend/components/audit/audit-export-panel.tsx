"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { Archive, CheckCircle2, Download, FileText } from "lucide-react";
import { auditEngagements } from "@/lib/api";
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

  const enabled =
    engagementStatus === "field_verified" || engagementStatus === "export_ready";

  const { data: readiness, isLoading } = useQuery({
    queryKey: ["audit-export-readiness", engagementId],
    queryFn: () => auditEngagements.getExportReadiness(engagementId),
    enabled: engagementStatus !== "draft",
  });

  const download = useMutation({
    mutationFn: () => auditEngagements.downloadExportBundle(engagementId),
    onSuccess: (blob) => {
      downloadBlob(blob, `estate-watch-audit-${engagementId.slice(0, 8)}.zip`);
      qc.invalidateQueries({ queryKey: ["audit-export-readiness", engagementId] });
      qc.invalidateQueries({ queryKey: ["audit-engagement"] });
    },
  });

  if (!enabled && engagementStatus !== "sampling_planned") {
    if (engagementStatus === "draft" || engagementStatus === "intake_complete") {
      return null;
    }
  }

  if (isLoading && !readiness) {
    return <p className="text-sm text-stone-500">{t("loading")}</p>;
  }

  const sections = (readiness?.sections ?? []) as ExportSection[];

  return (
    <section className="space-y-6">
      <header className="space-y-2">
        <div className="flex flex-wrap items-center gap-3">
          <Archive className="h-6 w-6 text-forest-700" aria-hidden />
          <h2 className="text-lg font-semibold text-stone-900 dark:text-stone-100">
            {t("title")}
          </h2>
          {engagementStatus === "export_ready" && (
            <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-800 ring-1 ring-emerald-200">
              {t("statusExported")}
            </span>
          )}
        </div>
        <p className="text-sm text-stone-600 dark:text-stone-400">{t("subtitle")}</p>
        <p className="text-xs text-stone-500">{t("epistemicNote")}</p>
      </header>

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
        {readiness?.last_export_sha256 && (
          <p className="text-xs text-stone-500">
            {t("lastExport", { sha: readiness.last_export_sha256.slice(0, 12) })}
          </p>
        )}
      </div>

      {!readiness?.exportable && readiness && (
        <p className="text-sm text-amber-700">{t("notReady")}</p>
      )}
    </section>
  );
}
