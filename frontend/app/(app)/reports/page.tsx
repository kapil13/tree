"use client";

import { useState } from "react";
import { api, errorMessage } from "@/lib/api";

export default function ReportsPage() {
  const [kind, setKind] = useState("carbon");
  const [format, setFormat] = useState<"pdf" | "xlsx">("pdf");
  const [list, setList] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

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
      await api.post(`/v1/reports?kind=${kind}&format=${format}`);
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
      <div className="card flex flex-wrap items-end gap-3">
        <div>
          <label className="label">Kind</label>
          <select className="input" value={kind} onChange={(e) => setKind(e.target.value)}>
            {["tree", "plantation", "carbon", "esg"].map((k) => (
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
        <button className="btn-primary" onClick={queue} disabled={busy}>
          {busy ? "Queuing…" : "Queue report"}
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
                  No reports yet — queue one above.
                </td>
              </tr>
            )}
            {list.map((r) => (
              <tr key={r.id} className="border-t border-stone-100">
                <td className="px-4 py-2">{r.kind}</td>
                <td className="px-4 py-2">{r.format}</td>
                <td className="px-4 py-2">{r.status}</td>
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
