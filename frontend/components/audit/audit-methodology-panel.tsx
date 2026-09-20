"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { BookOpen } from "lucide-react";
import { auditEngagements, errorMessage } from "@/lib/api";
import { AuditPanelShell } from "@/components/audit/audit-panel-shell";

export function AuditMethodologyPanel({ engagementId }: { engagementId: string }) {
  const t = useTranslations("auditMethodology");
  const qc = useQueryClient();
  const [version, setVersion] = useState("");
  const [reason, setReason] = useState("");

  const bindingQ = useQuery({
    queryKey: ["audit-methodology-binding", engagementId],
    queryFn: () => auditEngagements.getEngagementMethodology(engagementId),
  });

  const methodologiesQ = useQuery({
    queryKey: ["audit-methodologies"],
    queryFn: () => auditEngagements.listMethodologies(),
  });

  const changeLogQ = useQuery({
    queryKey: ["audit-methodology-change-log", engagementId],
    queryFn: () => auditEngagements.getMethodologyChangeLog(engagementId),
  });

  useEffect(() => {
    if (bindingQ.data?.methodology_version && !version) {
      setVersion(bindingQ.data.methodology_version);
    }
  }, [bindingQ.data?.methodology_version, version]);

  const save = useMutation({
    mutationFn: () =>
      auditEngagements.updateEngagementMethodology(engagementId, {
        methodology_version: version,
        reason: reason || t("defaultReason"),
      }),
    onSuccess: () => {
      setReason("");
      void qc.invalidateQueries({ queryKey: ["audit-methodology-binding", engagementId] });
      void qc.invalidateQueries({ queryKey: ["audit-methodology-change-log", engagementId] });
    },
  });

  if (bindingQ.isLoading || methodologiesQ.isLoading) {
    return <p className="text-sm text-stone-500">{t("loading")}</p>;
  }

  const methodologies = methodologiesQ.data ?? [];
  const binding = bindingQ.data;
  const changeLog = changeLogQ.data ?? [];

  return (
    <AuditPanelShell icon={BookOpen} title={t("title")} subtitle={t("subtitle")}>
      <div className="grid gap-4 md:grid-cols-2">
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-stone-700 dark:text-stone-300">
            {t("versionLabel")}
          </span>
          <select
            className="input w-full"
            value={version || binding?.methodology_version || ""}
            onChange={(e) => setVersion(e.target.value)}
          >
            {methodologies.map((methodology) => (
              <option key={methodology.version} value={methodology.version}>
                {methodology.name} ({methodology.version})
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-stone-700 dark:text-stone-300">
            {t("reasonLabel")}
          </span>
          <input
            className="input w-full"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={t("reasonPlaceholder")}
          />
        </label>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          className="btn-primary text-sm"
          disabled={save.isPending || !version}
          onClick={() => save.mutate()}
        >
          {save.isPending ? t("saving") : t("save")}
        </button>
        {binding?.methodology_version ? (
          <span className="text-xs text-stone-500">
            {t("current", { version: binding.methodology_version })}
          </span>
        ) : null}
        {save.isError ? <p className="text-sm text-rose-700">{errorMessage(save.error)}</p> : null}
      </div>

      {changeLog.length > 0 ? (
        <section className="rounded-xl border border-stone-200 dark:border-stone-700">
          <h3 className="border-b border-stone-100 px-3 py-2 text-xs font-semibold uppercase text-stone-500 dark:border-stone-800">
            {t("changeLog")}
          </h3>
          <ul className="divide-y divide-stone-100 dark:divide-stone-800">
            {changeLog.slice(0, 5).map((entry) => (
              <li key={entry.id} className="px-3 py-2 text-sm">
                <p className="font-medium text-stone-800 dark:text-stone-100">
                  {entry.from_version ? `${entry.from_version} → ${entry.to_version}` : entry.to_version}
                </p>
                <p className="text-xs text-stone-500">
                  {entry.reason} · {new Date(entry.changed_at).toLocaleString()}
                </p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </AuditPanelShell>
  );
}
