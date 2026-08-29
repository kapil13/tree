/// Mirrors web `evaluateProjectSetup` for mobile tree registration gates.
library;

class ProjectSetupStep {
  const ProjectSetupStep({
    required this.id,
    required this.label,
    required this.complete,
    required this.required,
    this.description,
  });

  final String id;
  final String label;
  final bool complete;
  final bool required;
  final String? description;
}

class ProjectSetupStatus {
  const ProjectSetupStatus({
    required this.steps,
    required this.canRegisterTree,
    this.blockReason,
  });

  final List<ProjectSetupStep> steps;
  final bool canRegisterTree;
  final String? blockReason;
}

const _treeDefaultKeys = [
  ('permit_reference', 'Permit reference'),
  ('site_zone', 'Site zone'),
  ('implementing_agency', 'Implementing agency'),
  ('maintenance_responsible', 'Maintenance responsible'),
];

ProjectSetupStatus evaluateProjectSetup(Map<String, dynamic> project, List<dynamic> workAreas) {
  final metadata = Map<String, dynamic>.from(project['metadata'] as Map? ?? {});
  final defaults = Map<String, dynamic>.from(metadata['tree_registration_defaults'] as Map? ?? {});
  final schemeCode = project['scheme_code'] as String?;
  final programCode = project['program_code'] as String?;
  final complianceMode = project['compliance_mode'] as String? ?? 'open';
  final requiresWorkArea = complianceMode == 'strict' || complianceMode == 'guided';

  final hasStandard = project['active_standard'] != null;
  final missingDefaults = <String>[];
  if (schemeCode != null || programCode == 'government_nhai') {
    for (final (key, label) in _treeDefaultKeys) {
      if ((defaults[key]?.toString().trim() ?? '').isEmpty) {
        missingDefaults.add(label);
      }
    }
  }
  final hasTreeDefaults = missingDefaults.isEmpty;
  final hasWorkAreas = workAreas.isNotEmpty;

  final steps = <ProjectSetupStep>[
    if (schemeCode != null || programCode == 'government_nhai')
      ProjectSetupStep(
        id: 'tree_defaults',
        label: 'Tree registration defaults',
        complete: hasTreeDefaults,
        required: true,
        description: hasTreeDefaults
            ? 'Permit, site zone, and agency saved'
            : 'Missing: ${missingDefaults.join(', ')}',
      ),
    ProjectSetupStep(
      id: 'planting_standard',
      label: 'Planting standard',
      complete: hasStandard,
      required: true,
      description: hasStandard ? 'Compliance standard attached' : 'No planting standard attached',
    ),
    ProjectSetupStep(
      id: 'work_areas',
      label: 'Work areas on map',
      complete: hasWorkAreas,
      required: requiresWorkArea,
      description: hasWorkAreas
          ? '${workAreas.length} area${workAreas.length == 1 ? '' : 's'} defined'
          : 'Draw at least one polygon or corridor',
    ),
  ];

  String? blockReason;
  var canRegister = hasStandard && hasTreeDefaults && (!requiresWorkArea || hasWorkAreas);

  if (!hasStandard) {
    canRegister = false;
    blockReason = 'Attach a planting standard before registering trees.';
  } else if (!hasTreeDefaults) {
    canRegister = false;
    blockReason =
        'Complete tree registration defaults (permit, site zone, agency) in project setup.';
  } else if (requiresWorkArea && !hasWorkAreas) {
    canRegister = false;
    blockReason = 'Draw a work area on the map before registering trees.';
  }

  return ProjectSetupStatus(
    steps: steps,
    canRegisterTree: canRegister,
    blockReason: blockReason,
  );
}

String projectSetupWebUrl(String projectId) {
  return 'https://aranyix.tech/projects/$projectId/setup';
}
