"use client";

import { SeriesTrendChart } from "@/components/dashboard/series-trend-chart";
import type { FenceTrends } from "@/lib/api";

export function BiodiversityTrendsPanel({ trends }: { trends: FenceTrends | undefined }) {
  if (!trends || trends.series.length === 0) {
    return <p className="text-sm text-stone-500">Record and analyze multiple sessions to see trends.</p>;
  }

  const confidenceData = trends.series.map((p) => ({
    label: p.recorded_at ? new Date(p.recorded_at).toLocaleDateString() : "—",
    value: p.biodiversity_confidence_score,
  }));
  const speciesData = trends.series.map((p) => ({
    label: p.recorded_at ? new Date(p.recorded_at).toLocaleDateString() : "—",
    value: p.accepted_species_count,
  }));

  return (
    <div className="space-y-4">
      <p className="text-sm text-stone-600">
        Confidence trend: <span className="font-medium">{trends.confidence_trend}</span> · Species trend:{" "}
        <span className="font-medium">{trends.species_trend}</span>
      </p>
      <div>
        <p className="mb-1 text-xs font-medium text-stone-500">Biodiversity Confidence</p>
        <SeriesTrendChart data={confidenceData} domain={[0, 100]} height={120} />
      </div>
      <div>
        <p className="mb-1 text-xs font-medium text-stone-500">Accepted species</p>
        <SeriesTrendChart data={speciesData} color="#0ea5e9" height={120} />
      </div>
    </div>
  );
}
