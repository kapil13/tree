"use client";

import dynamic from "next/dynamic";
import { PageHeader } from "@/components/ui/page-header";

const TreesMap = dynamic(
  () => import("@/components/trees-map").then((m) => ({ default: m.TreesMap })),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-64 items-center justify-center rounded-xl border border-stone-200 bg-stone-50 text-sm text-stone-500">
        Loading map…
      </div>
    ),
  },
);

export default function MapPage() {
  return (
    <div className="space-y-4">
      <PageHeader
        title="Map"
        description="Tap a tree for actions (AI, survival survey, passport). Clusters appear when zoomed out — green = healthy, amber = moderate, red = unhealthy."
        breadcrumbs={[{ label: "Operate" }, { label: "Map" }]}
      />
      <TreesMap mapType="roadmap" height="min(70vh, 640px)" showFilters />
    </div>
  );
}
