/// Compliance gap → mobile deep link resolver (mirrors web `compliance-gap-actions.ts`).

class ComplianceGapAction {
  const ComplianceGapAction({
    required this.label,
    required this.route,
    this.description,
  });

  final String label;
  final String route;
  final String? description;
}

ComplianceGapAction? resolveComplianceGapAction(
  Map<String, dynamic> gap, {
  required String projectId,
  String? workAreaId,
}) {
  final key = gap['key'] as String? ?? gap['item_id'] as String? ?? '';
  final itemId = gap['item_id'] as String? ?? '';

  if (key == 'estate_metadata_complete' || key == 'scheme_refs_complete') {
    return ComplianceGapAction(
      label: 'Complete scheme references',
      route: '/projects/$projectId/setup?step=3',
      description: 'Fill government reference fields',
    );
  }
  if (key == 'work_areas_defined' || key.contains('work_area')) {
    return ComplianceGapAction(
      label: 'Draw work areas',
      route: workAreaId != null
          ? '/map?fence=$workAreaId'
          : '/projects/$projectId/setup?step=4',
    );
  }
  if (key.contains('satellite') || key.contains('ndvi')) {
    return ComplianceGapAction(
      label: 'Open satellite workspace',
      route: '/satellite?project=$projectId',
    );
  }
  if (key.contains('tree') || key == 'has_trees') {
    return ComplianceGapAction(
      label: 'Register trees',
      route: '/trees/new?project=$projectId',
    );
  }
  if (key.contains('audit') || key.contains('estate_watch')) {
    return ComplianceGapAction(
      label: 'Open Estate Watch audit',
      route: '/projects/$projectId/audit',
    );
  }
  if (key.contains('bioacoustic') || key.contains('biodiversity')) {
    return ComplianceGapAction(
      label: 'Bioacoustic monitoring',
      route: '/bioacoustic?project=$projectId',
    );
  }
  if (key.contains('plot') || key.contains('sampling')) {
    return ComplianceGapAction(
      label: 'Plot visit queue',
      route: '/plot-visits?project=$projectId',
    );
  }
  if (itemId.isNotEmpty || key.isNotEmpty) {
    return ComplianceGapAction(
      label: 'View compliance checklist',
      route: '/projects/$projectId/compliance',
    );
  }
  return null;
}
