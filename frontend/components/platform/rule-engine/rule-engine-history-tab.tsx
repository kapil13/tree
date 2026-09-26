"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { History, RotateCcw } from "lucide-react";
import { cmsAdmin } from "@/lib/cms-api";
import { errorMessage } from "@/lib/api";

export function HistoryTab({ onOpenTemplate }: { onOpenTemplate: (code: string) => void }) {
  const qc = useQueryClient();
  const { data: templates } = useQuery({
    queryKey: ["cms-rule-templates"],
    queryFn: () => cmsAdmin.listRuleTemplates(),
  });
  const [code, setCode] = useState<string>("");
  const selectedCode = code || templates?.[0]?.template_code || "";

  const { data: versions, isLoading } = useQuery({
    queryKey: ["cms-rule-versions", selectedCode],
    queryFn: () => cmsAdmin.listRuleTemplateVersions(selectedCode),
    enabled: Boolean(selectedCode),
  });

  const rollback = useMutation({
    mutationFn: (versionId: string) => cmsAdmin.rollbackRuleTemplate(selectedCode, versionId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["cms-rule-templates"] });
      qc.invalidateQueries({ queryKey: ["cms-rule-versions", selectedCode] });
    },
  });

  return (
    <div className="grid gap-5 lg:grid-cols-[240px_1fr]">
      <aside className="card space-y-3">
        <h3 className="text-sm font-semibold">Template</h3>
        <select className="input" value={selectedCode} onChange={(e) => setCode(e.target.value)}>
          {(templates ?? []).map((t) => (
            <option key={t.template_code} value={t.template_code}>
              {t.name}
            </option>
          ))}
        </select>
        <button type="button" className="btn-secondary w-full text-sm" onClick={() => onOpenTemplate(selectedCode)}>
          Open in editor
        </button>
      </aside>

      <div className="card">
        <div className="mb-4 flex items-center gap-2">
          <History className="h-5 w-5 text-stone-500" />
          <h3 className="text-lg font-semibold">Version history</h3>
        </div>
        {isLoading ? (
          <p className="text-sm text-stone-500">Loading versions…</p>
        ) : !versions?.length ? (
          <p className="text-sm text-stone-500">No publishes yet. Save rules in Templates to create v1.</p>
        ) : (
          <ol className="space-y-3">
            {versions.map((v) => (
              <li
                key={v.id}
                className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-stone-200 p-4 dark:border-stone-700"
              >
                <div>
                  <p className="font-semibold">
                    v{v.version_number}
                    {v.is_rollback && (
                      <span className="ml-2 rounded bg-amber-100 px-2 py-0.5 text-xs text-amber-900">
                        rollback
                      </span>
                    )}
                  </p>
                  <p className="mt-1 text-xs text-stone-500">
                    {v.created_at ? new Date(v.created_at).toLocaleString() : "—"}
                    {v.compliance_mode ? ` · ${v.compliance_mode}` : ""}
                  </p>
                  {v.publish_note && (
                    <p className="mt-2 text-sm text-stone-700 dark:text-stone-300">{v.publish_note}</p>
                  )}
                </div>
                <button
                  type="button"
                  className="btn-secondary shrink-0"
                  disabled={rollback.isPending}
                  onClick={() => rollback.mutate(v.id)}
                >
                  <RotateCcw className="h-4 w-4" />
                  Restore
                </button>
              </li>
            ))}
          </ol>
        )}
        {rollback.isError && (
          <p className="mt-3 text-sm text-rose-700">{errorMessage(rollback.error)}</p>
        )}
        {rollback.isSuccess && (
          <p className="mt-3 text-sm text-emerald-700">Restored. Rules are live.</p>
        )}
      </div>
    </div>
  );
}
