"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Cloud } from "lucide-react";
import { emissionsPortfolio } from "@/lib/api";
import { emissionsHref, DEMO_GHG_PROJECT_CODE } from "@/lib/emissions-links";

export function EmissionsDashboardStrip() {
  const { data } = useQuery({
    queryKey: ["emissions-portfolio-summary"],
    queryFn: () => emissionsPortfolio.summary(),
    staleTime: 60_000,
  });

  if (!data || data.kpis.monitored_sites === 0) return null;

  const demoSite = data.sites.find((s) => s.project_code === DEMO_GHG_PROJECT_CODE);

  return (
    <section className="card space-y-3" aria-labelledby="dashboard-ghg-heading">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Cloud className="h-5 w-5 text-forest-700" aria-hidden />
          <h2 id="dashboard-ghg-heading" className="text-sm font-semibold text-stone-900">
            Atmospheric GHG
          </h2>
        </div>
        <Link href={emissionsHref()} className="text-xs font-medium text-forest-700 hover:underline">
          Open emissions workspace →
        </Link>
      </div>
      <div className="grid gap-3 sm:grid-cols-4">
        <div className="rounded-lg border border-stone-200 bg-stone-50/80 px-3 py-2 text-sm">
          <p className="text-xs text-stone-500">Sites monitored</p>
          <p className="text-lg font-semibold">{data.kpis.monitored_sites}</p>
        </div>
        <div className="rounded-lg border border-stone-200 bg-stone-50/80 px-3 py-2 text-sm">
          <p className="text-xs text-stone-500">Misaligned</p>
          <p className="text-lg font-semibold text-rose-700">{data.kpis.misaligned_sites}</p>
        </div>
        <div className="rounded-lg border border-stone-200 bg-stone-50/80 px-3 py-2 text-sm">
          <p className="text-xs text-stone-500">Strong anomaly</p>
          <p className="text-lg font-semibold text-amber-800">{data.kpis.strong_anomaly_sites}</p>
        </div>
        <div className="rounded-lg border border-stone-200 bg-stone-50/80 px-3 py-2 text-sm">
          <p className="text-xs text-stone-500">CH₄ sources</p>
          <p className="text-lg font-semibold text-forest-800">{data.kpis.ch4_active_sources}</p>
        </div>
      </div>
      {demoSite ? (
        <p className="text-xs text-stone-600">
          Demo showcase:{" "}
          <Link
            href={emissionsHref({
              projectId: demoSite.project_id,
              workAreaId: demoSite.work_area_id,
            })}
            className="font-medium text-forest-700 hover:underline"
          >
            {demoSite.work_area_name}
          </Link>
        </p>
      ) : null}
    </section>
  );
}
