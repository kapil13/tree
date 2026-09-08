"use client";

import { cn } from "@/lib/cn";
import { SeriesTrendChart, type SeriesPoint } from "@/components/dashboard/series-trend-chart";

export type TrendChartBlockProps = {
  id: string;
  title: string;
  value: string;
  valueTone?: "up" | "down" | "warn";
  target?: string;
  meta?: string[];
  anomaly?: string;
  series: SeriesPoint[];
  seriesColor?: string;
  baseline?: number;
  targetValue?: number;
  domain?: [number | "auto", number | "auto"];
  valueFormatter?: (value: number) => string;
  highlighted?: boolean;
  onClick?: () => void;
};

export function TrendChartBlock({
  title,
  value,
  valueTone,
  target,
  meta,
  anomaly,
  series,
  seriesColor,
  baseline,
  targetValue,
  domain,
  valueFormatter,
  highlighted,
  onClick,
}: TrendChartBlockProps) {
  return (
    <button
      type="button"
      className={cn("cc-chart-block", highlighted && "cc-chart-block--highlight")}
      onClick={onClick}
    >
      <div className="cc-chart-head">
        <span className="cc-chart-title">{title}</span>
        <div className="cc-chart-value-row">
          <span
            className={cn(
              "cc-chart-value",
              valueTone === "down" && "cc-chart-value--down",
              valueTone === "warn" && "cc-chart-value--warn",
              valueTone === "up" && "cc-chart-value--up",
            )}
          >
            {value}
          </span>
          {target ? <span className="cc-chart-target">{target}</span> : null}
        </div>
      </div>
      <SeriesTrendChart
        data={series}
        color={seriesColor}
        baseline={baseline}
        target={targetValue}
        domain={domain}
        valueFormatter={valueFormatter}
      />
      {(meta?.length || anomaly) ? (
        <div className="cc-chart-meta">
          {meta?.map((m) => (
            <span key={m}>{m}</span>
          ))}
          {anomaly ? <span className="cc-chart-anomaly">{anomaly}</span> : null}
        </div>
      ) : null}
    </button>
  );
}
