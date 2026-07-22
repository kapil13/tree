"use client";

import { useState } from "react";
import { api, errorMessage, plantationFences } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";

export default function ReportsPage() {
  const [kind, setKind] = useState("carbon");
  const [format, setFormat] = useState<"pdf" | "xlsx">("pdf");
  const [fenceId, setFenceId] = useState("");
  const [list, setList] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const { data: fences } = useQuery({
    queryKey: ["plantation-fences"],
    queryFn: () => plantationFences.list({ page_size: 100 }),
  });

  const needsFence = kind === "biodiversity" || kind === "plantation" || kind === "esg";

  async function refresh() {
    try {
      const r = await api.get("/v1/reports");
      setList(r.data);
    } catch (e) {
      setError(errorMessage(e));
    }
  }

  async function queue() {
    setBusy(true);
    setError(null);
    try {
      const params = new URLSearchParams({ kind, format });
      if (needsFence && fenceId) params.set("plantation_fence_id", fenceId);
      await api.post(`/v1/reports?${params.toString()}`);
      await refresh();
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
        Carbon, biodiversity (bioacoustic + NDVI), and combined ESG reports.
      </p>
      <div className="card flex flex-wrap items-end gap-3">
        <div>
          <label className="label">Kind</label>
          <select className="input" value={kind} onChange={(e) => setKind(e.target.value)}>
            {["carbon", "tree", "biodiversity", "esg", "plantation"].map((k) => (
              <option key={k} value={k}>{k}</option>
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
                <option key={f.id} value={f.id}>{f.name}</option>
              ))}
            </select>
          </div>
        )}
        <button className="btn-primary" onClick={queue} disabled={busy || (needsFence && !fenceId)}>
          {busy ? "Generating…" : "Generate report"}
        </button>
        <button className="btn-secondary" onClick={refresh}>
          Refresh
        </button>
      </div>
      {error && <div className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</div>}

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
            {list.length === 0 && (
              <tr>
                <td colSpan={5} className="p-6 text-center text-stone-500">
                  No reports yet — generate one above.
                </td>
              </tr>
            )}
            {list.map((r) => (
              <tr key={r.id} className="border-t border-stone-100">
                <td className="px-4 py-2">{r.kind}</td>
                <td className="px-4 py-2">{r.format}</td>
                <td className="px-4 py-2">
                  <span className={r.status === "ready" ? "text-forest-700" : r.status === "failed" ? "text-rose-700" : ""}>
                    {r.status}
                  </span>
                </td>
                <td className="px-4 py-2 text-stone-500">
                  {new Date(r.created_at).toLocaleString()}
                </td>
                <td className="px-4 py-2 text-right">
                  <a
                    href={`/api/v1/reports/${r.id}/download`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-forest-700 hover:underline"
                  >
                    Download
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
