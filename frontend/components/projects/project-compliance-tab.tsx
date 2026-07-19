"use client";

import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle, Download } from "lucide-react";
import { plantingProjects } from "@/lib/api";

const SEVERITY_CLASS: Record<string, string> = {
  block: "bg-rose-100 text-rose-900",
  warn: "bg-amber-100 text-amber-900",
  audit: "bg-stone-100 text-stone-700",
};

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function ProjectComplianceTab({
  projectId,
  projectCode,
}: {
  projectId: string;
  projectCode?: string;
}) {
  const qc = useQueryClient();
  const { data: violations = [], isLoading } = useQuery({
    queryKey: ["project-violations", projectId],
    queryFn: () => plantingProjects.complianceViolations(projectId, true),
  });

  const resolve = useMutation({
    mutationFn: (violationId: string) =>
      plantingProjects.resolveViolation(projectId, violationId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["project-violations", projectId] });
      qc.invalidateQueries({ queryKey: ["planting-project", projectId] });
    },
  });

  const exportMrv = useMutation({
    mutationFn: (format: "pdf" | "xlsx") => plantingProjects.exportMrv(projectId, format),
    onSuccess: (blob, format) => {
      const code = (projectCode || "project").replace(/\//g, "-");
      downloadBlob(blob, `${code}-mrv-compliance.${format}`);
    },
  });

  if (isLoading) return <p className="text-sm text-stone-500">Loading compliance records…</p>;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-stone-600">
          Export a full MRV bundle with work areas, tree registry, violations, and survival stats.
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            className="btn-secondary text-xs"
            disabled={exportMrv.isPending}
            onClick={() => exportMrv.mutate("pdf")}
          >
            <Download className="h-3.5 w-3.5" />
            {exportMrv.isPending ? "Exporting…" : "MRV PDF"}
          </button>
          <button
            type="button"
            className="btn-secondary text-xs"
            disabled={exportMrv.isPending}
            onClick={() => exportMrv.mutate("xlsx")}
          >
            <Download className="h-3.5 w-3.5" />
            Excel
          </button>
        </div>
      </div>

      {!violations.length ? (
        <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-900">
          No open compliance violations for this project.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-stone-200">
          <table className="min-w-full text-sm">
            <thead className="bg-stone-50 text-left text-stone-600">
              <tr>
                <th className="px-4 py-2.5 font-medium">Severity</th>
                <th className="px-4 py-2.5 font-medium">Type</th>
                <th className="px-4 py-2.5 font-medium">Message</th>
                <th className="px-4 py-2.5 font-medium">Tree</th>
                <th className="px-4 py-2.5 font-medium">Date</th>
                <th className="px-4 py-2.5 font-medium" />
              </tr>
            </thead>
            <tbody>
              {violations.map((v) => (
                <tr key={v.id} className="border-t border-stone-100">
                  <td className="px-4 py-2.5">
                    <span
                      className={`rounded px-2 py-0.5 text-xs font-medium capitalize ${SEVERITY_CLASS[v.severity] ?? SEVERITY_CLASS.warn}`}
                    >
                      {v.severity}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 font-mono text-xs">{v.violation_type}</td>
                  <td className="px-4 py-2.5">{v.message}</td>
                  <td className="px-4 py-2.5">
                    {v.tree_id ? (
                      <Link href={`/trees/${v.tree_id}`} className="text-forest-700 hover:underline">
                        View tree
                      </Link>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-stone-500">
                    {new Date(v.created_at).toLocaleString()}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <button
                      type="button"
                      className="btn-secondary text-xs"
                      disabled={resolve.isPending}
                      onClick={() => resolve.mutate(v.id)}
                    >
                      <CheckCircle className="h-3 w-3" />
                      Resolve
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
