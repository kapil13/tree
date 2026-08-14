"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { BrsrExportPanel } from "@/components/reports/brsr-export-panel";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { api, errorMessage, plantationFences } from "@/lib/api";
import { useAuth } from "@/lib/auth-store";
import { canGenerateReports } from "@/lib/nav-access";
import { FileText } from "lucide-react";

const REPORT_TYPES: { value: string; label: string; description: string; needsFence?: boolean }[] = [
  {
    value: "carbon",
    label: "Carbon stock",
    description: "Estimated biomass and CO₂e across your trees.",
  },
  {
    value: "tree",
    label: "Tree inventory",
    description: "Species, survival, and geotag status for compliance packs.",
  },
  {
    value: "biodiversity",
    label: "Biodiversity",
    description: "Soundscape assessments and species richness for a site.",
    needsFence: true,
  },
  {
    value: "esg",
    label: "ESG summary",
    description: "Combined carbon, biodiversity, and NDVI narrative for stakeholders.",
    needsFence: true,
  },
  {
    value: "plantation",
    label: "Plantation site",
    description: "Fence area, latest greenness, and site-level activity.",
    needsFence: true,
  },
];

type ReportRow = {
  id: string;
  kind: string;
  format: string;
  status: string;
  created_at: string;
};

export default function ReportsPage() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const canGenerate = canGenerateReports(user);
  const [tab, setTab] = useState<"standard" | "brsr">("standard");
  const [kind, setKind] = useState("carbon");
  const [format, setFormat] = useState<"pdf" | "xlsx">("pdf");
  const [fenceId, setFenceId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const { data: fences } = useQuery({
    queryKey: ["plantation-fences"],
    queryFn: () => plantationFences.list({ page_size: 100 }),
  });

  const {
    data: list = [],
    isLoading,
    isError,
    error: loadError,
    refetch,
  } = useQuery({
    queryKey: ["reports-list"],
    queryFn: async () => (await api.get<ReportRow[]>("/v1/reports")).data,
  });

  const selectedType = REPORT_TYPES.find((t) => t.value === kind) ?? REPORT_TYPES[0]!;
  const needsFence = Boolean(selectedType.needsFence);
  const kindLabel = (value: string) =>
    REPORT_TYPES.find((t) => t.value === value)?.label || value;

  async function queue() {
    setBusy(true);
    setError(null);
    try {
      const params = new URLSearchParams({ kind, format });
      if (needsFence && fenceId) params.set("plantation_fence_id", fenceId);
      await api.post(`/v1/reports?${params.toString()}`);
      await qc.invalidateQueries({ queryKey: ["reports-list"] });
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Reports"
        description={
          canGenerate
            ? "Generate carbon, inventory, biodiversity, and ESG exports for your portfolio."
            : "Download compliance and portfolio reports prepared by your program team."
        }
      />

      <div className="flex gap-2 border-b border-stone-200 pb-2">
        <button
          type="button"
          className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
            tab === "standard" ? "bg-forest-100 text-forest-900" : "text-stone-600 hover:bg-stone-100"
          }`}
          onClick={() => setTab("standard")}
        >
          Standard reports
        </button>
        <button
          type="button"
          className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
            tab === "brsr" ? "bg-forest-100 text-forest-900" : "text-stone-600 hover:bg-stone-100"
          }`}
          onClick={() => setTab("brsr")}
        >
          BRSR (SEBI)
        </button>
      </div>

      {tab === "brsr" ? (
        <BrsrExportPanel />
      ) : (
        <>
      {canGenerate ? (
        <div className="card space-y-4">
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <label className="label">Report type</label>
              <select className="input" value={kind} onChange={(e) => setKind(e.target.value)}>
                {REPORT_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Format</label>
              <select
                className="input"
                value={format}
                onChange={(e) => setFormat(e.target.value as "pdf" | "xlsx")}
              >
                <option value="pdf">PDF</option>
                <option value="xlsx">Excel</option>
              </select>
            </div>
            {needsFence && (
              <div>
                <label className="label">Plantation site</label>
                <select className="input" value={fenceId} onChange={(e) => setFenceId(e.target.value)}>
                  <option value="">Select site…</option>
                  {fences?.items.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <button
              type="button"
              className="btn-primary"
              onClick={() => void queue()}
              disabled={busy || (needsFence && !fenceId)}
            >
              {busy ? "Generating…" : "Generate report"}
            </button>
            <button type="button" className="btn-secondary" onClick={() => void refetch()}>
              Refresh
            </button>
          </div>
          <p className="text-sm text-stone-600">{selectedType.description}</p>
        </div>
      ) : (
        <div className="rounded-lg border border-stone-200 bg-stone-50 px-4 py-3 text-sm text-stone-700 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-200">
          Your viewer role can download existing reports but cannot generate new ones. Contact your
          program manager if you need a fresh export.
        </div>
      )}
      {(error || isError) && (
        <div className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {error || errorMessage(loadError)}
        </div>
      )}

      <div className="card overflow-hidden p-0">
        <table className="min-w-full text-sm">
          <thead className="bg-stone-50 text-stone-600">
            <tr>
              <th className="px-4 py-2 text-left">Type</th>
              <th className="px-4 py-2 text-left">Format</th>
              <th className="px-4 py-2 text-left">Status</th>
              <th className="px-4 py-2 text-left">Created</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={5} className="p-6 text-center text-stone-500">
                  Loading reports…
                </td>
              </tr>
            )}
            {!isLoading && list.length === 0 && (
              <tr>
                <td colSpan={5} className="p-6">
                  <EmptyState
                    icon={FileText}
                    title={canGenerate ? "No reports yet" : "No reports available"}
                    description={
                      canGenerate
                        ? "Choose a report type above and generate your first export."
                        : "Ask your program manager to generate a report for you."
                    }
                  />
                </td>
              </tr>
            )}
            {list.map((r) => (
              <tr key={r.id} className="border-t border-stone-100">
                <td className="px-4 py-2">{kindLabel(r.kind)}</td>
                <td className="px-4 py-2 uppercase">{r.format}</td>
                <td className="px-4 py-2">
                  <span
                    className={
                      r.status === "ready"
                        ? "text-forest-700"
                        : r.status === "failed"
                          ? "text-rose-700"
                          : "text-amber-700"
                    }
                  >
                    {r.status}
                  </span>
                </td>
                <td className="px-4 py-2 text-stone-500">
                  {new Date(r.created_at).toLocaleString()}
                </td>
                <td className="px-4 py-2 text-right">
                  {r.status === "ready" ? (
                    <a
                      href={`/api/v1/reports/${r.id}/download`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-forest-700 hover:underline"
                    >
                      Download
                    </a>
                  ) : (
                    <span className="text-xs text-stone-400">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
        </>
      )}
    </div>
  );
}
