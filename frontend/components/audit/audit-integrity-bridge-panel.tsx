"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { AlertTriangle, ShieldCheck } from "lucide-react";
import { auditEngagements } from "@/lib/api";
import { AuditPanelShell } from "@/components/audit/audit-panel-shell";
import { cn } from "@/lib/cn";

export function AuditIntegrityBridgePanel({
  engagementId,
  projectId,
}: {
  engagementId: string;
  projectId: string;
}) {
  const t = useTranslations("auditIntegrityBridge");
  const { data, isLoading, error } = useQuery({
    queryKey: ["audit-integrity-bridge", engagementId],
    queryFn: () => auditEngagements.getIntegrityBridge(engagementId),
    staleTime: 60_000,
  });

  if (isLoading) {
    return <p className="text-sm text-stone-500">{t("loading")}</p>;
  }

  if (error || !data) {
    return (
      <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
        {t("error")}
      </p>
    );
  }

  const aligned = data.integrity_gate_passed && data.export_ready;

  return (
    <AuditPanelShell
      icon={ShieldCheck}
      title={t("title")}
      subtitle={t("subtitle")}
      epistemicNote={t("epistemicNote")}
      statusBadge={
        <span
          className={cn(
            "rounded-full px-2.5 py-0.5 text-xs font-medium ring-1",
            aligned
              ? "bg-emerald-50 text-emerald-800 ring-emerald-200"
              : "bg-amber-50 text-amber-900 ring-amber-200",
          )}
        >
          {aligned ? t("statusAligned") : t("statusGaps")}
        </span>
      }
    >
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-sm dark:border-stone-700 dark:bg-stone-900/40">
          <p className="text-xs uppercase text-stone-500">{t("auditReady")}</p>
          <p className="text-lg font-semibold">
            {data.audit_ready_count}/{data.tree_count} ({data.audit_ready_pct.toFixed(1)}%)
          </p>
        </div>
        <div className="rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-sm dark:border-stone-700 dark:bg-stone-900/40">
          <p className="text-xs uppercase text-stone-500">{t("exportGate")}</p>
          <p className="text-lg font-semibold">{data.export_ready ? t("ready") : t("blocked")}</p>
        </div>
        <div className="rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-sm dark:border-stone-700 dark:bg-stone-900/40">
          <p className="text-xs uppercase text-stone-500">{t("blockingTrees")}</p>
          <p className="text-lg font-semibold">{data.blocking_count}</p>
        </div>
      </div>

      <p className="text-sm text-stone-600 dark:text-stone-400">{data.message}</p>

      {data.recommendations.length > 0 && (
        <ul className="space-y-2 text-sm text-stone-700 dark:text-stone-300">
          {data.recommendations.map((item) => (
            <li key={item} className="flex items-start gap-2">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" aria-hidden />
              {item}
            </li>
          ))}
        </ul>
      )}

      {data.blocking_trees.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-stone-200 dark:border-stone-700">
          <table className="w-full text-sm">
            <thead className="bg-stone-50 text-left text-xs uppercase text-stone-500 dark:bg-stone-900/50">
              <tr>
                <th className="px-3 py-2">{t("table.tree")}</th>
                <th className="px-3 py-2">{t("table.status")}</th>
                <th className="px-3 py-2">{t("table.reasons")}</th>
              </tr>
            </thead>
            <tbody>
              {data.blocking_trees.map((tree) => (
                <tr key={tree.tree_id} className="border-t border-stone-100 dark:border-stone-800">
                  <td className="px-3 py-2">
                    <Link
                      href={`/trees/${tree.tree_id}`}
                      className="font-medium text-forest-800 hover:underline dark:text-forest-300"
                    >
                      {tree.public_code}
                    </Link>
                  </td>
                  <td className="px-3 py-2 capitalize">{tree.verification_status.replaceAll("_", " ")}</td>
                  <td className="px-3 py-2 text-xs text-stone-500">{tree.reasons.join(" · ")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <Link href={`/projects/${projectId}`} className="btn-secondary text-xs">
          {t("openIntegrityFusion")}
        </Link>
        <Link href={`/trees?project=${projectId}`} className="btn-secondary text-xs">
          {t("reviewTrees")}
        </Link>
      </div>
    </AuditPanelShell>
  );
}
