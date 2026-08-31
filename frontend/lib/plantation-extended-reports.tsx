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
      { key: "species", label: "Species" },
      { key: "count", label: "Count" },
      { key: "pct_of_total", label: "% of total" },
      { key: "avg_health_score", label: "Avg health" },
      { key: "total_carbon_kg", label: "Carbon kg" },
      { key: "total_co2e_t", label: "tCO₂e" },
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
      { key: "work_area_name", label: "Work area" },
      { key: "project_name", label: "Project" },
      { key: "area_ha", label: "Area (ha)" },
      { key: "tree_count", label: "Trees" },
      { key: "tree_density_per_ha", label: "Density/ha" },
      { key: "ndvi_mean", label: "NDVI" },
      { key: "ndvi_change_vs_baseline", label: "Δ baseline" },
      { key: "sar_alert", label: "SAR alert" },
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
      { key: "project_name", label: "Project" },
      { key: "financial_year", label: "FY" },
      { key: "live_count", label: "Live" },
      { key: "stressed_count", label: "Stressed" },
      { key: "dead_count", label: "Dead" },
      { key: "mortality_pct", label: "Mortality %" },
      { key: "replacement_needed", label: "Replacement" },
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
      { key: "violation_type", label: "Type" },
      { key: "severity", label: "Severity" },
      { key: "project_name", label: "Project" },
      { key: "work_area_name", label: "Work area" },
      { key: "tree_code", label: "Tree" },
      { key: "resolved", label: "Resolved" },
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
      { key: "work_area_name", label: "Work area" },
      { key: "project_name", label: "Project" },
      { key: "ndvi_mean", label: "NDVI mean" },
      { key: "ndvi_change_vs_baseline", label: "Δ baseline" },
      { key: "alert_count", label: "Alerts" },
      { key: "last_scan_at", label: "Last scan" },
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
      { key: "project_name", label: "Project" },
      { key: "scheme_label", label: "Scheme" },
      { key: "status", label: "Status" },
      { key: "survival_pct", label: "Survival %" },
      { key: "survival_target_pct", label: "Target %" },
      { key: "geo_tagged_pct", label: "Geo-tag %" },
      { key: "scan_coverage_pct", label: "Scan %" },
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
      { key: "worker_name", label: "Worker" },
      { key: "trees_registered", label: "Trees registered" },
      { key: "regeotag_due", label: "Re-geotag due" },
      { key: "regeotag_completion_pct", label: "Completion %" },
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
      { key: "label", label: "Group" },
      { key: "financial_year", label: "FY" },
      { key: "tree_count", label: "Trees" },
      { key: "total_tco2e", label: "tCO₂e" },
      { key: "tco2e_low", label: "Low" },
      { key: "tco2e_high", label: "High" },
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
      { key: "tree_code", label: "Tree code" },
      {
        key: "photo_url",
        label: "Photo",
        render: (row) =>
          row.photo_url ? (
            <a href={String(row.photo_url)} target="_blank" rel="noreferrer" className="text-forest-700 hover:underline">
              View
            </a>
          ) : (
            "—"
          ),
      },
      { key: "photo_date", label: "Date" },
      { key: "gps_match", label: "GPS match" },
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
      { key: "state_name", label: "State" },
      { key: "district_name", label: "District" },
      { key: "block_name", label: "Block" },
      { key: "project_count", label: "Projects" },
      { key: "registered_trees", label: "Registered" },
      { key: "gap", label: "Gap" },
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
      { key: "project_name", label: "Project" },
      { key: "financial_year", label: "FY" },
      { key: "target_trees", label: "Target" },
      { key: "registered_trees", label: "Registered" },
      { key: "pending_trees", label: "Pending" },
      { key: "progress_pct", label: "Progress %" },
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
      { key: "tree_code", label: "Tree code" },
      { key: "project_name", label: "Project" },
      { key: "work_area_name", label: "Work area" },
      { key: "latitude", label: "Lat" },
      { key: "longitude", label: "Lon" },
      { key: "issue", label: "Issue" },
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
