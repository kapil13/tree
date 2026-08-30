import type { PlantingProject } from "@/lib/api";
import { isMonitoringScheme } from "@/lib/schemes";

export const SATELLITE_WATCH_METADATA_KEY = "satellite_watch_enabled";

/** Estate & Forest Watch — monitoring-only scheme (no planting programme UX). */
export function isMonitoringOnlyProject(
  project: Pick<PlantingProject, "scheme_code">,
): boolean {
  return isMonitoringScheme(project.scheme_code);
}

/** Satellite NDVI/SAR watch on work-area polygons (estate scheme or opt-in). */
export function isSatelliteWatchEnabled(
  project: Pick<PlantingProject, "scheme_code"> & {
    metadata?: PlantingProject["metadata"];
  },
): boolean {
  if (isMonitoringScheme(project.scheme_code)) return true;
  return Boolean(project.metadata?.[SATELLITE_WATCH_METADATA_KEY]);
}
