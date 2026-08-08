"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Bird, Mic } from "lucide-react";
import { bioacoustic, plantationFences } from "@/lib/api";
import { EmptyState } from "@/components/ui/empty-state";
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
  const analyzed = bio?.analyzed_recordings ?? 0;

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-forest-200 bg-gradient-to-br from-forest-50 to-white px-5 py-6 dark:border-forest-900 dark:from-forest-950/40 dark:to-stone-950">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="max-w-xl">
            <h2 className="text-lg font-semibold text-stone-900 dark:text-stone-50">
              Record soundscapes in the field
            </h2>
            <p className="mt-1 text-sm text-stone-600 dark:text-stone-400">
              Capture a short ambient recording to detect species and track ecosystem health for each site.
            </p>
          </div>
          <Link href="/bioacoustic" className="btn-primary">
            Open Biodiversity
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <PortfolioKpiCard
          icon={Mic}
          label="Analyzed recordings"
          value={String(analyzed)}
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
      </div>

      {fenceItems.length === 0 && analyzed === 0 ? (
        <EmptyState
          icon={Mic}
          title="No biodiversity recordings yet"
          description="Go to Biodiversity to record a site soundscape. Results will show up here across your portfolio."
          action={{ label: "Start recording", href: "/bioacoustic" }}
        />
      ) : fenceItems.length > 0 ? (
        <section className="card overflow-hidden p-0">
          <div className="flex items-center justify-between border-b border-stone-200 px-4 py-3">
            <h2 className="font-medium">Sites</h2>
            <Link href="/bioacoustic" className="text-xs font-medium text-forest-700 hover:underline">
              Record at a site
            </Link>
          </div>
          <ul className="divide-y divide-stone-100">
            {fenceItems.map((fence) => (
              <li key={fence.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm">
                <div>
                  <p className="font-medium text-stone-900">{fence.name}</p>
                  <p className="text-xs text-stone-500">
                    {fence.area_ha != null ? `${fence.area_ha.toFixed(1)} ha` : "Site"}
                  </p>
                </div>
                <Link href="/bioacoustic" className="text-xs text-forest-700 hover:underline">
                  Record / view
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
