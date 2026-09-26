"use client";

import {
  PlantationOperationalReportPage,
  resolvedFilter,
  schemeFilter,
  standardLocationFilters,
  type OperationalReportConfig,
} from "@/components/reports/plantation-operational-report-page";
import { plantationReportApi } from "@/lib/plantation-report-api";

function jsonReport<T extends Record<string, unknown>>(
  fn: (p: Record<string, unknown>) => ReturnType<typeof plantationReportApi.projectWise>,
) {
  return async (params: Record<string, unknown>) => {
    const res = (await fn(params)) as { items: T[]; total: number };
    return { items: res.items as Record<string, unknown>[], total: res.total };
  };
}

export const EXTENDED_PLANTATION_REPORTS: Record<string, OperationalReportConfig> = {
  "species-wise": {
    titleKey: "reportSpeciesWise",
    descKey: "reportSpeciesWiseDesc",
    filenameStem: "species-wise-report",
    queryKey: "plantation-report-species-wise",
    emptyKey: "noTrees",
    columns: [
      { key: "species", labelKey: "colSpecies" },
      { key: "count", labelKey: "colCount" },
      { key: "pct_of_total", labelKey: "colPctOfTotal" },
      { key: "avg_health_score", labelKey: "colAvgHealth" },
      { key: "total_carbon_kg", labelKey: "colCarbonKg" },
      { key: "total_co2e_t", labelKey: "colTco2e" },
    ],
    fetch: jsonReport((p) => plantationReportApi.speciesWise(p)),
    exportFn: (p, format) => plantationReportApi.speciesWise({ ...p, format }) as Promise<Blob>,
    filters: standardLocationFilters,
  },
  "work-area": {
    titleKey: "reportWorkArea",
    descKey: "reportWorkAreaDesc",
    filenameStem: "work-area-site-report",
    queryKey: "plantation-report-work-area",
    columns: [
      { key: "work_area_name", labelKey: "colWorkArea" },
      { key: "project_name", labelKey: "colProject" },
      { key: "area_ha", labelKey: "colAreaHa" },
      { key: "tree_count", labelKey: "colTrees" },
      { key: "tree_density_per_ha", labelKey: "colDensityHa" },
      { key: "ndvi_mean", labelKey: "colNdvi" },
      { key: "ndvi_change_vs_baseline", labelKey: "colDeltaBaseline" },
      { key: "sar_alert", labelKey: "colSarAlert" },
    ],
    fetch: jsonReport((p) => plantationReportApi.workAreaSite(p)),
    exportFn: (p, format) => plantationReportApi.workAreaSite({ ...p, format }) as Promise<Blob>,
    filters: standardLocationFilters,
  },
  "survival-mortality": {
    titleKey: "reportSurvivalMortality",
    descKey: "reportSurvivalMortalityDesc",
    filenameStem: "survival-mortality-report",
    queryKey: "plantation-report-survival-mortality",
    columns: [
      { key: "project_name", labelKey: "colProject" },
      { key: "financial_year", labelKey: "colFy" },
      { key: "live_count", labelKey: "colLive" },
      { key: "stressed_count", labelKey: "colStressed" },
      { key: "dead_count", labelKey: "colDead" },
      { key: "mortality_pct", labelKey: "colMortalityPct" },
      { key: "replacement_needed", labelKey: "colReplacement" },
    ],
    fetch: jsonReport((p) => plantationReportApi.survivalMortality(p)),
    exportFn: (p, format) => plantationReportApi.survivalMortality({ ...p, format }) as Promise<Blob>,
    filters: (props) => (
      <>
        {standardLocationFilters(props)}
        {schemeFilter(props)}
      </>
    ),
  },
  "compliance-violations": {
    titleKey: "reportComplianceViolations",
    descKey: "reportComplianceViolationsDesc",
    filenameStem: "compliance-violations-report",
    queryKey: "plantation-report-compliance-violations",
    columns: [
      { key: "violation_type", labelKey: "colType" },
      { key: "severity", labelKey: "colSeverity" },
      { key: "project_name", labelKey: "colProject" },
      { key: "work_area_name", labelKey: "colWorkArea" },
      { key: "tree_code", labelKey: "colTree" },
      { key: "resolved", labelKey: "colResolved" },
    ],
    fetch: jsonReport((p) => plantationReportApi.complianceViolations(p)),
    exportFn: (p, format) => plantationReportApi.complianceViolations({ ...p, format }) as Promise<Blob>,
    filters: resolvedFilter,
  },
  "satellite-health": {
    titleKey: "reportSatelliteHealth",
    descKey: "reportSatelliteHealthDesc",
    filenameStem: "satellite-health-report",
    queryKey: "plantation-report-satellite-health",
    columns: [
      { key: "work_area_name", labelKey: "colWorkArea" },
      { key: "project_name", labelKey: "colProject" },
      { key: "ndvi_mean", labelKey: "colNdviMean" },
      { key: "ndvi_change_vs_baseline", labelKey: "colDeltaBaseline" },
      { key: "alert_count", labelKey: "colAlerts" },
      { key: "last_scan_at", labelKey: "colLastScan" },
    ],
    fetch: jsonReport((p) => plantationReportApi.satelliteHealth(p)),
    exportFn: (p, format) => plantationReportApi.satelliteHealth({ ...p, format }) as Promise<Blob>,
    filters: standardLocationFilters,
  },
  "scheme-kpi": {
    titleKey: "reportSchemeKpi",
    descKey: "reportSchemeKpiDesc",
    filenameStem: "scheme-kpi-report",
    queryKey: "plantation-report-scheme-kpi",
    columns: [
      { key: "project_name", labelKey: "colProject" },
      { key: "scheme_label", labelKey: "colScheme" },
      { key: "status", labelKey: "colStatus" },
      { key: "survival_pct", labelKey: "colSurvivalPct" },
      { key: "survival_target_pct", labelKey: "colTargetPct" },
      { key: "geo_tagged_pct", labelKey: "colGeoTagPct" },
      { key: "scan_coverage_pct", labelKey: "colScanPct" },
    ],
    fetch: jsonReport((p) => plantationReportApi.schemeKpi(p)),
    exportFn: (p, format) => plantationReportApi.schemeKpi({ ...p, format }) as Promise<Blob>,
    filters: (props) => (
      <>
        {standardLocationFilters(props)}
        {schemeFilter(props)}
      </>
    ),
  },
  "field-team": {
    titleKey: "reportFieldTeam",
    descKey: "reportFieldTeamDesc",
    filenameStem: "field-team-performance-report",
    queryKey: "plantation-report-field-team",
    columns: [
      { key: "worker_name", labelKey: "colWorker" },
      { key: "trees_registered", labelKey: "colTreesRegistered" },
      { key: "regeotag_due", labelKey: "colReGeotagDue" },
      { key: "regeotag_completion_pct", labelKey: "colCompletionPct" },
    ],
    fetch: jsonReport((p) => plantationReportApi.fieldTeamPerformance(p)),
    exportFn: (p, format) => plantationReportApi.fieldTeamPerformance({ ...p, format }) as Promise<Blob>,
    filters: standardLocationFilters,
  },
  "carbon-stock": {
    titleKey: "reportCarbonStock",
    descKey: "reportCarbonStockDesc",
    filenameStem: "carbon-stock-report",
    queryKey: "plantation-report-carbon-stock",
    columns: [
      { key: "label", labelKey: "colGroup" },
      { key: "financial_year", labelKey: "colFy" },
      { key: "tree_count", labelKey: "colTrees" },
      { key: "total_tco2e", labelKey: "colTco2e" },
      { key: "tco2e_low", labelKey: "colLow" },
      { key: "tco2e_high", labelKey: "colHigh" },
    ],
    fetch: jsonReport((p) => plantationReportApi.carbonStock(p)),
    exportFn: (p, format) => plantationReportApi.carbonStock({ ...p, format }) as Promise<Blob>,
    filters: standardLocationFilters,
  },
  "photo-evidence": {
    titleKey: "reportPhotoEvidence",
    descKey: "reportPhotoEvidenceDesc",
    filenameStem: "photo-evidence-pack",
    queryKey: "plantation-report-photo-evidence",
    emptyKey: "noTrees",
    columns: [
      { key: "tree_code", labelKey: "colTreeCode" },
      {
        key: "photo_url",
        labelKey: "colPhoto",
        render: (row, t) =>
          row.photo_url ? (
            <a href={String(row.photo_url)} target="_blank" rel="noreferrer" className="text-forest-700 hover:underline">
              {t("colView")}
            </a>
          ) : (
            "—"
          ),
      },
      { key: "photo_date", labelKey: "colDate" },
      { key: "gps_match", labelKey: "colGpsMatch" },
    ],
    fetch: jsonReport((p) => plantationReportApi.photoEvidence(p)),
    exportFn: (p, format) => plantationReportApi.photoEvidence({ ...p, format }) as Promise<Blob>,
    filters: standardLocationFilters,
  },
  "district-block": {
    titleKey: "reportDistrictBlock",
    descKey: "reportDistrictBlockDesc",
    filenameStem: "district-block-admin-report",
    queryKey: "plantation-report-district-block",
    columns: [
      { key: "state_name", labelKey: "colState" },
      { key: "district_name", labelKey: "colDistrict" },
      { key: "block_name", labelKey: "colBlock" },
      { key: "project_count", labelKey: "colProjects" },
      { key: "registered_trees", labelKey: "colRegistered" },
      { key: "gap", labelKey: "colGap" },
    ],
    fetch: jsonReport((p) => plantationReportApi.districtBlockAdmin(p)),
    exportFn: (p, format) => plantationReportApi.districtBlockAdmin({ ...p, format }) as Promise<Blob>,
    filters: standardLocationFilters,
  },
  "pending-registration": {
    titleKey: "reportPendingRegistration",
    descKey: "reportPendingRegistrationDesc",
    filenameStem: "pending-registration-report",
    queryKey: "plantation-report-pending-registration",
    columns: [
      { key: "project_name", labelKey: "colProject" },
      { key: "financial_year", labelKey: "colFy" },
      { key: "target_trees", labelKey: "colTarget" },
      { key: "registered_trees", labelKey: "colRegistered" },
      { key: "pending_trees", labelKey: "colPending" },
      { key: "progress_pct", labelKey: "colProgressPct" },
    ],
    fetch: jsonReport((p) => plantationReportApi.pendingRegistration(p)),
    exportFn: (p, format) => plantationReportApi.pendingRegistration({ ...p, format }) as Promise<Blob>,
    filters: standardLocationFilters,
  },
  "out-of-fence": {
    titleKey: "reportOutOfFence",
    descKey: "reportOutOfFenceDesc",
    filenameStem: "out-of-fence-trees-report",
    queryKey: "plantation-report-out-of-fence",
    emptyKey: "noTrees",
    columns: [
      { key: "tree_code", labelKey: "colTreeCode" },
      { key: "project_name", labelKey: "colProject" },
      { key: "work_area_name", labelKey: "colWorkArea" },
      { key: "latitude", labelKey: "colLat" },
      { key: "longitude", labelKey: "colLon" },
      { key: "issue", labelKey: "colIssue" },
    ],
    fetch: jsonReport((p) => plantationReportApi.outOfFence(p)),
    exportFn: (p, format) => plantationReportApi.outOfFence({ ...p, format }) as Promise<Blob>,
  },
};

export function ExtendedPlantationReportPage({ slug }: { slug: string }) {
  const config = EXTENDED_PLANTATION_REPORTS[slug];
  if (!config) return null;
  return <PlantationOperationalReportPage config={config} />;
}
