"use client";

export default function SatellitePage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Satellite</h1>
      <div className="card">
        <p className="text-stone-700">
          The satellite monitoring pipeline scans every registered tree monthly using
          Sentinel-2 and Landsat imagery, computes NDVI / EVI, and flags vegetation loss
          or canopy degradation.
        </p>
        <p className="mt-3 text-sm text-stone-600">
          Open any tree to see its NDVI time-series. Plantation-level satellite views
          arrive in a follow-up sprint.
        </p>
      </div>
    </div>
  );
}
