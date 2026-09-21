import 'package:byot_mobile/l10n/app_localizations.dart';

const plantingSegmentKeys = <String>[
  'nhai_highway',
  'industrial_greenbelt',
  'township_landscape',
  'nagar_van_urban',
  'sahakar_van_coop',
  'nutri_garden',
  'ngo_watershed',
  'general',
];

String segmentLabel(AppLocalizations l10n, String segment) {
  return switch (segment) {
    'nhai_highway' => l10n.segmentNhaiHighway,
    'industrial_greenbelt' => l10n.segmentIndustrialGreenbelt,
    'township_landscape' => l10n.segmentTownshipLandscape,
    'nagar_van_urban' => l10n.segmentNagarVanUrban,
    'sahakar_van_coop' => l10n.segmentSahakarVanCoop,
    'nutri_garden' => l10n.segmentNutriGarden,
    'ngo_watershed' => l10n.segmentNgoWatershed,
    'general' => l10n.segmentGeneral,
    _ => segment,
  };
}
