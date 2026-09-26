import 'package:byot_mobile/l10n/app_localizations.dart';

String localizedSetupStepLabel(AppLocalizations l10n, String stepId) {
  return switch (stepId) {
    'scheme_refs' => l10n.setupStepSchemeRefs,
    'tree_defaults' => l10n.setupStepTreeDefaults,
    'planting_standard' => l10n.setupStepPlantingStandard,
    'work_areas' => l10n.setupStepWorkAreas,
    _ => stepId,
  };
}
