"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { emissionsPortfolio } from "@/lib/api";
import { emissionsHref } from "@/lib/emissions-links";

export function PortfolioEmissionsTab({ projectId }: { projectId?: string | null }) {
  const { data, isLoading } = useQuery({
    queryKey: ["emissions-portfolio-summary"],
    queryFn: () => emissionsPortfolio.summary(),
  });

  const sites = (data?.sites ?? []).filter((s) => !projectId || s.project_id === projectId);

  if (isLoading) {
    return <p className="text-sm text-stone-500">Loading atmospheric GHG rollup…</p>;
  }

  if (sites.length === 0) {
    return (
      <div className="card text-sm text-stone-600">
        No emission sources registered yet.{" "}
        <Link href="/emissions" className="font-medium text-forest-700 hover:underline">
          Open emissions workspace
        </Link>
      </div>
    );
  }

  return (
    <div className="card overflow-hidden">
      <table className="min-w-full text-sm">
        <thead className="bg-stone-50 text-left text-xs uppercase tracking-wide text-stone-500">
          <tr>
            <th className="px-4 py-2">Project</th>
            <th className="px-4 py-2">Work area</th>
            <th className="px-4 py-2">CH₄ sources</th>
            <th className="px-4 py-2">Anomaly</th>
            <th className="px-4 py-2">Fusion</th>
            <th className="px-4 py-2 text-right">Action</th>
          </tr>
        </thead>
        <tbody>
          {sites.map((site) => (
            <tr key={site.work_area_id} className="border-t border-stone-100">
              <td className="px-4 py-2">
                <span className="font-medium">{site.project_name}</span>
                <p className="text-xs text-stone-500">{site.project_code}</p>
              </td>
              <td className="px-4 py-2">{site.work_area_name}</td>
              <td className="px-4 py-2">{site.ch4_source_count}</td>
              <td className="px-4 py-2">
                {site.anomaly_ppb != null ? `+${site.anomaly_ppb} ppb` : "—"}
              </td>
              <td className="px-4 py-2 capitalize">
                {site.verdict?.replace("_", " ") ?? "—"}
              </td>
              <td className="px-4 py-2 text-right">
                <Link
                  href={emissionsHref({
                    projectId: site.project_id,
                    workAreaId: site.work_area_id,
                  })}
                  className="text-forest-700 hover:underline"
                >
                  Open
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
