"use client";

import { useState, type ReactNode } from "react";
import { Download } from "lucide-react";
import { useTranslations } from "next-intl";
import { api, errorMessage } from "@/lib/api";
import { downloadBlob } from "@/lib/download-blob";

type ExportFormat = "json" | "xlsx" | "zip";

type FrameworkExportPanelProps = {
  title: string;
  description: string;
  endpoint: string;
  filenamePrefix: string;
  icon?: ReactNode;
  projectRequired?: boolean;
  formats?: ExportFormat[];
};

export function FrameworkExportPanel({
  title,
  description,
  endpoint,
  filenamePrefix,
  icon,
  projectRequired = false,
  formats = ["zip", "json", "xlsx"],
}: FrameworkExportPanelProps) {
  const tr = useTranslations("reports");
  const tc = useTranslations("common");
  const [format, setFormat] = useState<ExportFormat>(formats[0] ?? "zip");
  const [projectId, setProjectId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function download() {
    const pid = projectId.trim();
    if (projectRequired && !pid) {
      setError(tr("projectIdPlaceholder"));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const body: Record<string, unknown> = { format };
      if (projectRequired) {
        body.project_id = pid;
      } else {
        body.project_id = pid || null;
      }
      const response = await api.post(endpoint, body, { responseType: "blob" });
      const ext = format === "zip" ? "zip" : format === "xlsx" ? "xlsx" : "json";
      downloadBlob(response.data as Blob, `${filenamePrefix}.${ext}`);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card space-y-4">
      <div className="flex items-center gap-2">
        {icon}
        <h2 className="text-lg font-semibold">{title}</h2>
      </div>
      <p className="text-sm text-stone-600">{description}</p>
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label className="label" htmlFor={`${filenamePrefix}-format`}>
            Format
          </label>
          <select
            id={`${filenamePrefix}-format`}
            className="input"
            value={format}
            onChange={(e) => setFormat(e.target.value as ExportFormat)}
          >
            {formats.includes("zip") ? <option value="zip">{tr("formatZip")}</option> : null}
            {formats.includes("json") ? <option value="json">{tr("formatJson")}</option> : null}
            {formats.includes("xlsx") ? <option value="xlsx">{tr("formatXlsx")}</option> : null}
          </select>
        </div>
        <div>
          <label className="label" htmlFor={`${filenamePrefix}-project`}>
            {tr("projectId")} {projectRequired ? "" : "(optional)"}
          </label>
          <input
            id={`${filenamePrefix}-project`}
            className="input min-w-[280px]"
            placeholder={tr("projectIdPlaceholder")}
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
            required={projectRequired}
          />
        </div>
        <button
          type="button"
          className="btn-primary inline-flex items-center gap-2"
          onClick={() => void download()}
          disabled={busy}
        >
          <Download className="h-4 w-4" aria-hidden />
          {busy ? tc("loading") : tc("export")}
        </button>
      </div>
      {error ? (
        <p className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
