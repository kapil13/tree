export type CommandCenterSignalId =
  | "ndvi"
  | "satellite"
  | "survival"
  | "alerts"
  | "bio"
  | "carbon"
  | "integrity"
  | "mrv";

export type CommandCenterChartId =
  | "ndvi"
  | "integrity"
  | "carbon"
  | "survival"
  | "satellite"
  | "bio";

export type CommandCenterFocus = {
  signalId: CommandCenterSignalId | null;
  priorityId: string | null;
};

export function priorityToSignal(priorityId: string | null): CommandCenterSignalId | null {
  switch (priorityId) {
    case "violations":
      return "mrv";
    case "alerts":
      return "alerts";
    case "scans":
      return "satellite";
    case "brief":
      return "ndvi";
    default:
      return null;
  }
}

export function signalToCharts(signalId: CommandCenterSignalId | null): CommandCenterChartId[] {
  if (!signalId) return [];
  switch (signalId) {
    case "ndvi":
    case "alerts":
      return ["ndvi", "satellite"];
    case "satellite":
      return ["satellite", "ndvi"];
    case "bio":
      return ["bio"];
    case "carbon":
      return ["carbon"];
    case "integrity":
      return ["integrity"];
    case "survival":
      return ["survival"];
    case "mrv":
      return ["satellite", "integrity"];
    default:
      return [];
  }
}

export function isChartHighlighted(
  chartId: CommandCenterChartId,
  focus: CommandCenterFocus,
): boolean {
  return signalToCharts(focus.signalId).includes(chartId);
}

export function signalFromChart(chartId: CommandCenterChartId): CommandCenterSignalId {
  return chartId === "integrity" ? "integrity" : chartId;
}
