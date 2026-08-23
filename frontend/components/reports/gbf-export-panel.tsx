"use client";

import { useState } from "react";
import { Dna, Download } from "lucide-react";
import { api, errorMessage } from "@/lib/api";
import { downloadBlob } from "@/lib/download-blob";
import { useAuth } from "@/lib/auth-store";

export function GbfExportPanel() {
  const { user } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function download() {
    setBusy(true);
    setError(null);
    try {
      const response = await api.get("/v1/reporting/gbf-indicators", {
        params: { format: "xlsx" },
        responseType: "blob",
      });
      downloadBlob(response.data as Blob, "gbf-indicator-mapping.xlsx");
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card space-y-4">
      <div className="flex items-center gap-2">
        <Dna className="h-5 w-5 text-forest-700" />
        <h2 className="text-lg font-semibold">GBF indicator mapping</h2>
      </div>
      <p className="text-sm text-stone-600">
        Kunming-Montreal Global Biodiversity Framework Targets 2 (restore) and 3 (protect)
        from portfolio metrics. Bridged to TNFD LEAP exports — not a CBD national report.
      </p>
      <button
        type="button"
        className="btn-primary inline-flex items-center gap-1.5"
        disabled={busy || !user?.organization_id}
        onClick={() => void download()}
      >
        <Download className="h-4 w-4" />
        {busy ? "Exporting…" : "Download GBF mapping (.xlsx)"}
      </button>
      {error ? <p className="text-sm text-rose-700">{error}</p> : null}
    </div>
  );
}
