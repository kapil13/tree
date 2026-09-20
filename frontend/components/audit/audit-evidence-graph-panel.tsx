"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { GitBranch, Sparkles } from "lucide-react";
import { auditEngagements, errorMessage } from "@/lib/api";
import { AuditExplainResult } from "@/components/audit/audit-explain-result";
import { AuditLockedSection } from "@/components/audit/audit-locked-section";
import { AuditPanelShell } from "@/components/audit/audit-panel-shell";
import { cn } from "@/lib/cn";

const NODE_TYPE_STYLES: Record<string, string> = {
  claim: "bg-violet-100 text-violet-900 ring-violet-200",
  estimation: "bg-sky-100 text-sky-900 ring-sky-200",
  observation: "bg-emerald-100 text-emerald-900 ring-emerald-200",
  attestation: "bg-amber-100 text-amber-900 ring-amber-200",
};

export function AuditEvidenceGraphPanel({
  engagementId,
  engagementStatus,
}: {
  engagementId: string;
  engagementStatus: string;
}) {
  const t = useTranslations("auditEvidenceGraph");
  const qc = useQueryClient();

  const unlocked =
    engagementStatus === "field_verified" ||
    engagementStatus === "export_ready" ||
    engagementStatus === "under_review" ||
    engagementStatus === "attested";

  const graphQ = useQuery({
    queryKey: ["audit-evidence-graph", engagementId],
    queryFn: () => auditEngagements.getEvidenceGraph(engagementId),
    enabled: unlocked,
  });

  const explain = useMutation({
    mutationFn: () => auditEngagements.explainEvidenceGraph(engagementId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["audit-explain-runs", engagementId] });
    },
  });

  if (!unlocked) {
    return <AuditLockedSection title={t("title")} message={t("locked")} />;
  }

  if (graphQ.isLoading) {
    return <p className="text-sm text-stone-500">{t("loading")}</p>;
  }

  if (graphQ.error) {
    return <p className="text-sm text-rose-700">{errorMessage(graphQ.error)}</p>;
  }

  const graph = graphQ.data;
  const nodes = graph?.nodes ?? [];
  const edges = graph?.edges ?? [];

  return (
    <AuditPanelShell
      icon={GitBranch}
      title={t("title")}
      subtitle={t("subtitle")}
      epistemicNote={t("epistemicNote")}
    >
      <div className="flex flex-wrap items-center gap-3">
        <span className="rounded-full bg-stone-100 px-2.5 py-1 text-xs text-stone-700 ring-1 ring-stone-200">
          {t("counts", { nodes: graph?.node_count ?? 0, edges: graph?.edge_count ?? 0 })}
        </span>
        <button
          type="button"
          className="btn-secondary inline-flex items-center gap-2 text-sm"
          disabled={explain.isPending || nodes.length === 0}
          onClick={() => explain.mutate()}
        >
          <Sparkles className="h-4 w-4" aria-hidden />
          {explain.isPending ? t("explaining") : t("explain")}
        </button>
      </div>

      {explain.data ? <AuditExplainResult run={explain.data} className="mt-4" /> : null}
      {explain.isError ? (
        <p className="text-sm text-rose-700">{errorMessage(explain.error)}</p>
      ) : null}

      {nodes.length === 0 ? (
        <p className="text-sm text-stone-500">{t("empty")}</p>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          <section className="rounded-xl border border-stone-200 dark:border-stone-700">
            <h3 className="border-b border-stone-100 px-3 py-2 text-xs font-semibold uppercase text-stone-500 dark:border-stone-800">
              {t("nodes")}
            </h3>
            <ul className="max-h-72 divide-y divide-stone-100 overflow-y-auto dark:divide-stone-800">
              {nodes.map((node, index) => {
                const nodeType = String(node.node_type ?? node.type ?? "node");
                const label = String(node.label ?? node.title ?? node.id ?? index);
                return (
                  <li key={String(node.id ?? index)} className="px-3 py-2 text-sm">
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ring-1",
                          NODE_TYPE_STYLES[nodeType] ?? "bg-stone-100 text-stone-700 ring-stone-200",
                        )}
                      >
                        {nodeType}
                      </span>
                      <span className="font-medium text-stone-900 dark:text-stone-100">{label}</span>
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
          <section className="rounded-xl border border-stone-200 dark:border-stone-700">
            <h3 className="border-b border-stone-100 px-3 py-2 text-xs font-semibold uppercase text-stone-500 dark:border-stone-800">
              {t("edges")}
            </h3>
            <ul className="max-h-72 divide-y divide-stone-100 overflow-y-auto dark:divide-stone-800">
              {edges.map((edge, index) => (
                <li key={String(edge.id ?? index)} className="px-3 py-2 text-xs text-stone-600">
                  <span className="font-medium text-stone-800 dark:text-stone-200">
                    {String(edge.edge_type ?? edge.relation ?? "links")}
                  </span>
                  <span className="mx-1">·</span>
                  {String(edge.source_id ?? edge.from_id ?? "?")}
                  <span className="mx-1">→</span>
                  {String(edge.target_id ?? edge.to_id ?? "?")}
                </li>
              ))}
            </ul>
          </section>
        </div>
      )}
    </AuditPanelShell>
  );
}
