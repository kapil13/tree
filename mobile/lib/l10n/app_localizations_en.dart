// ignore: unused_import
import 'package:intl/intl.dart' as intl;
import 'app_localizations.dart';

// ignore_for_file: type=lint

/// The translations for English (`en`).
class AppLocalizationsEn extends AppLocalizations {
  AppLocalizationsEn([String locale = 'en']) : super(locale);

  @override
  String get appTitle => 'Aranyix';

  @override
  String get welcomeTitle => 'Grow forests with proof';

  @override
  String get signIn => 'Sign in';

  @override
  String get signUp => 'Sign up';

  @override
  String get home => 'Home';

  @override
  String get trees => 'Trees';

  @override
  String get map => 'Map';

  @override
  String get notifications => 'Notifications';

  @override
  String get profile => 'Profile';

  @override
  String get monitoring => 'Monitoring';

  @override
  String get projects => 'Projects';

  @override
  String get fieldOps => 'Field ops';

  @override
  String get shareTreeQr => 'Share tree QR';

  @override
  String shareTreeMessage(String url) {
    return 'View this tree on Aranyix: $url';
  }

  @override
  String get language => 'Language';

  @override
  String get languageEnglish => 'English';

  @override
  String get languageHindi => 'Hindi';

  @override
  String get security => 'Security';

  @override
  String get biometricUnlock => 'Unlock with biometrics';

  @override
  String get biometricUnlockHint =>
      'Require fingerprint or face unlock when reopening the app.';

  @override
  String get biometricEnableFailed =>
      'Biometric unlock was not enabled — confirmation failed.';

  @override
  String get biometricEnabled => 'Biometric unlock enabled.';

  @override
  String get biometricDisabled => 'Biometric unlock disabled.';

  @override
  String get screenshotGuard => 'Block screenshots';

  @override
  String get screenshotGuardHint =>
      'Blocks screenshots and screen recording on this device.';

  @override
  String get screenshotGuardEnabled => 'Screenshot guard enabled.';

  @override
  String get screenshotGuardDisabled => 'Screenshot guard disabled.';

  @override
  String get certificatePinning => 'Certificate pinning';

