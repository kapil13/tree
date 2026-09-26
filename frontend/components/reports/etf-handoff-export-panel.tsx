"use client";

import { useState } from "react";
import { Globe2, Download } from "lucide-react";
import { api, errorMessage } from "@/lib/api";
import { downloadBlob } from "@/lib/download-blob";
import { useAuth } from "@/lib/auth-store";

type EtfFormat = "csv" | "xlsx";

export function EtfHandoffExportPanel() {
  const { user } = useAuth();
  const [format, setFormat] = useState<EtfFormat>("csv");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function download() {
    setBusy(true);
    setError(null);
    try {
      const response = await api.get("/v1/reporting/inventory-handoff", {
        params: { format },
        responseType: "blob",
      });
      const ext = format === "xlsx" ? "xlsx" : "csv";
      downloadBlob(response.data as Blob, `etf-btr-inventory-handoff.${ext}`);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card space-y-4">
      <div className="flex items-center gap-2">
        <Globe2 className="h-5 w-5 text-forest-700" />
        <h2 className="text-lg font-semibold">ETF / BTR inventory handoff</h2>
      </div>
      <p className="text-sm text-stone-600">
        IPCC-aligned activity tables for national inventory and Enhanced Transparency Framework
        preparation. Org-level roll-up of ARR removals, leakage, NPRT buffers, and SAR integrity
        flags — manual upload to MoEFCC or UNFCCC portals, not an official submission.
      </p>
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label className="label">Format</label>
          <select
            className="input"
            value={format}
            onChange={(e) => setFormat(e.target.value as EtfFormat)}
          >
            <option value="csv">CSV (ETF handoff)</option>
            <option value="xlsx">Excel workbook</option>
          </select>
        </div>
        <button
          type="button"
          className="btn-primary inline-flex items-center gap-1.5"
          disabled={busy || !user?.organization_id}
          onClick={() => void download()}
        >
          <Download className="h-4 w-4" />
          {busy ? "Exporting…" : "Export inventory handoff"}
        </button>
      </div>
      {!user?.organization_id && (
        <p className="text-xs text-amber-700">Join an organization to export portfolio handoff.</p>
      )}
      {error ? (
        <p className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>
      ) : null}
    </div>
  );
}
