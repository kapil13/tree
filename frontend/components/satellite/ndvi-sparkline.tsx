"use client";

type Point = { ts: string; ndvi: number };

export function NdviSparkline({ points, className }: { points: Point[]; className?: string }) {
  const data = points.filter((p) => p.ndvi != null && !Number.isNaN(p.ndvi)).slice(-12);
  if (data.length < 2) {
    return (
      <p className="text-xs text-stone-500">
        Run two or more NDVI scans to show vegetation trend.
      </p>
    );
  }

  const values = data.map((p) => p.ndvi);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = Math.max(0.05, max - min);
  const width = 240;
  const height = 56;
  const coords = values.map((v, i) => {
    const x = (i / (values.length - 1)) * width;
    const y = height - ((v - min) / span) * (height - 8) - 4;
    return `${x},${y}`;
  });

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className={className ?? "h-14 w-full"} aria-hidden>
      <polyline
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        className="text-emerald-600"
        points={coords.join(" ")}
      />
    </svg>
  );
}
