"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Bird, Mic } from "lucide-react";
import { bioacoustic, plantationFences } from "@/lib/api";
import { PortfolioKpiCard } from "./portfolio-kpi-card";

export function PortfolioBiodiversityTab() {
  const { data: bio, isLoading: bioLoading } = useQuery({
    queryKey: ["bio-summary"],
    queryFn: () => bioacoustic.summary(),
  });

  const { data: fences, isLoading: fencesLoading } = useQuery({
    queryKey: ["plantation-fences-bio"],
    queryFn: () => plantationFences.list({ page_size: 10 }),
  });

  if (bioLoading || fencesLoading) {
    return <p className="text-sm text-stone-500">Loading biodiversity signals…</p>;
  }

  const fenceItems = fences?.items ?? [];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <PortfolioKpiCard
          icon={Mic}
          label="Analyzed recordings"
          value={String(bio?.analyzed_recordings ?? 0)}
        />
        <PortfolioKpiCard
          icon={Bird}
          label="Species detected"
          value={String(bio?.total_species_detected ?? 0)}
        />
        <PortfolioKpiCard
          icon={Bird}
          label="Avg health score"
          value={bio?.avg_health_score != null ? bio.avg_health_score.toFixed(0) : "—"}
        />
        <PortfolioKpiCard
          icon={Mic}
          label="Plantation sites"
          value={String(fenceItems.length)}
        />
      </div>

      <section className="card">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-medium">Bioacoustic portfolio</h2>
            <p className="mt-1 text-sm text-stone-600">
              Field recordings power species richness, Shannon diversity, and ecosystem health scores.
            </p>
          </div>
          <Link href="/bioacoustic" className="btn-primary text-xs">
            Record biodiversity
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {fenceItems.length === 0 ? (
          <p className="mt-4 text-sm text-stone-500">
            No plantation sites yet. Draw work areas on a project, then record soundscapes from the
            Biodiversity page.
          </p>
        ) : (
          <ul className="mt-4 divide-y divide-stone-100 rounded-lg border border-stone-200">
            {fenceItems.map((fence) => (
              <li key={fence.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm">
                <div>
                  <p className="font-medium text-stone-900">{fence.name}</p>
                  <p className="text-xs text-stone-500">
                    {fence.area_ha != null ? `${fence.area_ha.toFixed(1)} ha` : "Site"} · NDVI{" "}
                    {fence.latest_ndvi_mean != null ? fence.latest_ndvi_mean.toFixed(2) : "—"}
                  </p>
                </div>
                <Link href="/bioacoustic" className="text-xs text-forest-700 hover:underline">
                  View recordings
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
