"use client";

export type NdviSatelliteRecord = {
  provider: string;
  scene_id: string;
  scene_acquired_at: string;
  cloud_cover_pct?: number | null;
  ndvi_mean: number | null;
  ndvi_max: number | null;
  ndvi_min: number | null;
  evi_mean: number | null;
  presence_confirmed?: boolean | null;
  change_vs_baseline?: number | null;
};

type Props = {
  latest: NdviSatelliteRecord | null | undefined;
  resolutionLabel?: string;
  className?: string;
};

function fmt(v: number | null | undefined, digits = 2): string {
  if (v == null || Number.isNaN(v)) return "—";
  return v.toFixed(digits);
}

function fmtPct(v: number | null | undefined): string {
  if (v == null || Number.isNaN(v)) return "—";
  return `${v.toFixed(1)}%`;
}

function fmtDate(iso: string | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function NdviRangeBar({
  min,
  mean,
  max,
}: {
  min: number | null;
  mean: number | null;
  max: number | null;
}) {
  if (min == null || max == null || mean == null) return null;
  const span = Math.max(0.01, max - min);
  const meanPos = ((mean - min) / span) * 100;
  return (
    <div className="mt-2">
      <div className="relative h-2 overflow-hidden rounded-full bg-gradient-to-r from-amber-700 via-lime-400 to-green-700">
        <div
          className="absolute top-0 h-full w-0.5 bg-white shadow"
          style={{ left: `${Math.min(100, Math.max(0, meanPos))}%` }}
          title={`Mean ${mean.toFixed(2)}`}
        />
      </div>
      <div className="mt-1 flex justify-between text-[10px] text-stone-500">
        <span>min {min.toFixed(2)}</span>
        <span>mean {mean.toFixed(2)}</span>
        <span>max {max.toFixed(2)}</span>
      </div>
    </div>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-lg bg-stone-50 px-2 py-1.5">
      <div className="text-[10px] font-medium uppercase tracking-wide text-stone-500">
        {label}
      </div>
      <div className="text-sm font-semibold text-stone-900">{value}</div>
      {hint && <div className="text-[10px] text-stone-400">{hint}</div>}
    </div>
  );
}

export function NdviStatsPanel({ latest, resolutionLabel = "10 m", className = "" }: Props) {
  if (!latest) {
    return (
      <div className={`rounded-lg border border-dashed border-stone-200 p-3 text-sm text-stone-500 ${className}`}>
        No satellite scan yet — run NDVI scan to see vegetation indices.
      </div>
    );
  }

  const change = latest.change_vs_baseline;
  const changeStr =
    change == null
      ? "—"
      : `${change >= 0 ? "+" : ""}${change.toFixed(3)}`;
  const changeColor =
    change == null ? "text-stone-900" : change >= 0 ? "text-green-700" : "text-amber-800";

  return (
    <div className={`space-y-3 ${className}`}>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        <Stat label="NDVI mean" value={fmt(latest.ndvi_mean)} hint={`Sentinel-2 · ${resolutionLabel}`} />
        <Stat label="NDVI min" value={fmt(latest.ndvi_min)} />
        <Stat label="NDVI max" value={fmt(latest.ndvi_max)} />
        <Stat label="EVI mean" value={fmt(latest.evi_mean)} hint="Enhanced Vegetation Index" />
        <Stat label="Cloud cover" value={fmtPct(latest.cloud_cover_pct)} />
        <Stat
          label="Δ vs baseline"
          value={changeStr}
          hint="12-month trailing change"
        />
      </div>

      <NdviRangeBar
        min={latest.ndvi_min}
        mean={latest.ndvi_mean}
        max={latest.ndvi_max}
      />

      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="rounded-lg bg-stone-50 px-2 py-1.5">
          <span className="text-stone-500">Presence</span>{" "}
          <span className="font-medium text-stone-800">
            {latest.presence_confirmed == null
              ? "—"
              : latest.presence_confirmed
                ? "✓ Vegetation detected"
                : "✗ Low signal"}
          </span>
        </div>
        <div className="rounded-lg bg-stone-50 px-2 py-1.5">
          <span className="text-stone-500">Scene date</span>{" "}
          <span className="font-medium text-stone-800">
            {fmtDate(latest.scene_acquired_at)}
          </span>
        </div>
        <div className="col-span-2 rounded-lg bg-stone-50 px-2 py-1.5">
          <span className="text-stone-500">Provider</span>{" "}
          <span className="font-medium text-stone-800">{latest.provider}</span>
          <span className="ml-2 font-mono text-[10px] text-stone-400">
            {latest.scene_id}
          </span>
        </div>
      </div>
    </div>
  );
}
