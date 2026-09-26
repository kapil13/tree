/// Plantation MIS reports — full 16-report catalog (Phase F parity with web).
library;

class PlantationMisReport {
  const PlantationMisReport({
    required this.id,
    required this.path,
    required this.label,
    required this.description,
  });

  final String id;
  final String path;
  final String label;
  final String description;
}

const mobilePlantationMisReports = [
  PlantationMisReport(
    id: 'project-wise',
    path: '/plantation-reports/project-wise',
    label: 'Project-wise plantation',
    description: 'Portfolio summary by project with survival and violations',
  ),
  PlantationMisReport(
    id: 'fy-wise',
    path: '/plantation-reports/fy-wise',
    label: 'FY-wise plantation',
    description: 'Financial year rollup across projects',
  ),
  PlantationMisReport(
    id: 'survival-mortality',
    path: '/plantation-reports/survival-mortality',
    label: 'Survival & mortality',
    description: 'Survival status and mortality rates by project',
  ),
  PlantationMisReport(
    id: 're-geotag',
    path: '/plantation-reports/re-geotag',
    label: 'Re-geotag backlog',
    description: 'Trees overdue for survival survey re-geotag',
  ),
  PlantationMisReport(
    id: 'total-records',
    path: '/plantation-reports/total-records',
    label: 'Total records',
    description: 'Registered tree counts and registration velocity',
  ),
  PlantationMisReport(
    id: 'species-wise',
    path: '/plantation-reports/species-wise',
    label: 'Species-wise summary',
    description: 'Registered trees grouped by species',
  ),
  PlantationMisReport(
    id: 'work-area-site',
    path: '/plantation-reports/work-area-site',
    label: 'Work area / site',
    description: 'Trees and density by work area block',
  ),
  PlantationMisReport(
    id: 'compliance-violations',
    path: '/plantation-reports/compliance-violations',
    label: 'Compliance violations',
    description: 'Open and resolved compliance violations',
  ),
  PlantationMisReport(
    id: 'satellite-health',
    path: '/plantation-reports/satellite-health',
    label: 'Satellite health',
    description: 'NDVI and satellite scan coverage by work area',
  ),
  PlantationMisReport(
    id: 'scheme-kpi',
    path: '/plantation-reports/scheme-kpi',
    label: 'Scheme KPI',
    description: 'Government scheme KPI attainment',
  ),
  PlantationMisReport(
    id: 'field-team',
    path: '/plantation-reports/field-team-performance',
    label: 'Field team performance',
    description: 'Registration and survey productivity by team',
  ),
  PlantationMisReport(
    id: 'carbon-stock',
    path: '/plantation-reports/carbon-stock',
    label: 'Carbon stock',
    description: 'Estimated carbon stock by project and species',
  ),
  PlantationMisReport(
    id: 'photo-evidence',
    path: '/plantation-reports/photo-evidence',
    label: 'Photo evidence pack',
    description: 'Photo evidence summary for audit exports',
  ),
  PlantationMisReport(
    id: 'district-block',
    path: '/plantation-reports/district-block-admin',
    label: 'District / block admin',
    description: 'Administrative hierarchy rollup',
  ),
  PlantationMisReport(
    id: 'pending-registration',
    path: '/plantation-reports/pending-registration',
    label: 'Pending registration',
    description: 'Trees awaiting registration completion',
  ),
  PlantationMisReport(
    id: 'out-of-fence',
    path: '/plantation-reports/out-of-fence',
    label: 'Out of fence',
    description: 'Trees registered outside work area boundaries',
  ),
];

PlantationMisReport? plantationMisReportById(String id) {
  for (final report in mobilePlantationMisReports) {
    if (report.id == id) return report;
  }
  return null;
}
