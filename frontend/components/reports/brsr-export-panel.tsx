"use client";

import { useState } from "react";
import { Building2, Download } from "lucide-react";
import { api, errorMessage } from "@/lib/api";
import { downloadBlob } from "@/lib/download-blob";
import { useAuth } from "@/lib/auth-store";
import { isOrgViewer } from "@/lib/nav-access";

type BrsrFormat = "json" | "xlsx" | "zip";

type BrsrExportPanelProps = {
  defaultProjectId?: string;
  defaultReportingYear?: number;
};

export function BrsrExportPanel({
  defaultProjectId,
  defaultReportingYear,
}: BrsrExportPanelProps = {}) {
  const { user } = useAuth();
  const [format, setFormat] = useState<BrsrFormat>("zip");
  const [projectId, setProjectId] = useState(defaultProjectId ?? "");
  const [reportingYear, setReportingYear] = useState(
    defaultReportingYear ?? new Date().getFullYear(),
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isViewer = isOrgViewer(user);

  async function download() {
    setBusy(true);
    setError(null);
    try {
      const response = await api.post(
        "/v1/reports/brsr",
        {
          project_id: projectId.trim() || null,
          reporting_year: reportingYear,
          format,
        },
        { responseType: "blob" },
      );
      const ext = format === "zip" ? "zip" : format === "xlsx" ? "xlsx" : "json";
      downloadBlob(response.data as Blob, `brsr-principle-6.${ext}`);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card space-y-4">
      <div className="flex items-center gap-2">
        <Building2 className="h-5 w-5 text-forest-700" />
        <h2 className="text-lg font-semibold">BRSR Core — Principle 6 (Environment)</h2>
      </div>
      <p className="text-sm text-stone-600">
        SEBI BRSR Core 2024 mapping for listed-company assurance: GHG inventory line items with
        scope/category tags, 90% uncertainty bands, verifier attestations, and signed evidence references.
      </p>
      {isViewer ? (
        <p className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-900">
          Your <strong>viewer</strong> role grants auditor read-only access to download this assurance pack.
        </p>
      ) : (
        <p className="text-xs text-stone-500">
          Invite external auditors with org role <code className="rounded bg-stone-100 px-1">viewer</code> for
          read-only BRSR export access.
        </p>
      )}
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label className="label">Format</label>
          <select
            className="input"
            value={format}
            onChange={(e) => setFormat(e.target.value as BrsrFormat)}
          >
            <option value="zip">Assurance pack (JSON + Excel)</option>
            <option value="json">JSON only</option>
            <option value="xlsx">Excel only</option>
          </select>
        </div>
        <div>
          <label className="label">Reporting year</label>
          <input
            className="input w-28"
            type="number"
            min={2000}
            max={2100}
            value={reportingYear}
            onChange={(e) => setReportingYear(Number(e.target.value))}
          />
        </div>
        <div>
          <label className="label">Project ID (optional)</label>
          <input
            className="input min-w-[240px]"
            placeholder="Leave blank for org portfolio"
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
          />
        </div>
        <button
          type="button"
          className="btn-primary inline-flex items-center gap-1.5"
          disabled={busy || !user?.organization_id}
          onClick={() => void download()}
        >
          <Download className="h-4 w-4" />
          {busy ? "Exporting…" : "Export BRSR"}
        </button>
      </div>
      {!user?.organization_id && (
        <p className="text-xs text-amber-700">Join an organization to export BRSR reports.</p>
      )}
      {error && (
        <p className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>
      )}
    </div>
  );
}
