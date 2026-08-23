"use client";

import { useState } from "react";
import { Target, Download } from "lucide-react";
import { api, errorMessage } from "@/lib/api";
import { downloadBlob } from "@/lib/download-blob";
import { useAuth } from "@/lib/auth-store";

export function SbtiFlagExportPanel() {
  const { user } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function download() {
    setBusy(true);
    setError(null);
    try {
      const response = await api.get("/v1/reporting/sbti-flag", {
        params: { format: "xlsx" },
        responseType: "blob",
      });
      downloadBlob(response.data as Blob, "sbti-flag-worksheet.xlsx");
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card space-y-4">
      <div className="flex items-center gap-2">
        <Target className="h-5 w-5 text-forest-700" />
        <h2 className="text-lg font-semibold">SBTi FLAG worksheet</h2>
      </div>
      <p className="text-sm text-stone-600">
        Land-related emissions and removals vs target boundary for corporate FLAG target-setting
        preparation. Linked to VM0047, GHG Protocol, and leakage worksheets — not SBTi validation.
      </p>
      <button
        type="button"
        className="btn-primary inline-flex items-center gap-1.5"
        disabled={busy || !user?.organization_id}
        onClick={() => void download()}
      >
        <Download className="h-4 w-4" />
        {busy ? "Exporting…" : "Download FLAG worksheet (.xlsx)"}
      </button>
      {error ? <p className="text-sm text-rose-700">{error}</p> : null}
    </div>
  );
}
