/// Mobile-friendly subset of plantation MIS reports (web has 16+).
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
    id: 'photo-evidence',
    path: '/plantation-reports/photo-evidence',
    label: 'Photo evidence pack',
    description: 'Photo evidence summary for audit exports',
  ),
];

PlantationMisReport? plantationMisReportById(String id) {
  for (final report in mobilePlantationMisReports) {
    if (report.id == id) return report;
  }
  return null;
}
