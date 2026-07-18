"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { plantingProjects } from "@/lib/api";

const SEVERITY_CLASS: Record<string, string> = {
  block: "bg-rose-100 text-rose-900",
  warn: "bg-amber-100 text-amber-900",
  audit: "bg-stone-100 text-stone-700",
};

export function ProjectComplianceTab({ projectId }: { projectId: string }) {
  const { data: violations = [], isLoading } = useQuery({
    queryKey: ["project-violations", projectId],
    queryFn: () => plantingProjects.complianceViolations(projectId, true),
  });

  if (isLoading) return <p className="text-sm text-stone-500">Loading compliance records…</p>;

  if (!violations.length) {
    return (
      <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-900">
        No open compliance violations for this project.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-stone-200">
      <table className="min-w-full text-sm">
        <thead className="bg-stone-50 text-left text-stone-600">
          <tr>
            <th className="px-4 py-2.5 font-medium">Severity</th>
            <th className="px-4 py-2.5 font-medium">Type</th>
            <th className="px-4 py-2.5 font-medium">Message</th>
            <th className="px-4 py-2.5 font-medium">Tree</th>
            <th className="px-4 py-2.5 font-medium">Date</th>
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
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
