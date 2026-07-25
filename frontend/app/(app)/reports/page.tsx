"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api, errorMessage, plantationFences } from "@/lib/api";
import { useAuth } from "@/lib/auth-store";
import { canGenerateReports } from "@/lib/nav-access";

const KIND_LABELS: Record<string, string> = {
  carbon: "Carbon stock",
  tree: "Tree inventory",
  biodiversity: "Biodiversity",
  esg: "ESG summary",
  plantation: "Plantation site",
};

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

  const needsFence = kind === "biodiversity" || kind === "plantation" || kind === "esg";

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
      <h1 className="text-2xl font-semibold">Reports</h1>
      <p className="text-sm text-stone-600">
        {canGenerate
          ? "Carbon, biodiversity (bioacoustic + NDVI), and combined ESG reports."
          : "Download compliance and portfolio reports prepared by your program team."}
      </p>
      {canGenerate ? (
      <div className="card flex flex-wrap items-end gap-3">
        <div>
          <label className="label">Kind</label>
          <select className="input" value={kind} onChange={(e) => setKind(e.target.value)}>
            {Object.entries(KIND_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
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
        <button className="btn-primary" onClick={() => void queue()} disabled={busy || (needsFence && !fenceId)}>
          {busy ? "Generating…" : "Generate report"}
        </button>
        <button className="btn-secondary" onClick={() => void refetch()}>
          Refresh
        </button>
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
              <th className="px-4 py-2 text-left">Kind</th>
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
                <td colSpan={5} className="p-6 text-center text-stone-500">
                  {canGenerate ? "No reports yet — generate one above." : "No reports available yet."}
                </td>
              </tr>
            )}
            {list.map((r) => (
              <tr key={r.id} className="border-t border-stone-100">
                <td className="px-4 py-2">{KIND_LABELS[r.kind] || r.kind}</td>
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
    </div>
  );
}
