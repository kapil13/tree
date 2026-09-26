"use client";

import { useTranslations } from "next-intl";
import type { CommandCenterChartId, CommandCenterFocus } from "@/lib/command-center-focus";
import { isChartHighlighted } from "@/lib/command-center-focus";
import { TrendChartBlock, type TrendChartBlockProps } from "@/components/dashboard/trend-chart-block";

export type TrendChartConfig = TrendChartBlockProps & { chartId: CommandCenterChartId };

export function CommandCenterTrendsCanvas({
  charts,
  focus,
  onChartSelect,
}: {
  charts: TrendChartConfig[];
  focus: CommandCenterFocus;
  onChartSelect: (chartId: CommandCenterChartId) => void;
}) {
  const te = useTranslations("executive");

  return (
    <section className="cc-trends-section" aria-label={te("trendsCanvas")}>
      <div className="cc-trends-head">
        <h2 className="cc-trends-title">{te("trendsCanvas")}</h2>
        {focus.signalId ? (
          <p className="cc-trends-focus">{te("focusSignal", { signal: focus.signalId })}</p>
        ) : null}
      </div>
      <div className="cc-trends-canvas">
        {charts.map((chart) => (
          <TrendChartBlock
            key={chart.chartId}
            {...chart}
            highlighted={isChartHighlighted(chart.chartId, focus)}
            onClick={() => onChartSelect(chart.chartId)}
          />
        ))}
      </div>
    </section>
  );
}
