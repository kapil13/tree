"use client";

import { useState } from "react";
import { FileBarChart, Download } from "lucide-react";
import { useTranslations } from "next-intl";
import { api, errorMessage } from "@/lib/api";
import { downloadBlob } from "@/lib/download-blob";

type IsoFormat = "json" | "xlsx" | "zip";

export function Iso14064ExportPanel() {
  const t = useTranslations("reports");
  const tc = useTranslations("common");
  const [format, setFormat] = useState<IsoFormat>("zip");
  const [projectId, setProjectId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function download() {
    const pid = projectId.trim();
    if (!pid) {
      setError(t("projectIdPlaceholder"));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const response = await api.post(
        "/v1/reports/iso14064",
        { project_id: pid, format },
        { responseType: "blob" },
      );
      const ext = format === "zip" ? "zip" : format === "xlsx" ? "xlsx" : "json";
      downloadBlob(response.data as Blob, `iso14064-project.${ext}`);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card space-y-4">
      <div className="flex items-center gap-2">
        <FileBarChart className="h-5 w-5 text-forest-700" aria-hidden />
        <h2 className="text-lg font-semibold">{t("iso14064Title")}</h2>
      </div>
      <p className="text-sm text-stone-600">{t("iso14064Description")}</p>
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label className="label" htmlFor="iso14064-project-id">
            {t("projectId")}
          </label>
          <input
            id="iso14064-project-id"
            className="input min-w-[280px]"
            placeholder={t("projectIdPlaceholder")}
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
            required
          />
        </div>
        <div>
          <label className="label" htmlFor="iso14064-format">
            Format
          </label>
          <select
            id="iso14064-format"
            className="input"
            value={format}
            onChange={(e) => setFormat(e.target.value as IsoFormat)}
          >
            <option value="zip">{t("formatZip")}</option>
            <option value="json">{t("formatJson")}</option>
            <option value="xlsx">{t("formatXlsx")}</option>
          </select>
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