  @override
  String offlineSyncPending(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count items waiting to sync',
      one: '1 item waiting to sync',
    );
    return '$_temp0';
  }

  @override
  String get offlineSyncing => 'Syncing offline data…';

  @override
  String get offlineMode =>
      'You are offline — changes will sync when connected.';

  @override
  String get coachMarkHomeTitle => 'Your forest dashboard';

  @override
  String get coachMarkHomeBody =>
      'Health score, alerts, and quick actions live here.';

  @override
  String get coachMarkTreesTitle => 'Register & track trees';

  @override
  String get coachMarkTreesBody =>
      'Add trees in the field — they sync when you are back online.';

  @override
  String get coachMarkMapTitle => 'Map your plantation';

  @override
  String get coachMarkMapBody =>
      'See sites, corridors, and NDVI context on the map.';

  @override
  String get coachMarkDone => 'Got it';

  @override
  String get pushNotifications => 'Push notifications';

  @override
  String get pushNotificationsHint =>
      'Alerts for satellite health, compliance, and survival surveys.';

  @override
  String get deepLinkTreeNotFound =>
      'Tree not found or you do not have access.';

  @override
  String get analyticsEnabled => 'Usage analytics';

  @override
  String get analyticsHint =>
      'Helps improve the app (no personal tree photos).';

  @override
  String get navDashboard => 'Dashboard';

  @override
  String get navSectionPlantation => 'Setup & planting';

  @override
  String get navSectionPlantationDesc =>
      'Programs, tree registry, map, and field work';

  @override
  String get navSectionIntelligence => 'Monitoring & analysis';

  @override
  String get navSectionIntelligenceDesc =>
      'Satellite, biodiversity, and alerts';

  @override
  String get navSectionReports => 'Reports & evidence';

  @override
  String get navSectionReportsDesc =>
      'Exports, carbon, and AI assistant';

  @override
  String get navSectionAccount => 'Account';

  @override
  String get navBioacoustic => 'Bioacoustic';

  @override
  String get navAlerts => 'Alerts';

  @override
  String get navReports => 'Reports';

  @override
  String get navAssistant => 'AI assistant';

  @override
  String get navCarbon => 'Carbon';

  @override
  String get navCredits => 'Credits';

  @override
  String get registerTreePrimary => 'Register a tree';

  @override
  String get registerTreePrimarySub =>
      'GPS, photos, and offline sync in the field';

  @override
  String get bioacousticActionSub =>
      'Record 60–180s ambient sound for species detection';

  @override
  String get bioacousticTileSub => 'Record soundscape';

  @override
  String get projectsTileSub => 'Packages & work areas';

  @override
  String get addActionFab => 'Add';

  @override
  String get addActionSheetTitle => 'Field actions';

  @override
  String get addActionSheetSubtitle =>
      'Primary tools for registration and biodiversity monitoring';

  @override
  String get addActionSheetEmpty =>
      'No field actions available for your role.';

  @override
  String get menuOpen => 'Open menu';

  @override
  String get drawerLoadError =>
      'Could not load your profile for navigation. Check your connection and retry.';

  @override
  String get drawerSignInRequired => 'Sign in to see navigation.';

  @override
  String get drawerNoNavItems => 'No menu items are available for your account.';

  @override
  String get todayWork => 'Today\'s work';

  @override
  String get fieldWorkspace => 'Field workspace';

  @override
  String get viewFullDashboard => 'View full dashboard';

  @override
  String get addTreeTitle => 'Add tree';

  @override
  String get addTreeTitleProject => 'Register project tree';

  @override
  String get addTreeStepContext => 'Context';

  @override
  String get addTreeStepSpecies => 'Species & details';

  @override
  String get addTreeStepLocation => 'Location';

  @override
  String get addTreeStepPhotos => 'Photos';

  @override
  String get addTreeStepReview => 'Review & save';

  @override
  String addTreeStepOf(int current, int total) => 'Step $current of $total';

  @override
  String get addTreeBack => 'Back';

  @override
  String get addTreeNext => 'Next';

  @override
  String get addTreeSaving => 'Saving…';

  @override
  String get addTreeSaveAndNext => 'Save & register next';

  @override
  String get addTreeSaveAndExit => 'Save & exit';

  @override
  String get addTreeProjectHint =>
      'GPS, photos, and species only — pit, spacing, and guard inherit from the project.';

  @override
  String get addTreeSetupBlockedTitle => 'Finish project setup first';

  @override
  String get addTreeSetupBlockedBody =>
      'Complete tree registration defaults (permit, site zone, agency) in the web project setup before registering trees here.';

  @override
  String get addTreeOpenProject => 'Open project';

  @override
  String get addTreeWorkArea => 'Work area *';

  @override
  String get addTreeProgram => 'Registration program';

  @override
  String get addTreeProgramHint =>
      'Choose BYOT citizen planting or a government program such as NHAI highway plantation.';

  @override
  String get addTreeValidationProgram => 'Select a registration program before continuing.';

  @override
  String get addTreeValidationWorkArea => 'Select a work area before continuing.';

  @override
  String get addTreeApprovedSpecies => 'Approved species';

  @override
  String get addTreeSpecies => 'Species';

  @override
  String get addTreeRoadSide => 'Road side *';

  @override
  String get addTreeRoadSideNhai => 'Road side (LHS/RHS) *';

  @override
  String get addTreeGuard => 'Tree guard *';

  @override
  String get addTreePitSize => 'Pit size (LxWxD cm)';

  @override
  String get addTreeMeasurementsTitle => 'Field measurements (optional)';

  @override
  String get addTreeMeasurementsHint =>
      'Measure DBH at 1.3 m above ground. Leave blank if not measured yet.';

  @override
  String get addTreeMeasurementMethod => 'Measurement method';

  @override
  String get addTreeDbh => 'DBH (cm)';

  @override
  String get addTreeHeight => 'Height (m)';

  @override
  String get addTreeLocationHint =>
      'Capture GPS at the planting point. Compliance checks run automatically for project trees.';

  @override
  String get addTreeGetGps => 'Get GPS location';

  @override
  String get addTreePhotosHint =>
      'Add clear photos of the tree and planting pit. Works offline — uploads when connected.';

  @override
  String addTreeAddPhoto(int count, int target) => 'Add photo ($count/$target)';

  @override
  String addTreeOfflinePhotos(int count) => '$count photo(s) saved offline';

  @override
  String get addTreeReviewTitle => 'Review registration';

  @override
  String addTreeSessionCount(int count) => '$count this session';

  @override
  String addTreeMinPhotosWarning(int min) => 'Program recommends at least $min photos.';

  @override
  String get addTreeValidationContext =>
      'Finish project setup or select a work area before continuing.';

  @override
  String get addTreeValidationSpecies => 'Enter a species before continuing.';

  @override
  String get addTreeValidationLocation => 'Capture GPS before continuing.';

  @override
  String get addTreeValidationCompliance =>
      'Compliance check failed — fix issues before saving (strict mode).';

  @override
  String get bioTabRecord => 'Record';

  @override
  String get bioTabHistory => 'History';

  @override
  String get bioRecordingLive => 'Recording live';

  @override
  String bioRecordingTarget(int min, int max) => 'Target: $min–$max s · 48 kHz mono WAV';

  @override
  String get bioStopAndSave => 'Stop & save';

  @override
  String bioStopMin(int seconds) => 'Stop (${seconds}s min)';

  @override
  String get bioSiteOptional => 'Plantation site (optional)';

  @override
  String get bioSiteGpsOnly => 'No site — GPS only';

  @override
  String get bioTapToRecord => 'Tap to start recording';

  @override
  String get bioStartRecording => 'Start ambient recording';

  @override
  String bioSplLevel(String level) => 'Ambient SPL ≈ $level dB';

  @override
  String get bioNoiseWarning =>
      'High background noise — traffic, wind, or machinery may reduce accuracy.';

  @override
  String get bioFieldTips =>
      'Record ambient environmental sound (not voice). Hold phone 1–1.5 m above ground, stay still. Best at sunrise or sunset. Works offline.';

  @override
  String get bioSyncTooltip => 'Sync offline recordings';

  @override
  String get bioMicDenied => 'Microphone permission denied';

  @override
  String get bioRecordingStatus =>
      'Recording ambient soundscape… hold phone 1–1.5 m above ground, stay still.';

  @override
  String bioTooShort(int min, int elapsed) =>
      'Record at least $min seconds (currently $elapsed s).';

  @override
  String get bioSaving => 'Saving recording…';

  @override
  String bioSavedOfflineGps(String note) => 'Saved offline. $note';

  @override
  String get bioSavedOffline =>
      'Saved offline. Will upload and analyze automatically when you have signal.';

  @override
  String get bioUploading => 'Uploading and analyzing…';

  @override
  String get bioAnalysisComplete => 'Analysis complete. See results below.';

  @override
  String get bioUploadFailedOffline =>
      'Upload failed — saved offline. Tap Sync when your connection is stable.';

  @override
  String get bioSyncing => 'Syncing offline recordings…';

  @override
  String bioSyncedCount(int count) => 'Synced $count recording${count == 1 ? '' : 's'}.';

  @override
  String get bioNothingToSync => 'No pending recordings to sync.';

  @override
  String get bioQueuePending => 'Waiting to sync';

  @override
  String get bioQueueSyncing => 'Syncing…';

  @override
  String get bioQueueFailed => 'Sync failed';

  @override
  String get bioOfflineQueue => 'Offline queue';

  @override
  String get bioSyncNow => 'Sync now';

  @override
  String get bioSyncedRecordings => 'Synced recordings';

  @override
  String get bioNoRecordingsYet => 'No synced recordings yet.';
}
