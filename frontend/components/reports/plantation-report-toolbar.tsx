"use client";

import { FileSpreadsheet, FileText, Loader2 } from "lucide-react";
import { useState } from "react";
import { plantationReportApi, type PlantationReportFormat } from "@/lib/plantation-report-api";

type ExportFn = (format: Exclude<PlantationReportFormat, "json">) => Promise<Blob>;

export function PlantationReportExport({
  filenameStem,
  disabled,
  onExport,
}: {
  filenameStem: string;
  disabled?: boolean;
  onExport: ExportFn;
}) {
  const [busy, setBusy] = useState<PlantationReportFormat | null>(null);

  async function run(format: Exclude<PlantationReportFormat, "json">) {
    setBusy(format);
    try {
      const blob = await onExport(format);
      plantationReportApi.download(blob, `${filenameStem}.${format === "xlsx" ? "xlsx" : "pdf"}`);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        className="btn-secondary text-sm"
        disabled={disabled || busy !== null}
        onClick={() => run("xlsx")}
      >
        {busy === "xlsx" ? (
          <Loader2 className="mr-1.5 inline h-4 w-4 animate-spin" aria-hidden />
        ) : (
          <FileSpreadsheet className="mr-1.5 inline h-4 w-4" aria-hidden />
        )}
        Export Excel
      </button>
      <button
        type="button"
        className="btn-secondary text-sm"
        disabled={disabled || busy !== null}
        onClick={() => run("pdf")}
      >
        {busy === "pdf" ? (
          <Loader2 className="mr-1.5 inline h-4 w-4 animate-spin" aria-hidden />
        ) : (
          <FileText className="mr-1.5 inline h-4 w-4" aria-hidden />
        )}
        Export PDF
      </button>
    </div>
  );
}

export function PlantationReportFilters({
  children,
  onReset,
}: {
  children: React.ReactNode;
  onReset?: () => void;
}) {
  return (
    <div className="mb-4 rounded-xl border border-stone-200 bg-white p-4 dark:border-stone-800 dark:bg-stone-950">
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className="text-sm font-medium text-stone-800 dark:text-stone-100">Filters</p>
        {onReset ? (
          <button type="button" className="text-xs font-medium text-stone-500 hover:text-stone-800" onClick={onReset}>
            Reset
          </button>
        ) : null}
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{children}</div>
    </div>
  );
}

export function FilterField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block text-xs font-medium text-stone-500">{label}</span>
      {children}
    </label>
  );
}

export function filterSelectClassName() {
  return "input w-full text-sm";
}
