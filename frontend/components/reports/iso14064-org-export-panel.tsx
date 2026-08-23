"use client";

import { useState } from "react";
import { Scale, Download } from "lucide-react";
import { api, errorMessage } from "@/lib/api";
import { downloadBlob } from "@/lib/download-blob";
import { useAuth } from "@/lib/auth-store";

type IsoOrgFormat = "json" | "xlsx" | "zip";

export function Iso14064OrgExportPanel() {
  const { user } = useAuth();
  const [format, setFormat] = useState<IsoOrgFormat>("xlsx");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function download() {
    setBusy(true);
    setError(null);
    try {
      const response = await api.get("/v1/reporting/iso14064-org", {
        params: { format },
        responseType: "blob",
      });
      const ext = format === "zip" ? "zip" : format === "json" ? "json" : "xlsx";
      downloadBlob(response.data as Blob, `iso14064-org-inventory.${ext}`);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card space-y-4">
      <div className="flex items-center gap-2">
        <Scale className="h-5 w-5 text-forest-700" />
        <h2 className="text-lg font-semibold">ISO 14064-1 org inventory</h2>
      </div>
      <p className="text-sm text-stone-600">
        Organizational GHG inventory structured for ISO 14064-1 preparation. Complements
        ISO 14064-2 project reports with land-sector removals from plantation MRV.
      </p>
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label className="label">Format</label>
          <select
            className="input"
            value={format}
            onChange={(e) => setFormat(e.target.value as IsoOrgFormat)}
          >
            <option value="xlsx">Excel workbook</option>
            <option value="json">JSON</option>
            <option value="zip">ZIP pack</option>
          </select>
        </div>
        <button
          type="button"
          className="btn-primary inline-flex items-center gap-1.5"
          disabled={busy || !user?.organization_id}
          onClick={() => void download()}
        >
          <Download className="h-4 w-4" />
          {busy ? "Exporting…" : "Download org inventory"}
        </button>
      </div>
      {error ? <p className="text-sm text-rose-700">{error}</p> : null}
    </div>
  );
}
