"use client";

import { TreesMap } from "@/components/trees-map";

export default function MapPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Map</h1>
      <p className="text-sm text-stone-600">
        All registered trees on Google Maps. Green = healthy, amber = moderate, red =
        unhealthy.
      </p>
      <TreesMap mapType="roadmap" />
    </div>
  );
}
