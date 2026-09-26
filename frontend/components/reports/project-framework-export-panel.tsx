"use client";

import { useState, type ReactNode } from "react";
import { Download } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import {
  type FrameworkProfileCode,
  errorMessage,
  plantingProjects,
  reporting,
} from "@/lib/api";
import { downloadBlob } from "@/lib/download-blob";

type ProjectFrameworkExportPanelProps = {
  profile: FrameworkProfileCode;
  title: string;
  description: string;
  icon?: ReactNode;
};

export function ProjectFrameworkExportPanel({
  profile,
  title,
  description,
  icon,
}: ProjectFrameworkExportPanelProps) {
  const tr = useTranslations("reports");
  const tc = useTranslations("common");
  const [format, setFormat] = useState<"pdf" | "xlsx">("pdf");
  const [projectId, setProjectId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: frameworks = [] } = useQuery({
    queryKey: ["reporting-frameworks"],
    queryFn: () => reporting.frameworks(),
  });

  const meta = frameworks.find((f) => f.code === profile);

  async function download() {
    const pid = projectId.trim();
    if (!pid) {
      setError(tr("projectIdPlaceholder"));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const blob = await plantingProjects.exportFrameworkReport(pid, profile, format);
      downloadBlob(blob, `${profile}-framework-report.${format}`);
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
      {meta ? (
        <div className="rounded-lg border border-stone-200 bg-stone-50/80 px-4 py-3 text-xs text-stone-600">
          <p>
            <span className="font-medium text-stone-800">Reference:</span> {meta.reference}
          </p>
          {meta.disclaimer ? (
            <p className="mt-2 leading-relaxed text-stone-500">{meta.disclaimer}</p>
          ) : null}
        </div>
      ) : null}
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label className="label" htmlFor={`${profile}-format`}>
            Format
          </label>
          <select
            id={`${profile}-format`}
            className="input"
            value={format}
            onChange={(e) => setFormat(e.target.value as "pdf" | "xlsx")}
          >
            <option value="pdf">PDF</option>
            <option value="xlsx">{tr("formatXlsx")}</option>
          </select>
        </div>
        <div>
          <label className="label" htmlFor={`${profile}-project`}>
            {tr("projectId")}
          </label>
          <input
            id={`${profile}-project`}
            className="input min-w-[280px]"
            placeholder={tr("projectIdPlaceholder")}
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
            required
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
