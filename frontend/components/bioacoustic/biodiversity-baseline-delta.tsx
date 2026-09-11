"use client";

import type { BaselineDelta } from "@/lib/api";

export function BiodiversityBaselineDelta({ delta }: { delta: BaselineDelta | undefined }) {
  if (!delta) {
    return <p className="text-sm text-stone-500">Select a site to compare GBIF baseline vs acoustic detections.</p>;
  }

  if (!delta.snapshot_id) {
    return (
      <p className="text-sm text-amber-800">
        No GBIF baseline snapshot yet for this site. Baseline is captured automatically when intelligence jobs run.
      </p>
    );
  }

  return (
    <div className="space-y-3 text-sm">
      <p className="text-stone-600">
        Baseline {delta.baseline_species_count} species · Detected {delta.detected_accepted_count} accepted · Overlap{" "}
        {delta.overlap_pct}%
      </p>
      {delta.novel_detections.length > 0 && (
        <div>
          <p className="font-medium text-stone-700">Novel acoustic detections (not in baseline)</p>
          <p className="italic text-stone-500">{delta.novel_detections.slice(0, 8).join(", ")}</p>
        </div>
      )}
      {delta.baseline_not_yet_detected.length > 0 && (
        <div>
          <p className="font-medium text-stone-700">Baseline species not yet acoustically detected</p>
          <p className="italic text-stone-500">{delta.baseline_not_yet_detected.slice(0, 8).join(", ")}</p>
        </div>
      )}
    </div>
  );
}
