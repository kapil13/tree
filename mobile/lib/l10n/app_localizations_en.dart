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
  String get navSectionReportsDesc => 'Exports, carbon, and AI assistant';

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
  String get addActionSheetEmpty => 'No field actions available for your role.';

  @override
  String get menuOpen => 'Open menu';

  @override
  String get drawerLoadError =>
      'Could not load your profile for navigation. Check your connection and retry.';

  @override
  String get drawerSignInRequired => 'Sign in to see navigation.';

  @override
  String get drawerNoNavItems =>
      'No menu items are available for your account.';

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
  String addTreeStepOf(int current, int total) {
    return 'Step $current of $total';
  }

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
  String get addTreeValidationProgram =>
      'Select a registration program before continuing.';

  @override
  String get addTreeValidationWorkArea =>
      'Select a work area before continuing.';

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
  String addTreeAddPhoto(int count, int target) {
    return 'Add photo ($count/$target)';
  }

  @override
  String addTreeOfflinePhotos(int count) {
    return '$count photo(s) saved offline';
  }

  @override
  String get addTreeReviewTitle => 'Review registration';

  @override
  String addTreeSessionCount(int count) {
    return '$count this session';
  }

  @override
  String addTreeMinPhotosWarning(int min) {
    return 'Program recommends at least $min photos.';
  }

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
  String bioRecordingTarget(int min, int max) {
    return 'Target: $min–$max s · 48 kHz mono WAV';
  }

  @override
  String get bioStopAndSave => 'Stop & save';

  @override
  String bioStopMin(int seconds) {
    return 'Stop (${seconds}s min)';
  }

  @override
  String get bioSiteOptional => 'Plantation site (optional)';

  @override
  String get bioSiteGpsOnly => 'No site — GPS only';

  @override
  String get bioTapToRecord => 'Tap to start recording';

  @override
  String get bioStartRecording => 'Start ambient recording';

  @override
  String bioSplLevel(String level) {
    return 'Ambient SPL ≈ $level dB';
  }

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
  String bioTooShort(int min, int elapsed) {
    return 'Record at least $min seconds (currently $elapsed s).';
  }

  @override
  String get bioSaving => 'Saving recording…';

  @override
  String bioSavedOfflineGps(String note) {
    return 'Saved offline. $note';
  }

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
  String bioSyncedCount(int count) {
    return 'Synced $count recording(s).';
  }

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

  @override
  String get retry => 'Retry';

  @override
  String get monitoringStaleSatellite => 'Stale satellite scans';

  @override
  String get monitoringStaleSatelliteHint =>
      'Work areas without a recent NDVI pass';

  @override
  String get monitoringOpenSarVerifications => 'Open SAR field verifications';

  @override
  String get monitoringSarAlerts30d => 'SAR alerts (30d)';

  @override
  String get monitoringUnreadAlertsByKind => 'Unread alerts by kind';

  @override
  String get monitoringNoUnreadAlerts => 'No unread alerts.';

  @override
  String get monitoringWorkAreaSarStatus => 'Work area SAR status';

  @override
  String get monitoringWorkAreaFallback => 'Work area';

  @override
  String monitoringNoWorkAreas(String violations, String survival) {
    return 'No work-area monitoring rows yet. Open violations: $violations, survival due: $survival.';
  }

  @override
  String monitoringDaysSinceNdvi(String days) {
    return '${days}d since NDVI';
  }

  @override
  String get homeWelcomeBack => 'Welcome back';

  @override
  String homeHello(String name) {
    return 'Hello, $name';
  }

  @override
  String get homeForestHealth => 'Forest Health';

  @override
  String get homeInsights => 'Insights';

  @override
  String get homeCarbonGrowth => 'Carbon growth';

  @override
  String get homeCarbonGrowthHint => 'Estimated sequestration trend';

  @override
  String get homeTreeHealth => 'Tree health';

  @override
  String get homeTreeHealthHint => 'Distribution across your portfolio';

  @override
  String get homeSpeciesMix => 'Species mix';

  @override
  String get homeSpeciesMixHint => 'Top registered species';

  @override
  String get homeMonitoringChip => 'Monitoring';

  @override
  String get homeFieldOpsChip => 'Field ops';

  @override
  String get homeReportsChip => 'Reports';

  @override
  String get homeFieldProjects => 'Field projects';

  @override
  String get homeAllSites => 'All sites';

  @override
  String get homeQuickSnapshot => 'Quick Snapshot';

  @override
  String get homeAskAranyix => 'Ask Aranyix';

  @override
  String get save => 'Save';

  @override
  String get cancel => 'Cancel';

  @override
  String get saving => 'Saving…';

  @override
  String get noAlerts => 'No alerts.';

  @override
  String get noTreesYet => 'No trees yet.';

  @override
  String get addFirstTree => 'Add your first tree';

  @override
  String get noProjectsYet => 'No planting projects assigned yet.';

  @override
  String get preferences => 'Preferences';

  @override
  String get alertPreferences => 'Alert preferences';

  @override
  String get preferencesSaved => 'Preferences saved';

  @override
  String get satelliteHealth => 'Satellite health';

  @override
  String get survivalSurvey => 'Survival survey';

  @override
  String get threatWatch => 'Threat watch';

  @override
  String get complianceLabel => 'Compliance';

  @override
  String get viewDetails => 'View Details';

  @override
  String get reviewActions => 'Review Actions';

  @override
  String get takeAction => 'Take Action';

  @override
  String homeTrend(String trend) {
    return 'Trend: $trend';
  }

  @override
  String get signOut => 'Sign out';

  @override
  String get editProfile => 'Edit personal profile';

  @override
  String get editProfileSub => 'Name, phone, date of birth, city, state';

  @override
  String get appVersion => 'App version';

  @override
  String get workAreas => 'Work areas';

  @override
  String get noWorkAreasYet => 'No work areas defined on web yet.';

  @override
  String get registerTreeBtn => 'Register tree';

  @override
  String get createReport => 'Create report';

  @override
  String get yourReports => 'Your reports';

  @override
  String get noReportsYet => 'No reports yet.';

  @override
  String get reportCreated => 'Report created';

  @override
  String get reportNeedsArea =>
      'This report type needs a plantation / work area.';

  @override
  String get byStatus => 'By status';

  @override
  String get resolve => 'Resolve';

  @override
  String get violationResolved => 'Violation resolved';

  @override
  String get recentViolations => 'Recent violations';

  @override
  String get noOpenViolations => 'No open violations.';

  @override
  String get survivalDueByProject => 'Survival due by project';

  @override
  String get noSurvivalDue => 'No survival surveys due.';

  @override
  String get drawPolygon => 'Draw polygon';

  @override
  String get drawCorridor => 'Draw corridor';

  @override
  String get undoPoint => 'Undo point';

  @override
  String get cancelDraw => 'Cancel draw';

  @override
  String get workAreaSaved => 'Work area saved';

  @override
  String get needTwoPoints => 'Add at least 2 points on the map';

  @override
  String get polygonNeedsThree => 'Polygon needs at least 3 points';

  @override
  String get createProjectFirst => 'Create or join a planting project first';

  @override
  String get noTreesOnMap =>
      'No trees with GPS yet. Add a tree to see it on the map.';

  @override
  String get quickActions => 'Quick actions';

  @override
  String get liveMap => 'Live map';

  @override
  String get openFullMap => 'Open full map';

  @override
  String get expand => 'Expand';

  @override
  String get noTreesOnMapPreview => 'No trees on map yet';

  @override
  String get registerFirstTree => 'Register first tree';

  @override
  String get pendingTreeRegistrations => 'Pending tree registrations';

  @override
  String get captureGpsBeforeRegister => 'Capture GPS before registering.';

  @override
  String get selectWorkAreaForProject => 'Select a work area for this project.';

  @override
  String get complianceStrictBlock =>
      'Compliance check failed — fix issues before saving (strict mode).';

  @override
  String get offlineQueuedSync => 'Offline — queued for sync.';

  @override
  String get profileSaved => 'Profile saved';

  @override
  String get dateOfBirth => 'Date of birth';

  @override
  String get age => 'Age';

  @override
  String get dateOfMarriage => 'Date of marriage';

  @override
  String get survivalRegeotag => 'Survival / re-geotag';

  @override
  String get currentGps => 'Current GPS';

  @override
  String get noGpsFix => 'No fix yet';

  @override
  String get refreshGps => 'Refresh GPS';

  @override
  String get survivalSurveySaved =>
      'Survival survey saved with measurement record';

  @override
  String get continueWithGoogle => 'Continue with Google';

  @override
  String get createAccount => 'Create an account';

  @override
  String get forgotPassword => 'Forgot password?';

  @override
  String get alreadyHaveAccountSignIn => 'Already have an account? Sign in';

  @override
  String get createFreeAccount => 'Create free account';

  @override
  String get alreadyHaveAccountBtn => 'I already have an account';

  @override
  String get completingSignIn => 'Completing sign-in…';

  @override
  String get backToSignIn => 'Back to sign in';

  @override
  String get useEmailInstead => 'Use email instead';

  @override
  String get retrySecurityCheck => 'Retry security check';

  @override
  String get signInWithGoogle => 'Sign in with Google';

  @override
  String get homeFieldProjectsSub =>
      'NHAI packages, mine belts, society blocks';

  @override
  String get estimate => 'Estimate';

  @override
  String carbonKg(String kg) {
    return 'Carbon: $kg kg';
  }

  @override
  String inputCompleteness(String value) {
    return 'Input completeness: $value';
  }

  @override
  String methodologyLabel(String value) {
    return 'Methodology: $value';
  }

  @override
  String chainageKm(String km) {
    return 'Chainage: $km km';
  }

  @override
  String get exploreByot => 'Explore BYOT features';

  @override
  String get visitWebsite => 'Visit aranyix.tech';

  @override
  String get whatHappensNext => 'What happens next';

  @override
  String get orgTypeGovernment => 'Government / public agency';

  @override
  String get orgTypeCorporate => 'Corporate / industry';

  @override
  String get orgTypeNgo => 'NGO / community';

  @override
  String get askAnythingForest => 'Ask anything about your forest…';

  @override
  String get alertFallback => 'Alert';

  @override
  String get noHealthDataYet => 'No health data yet';

  @override
  String get siteFallback => 'Site';

  @override
  String get plantationFallback => 'Plantation';

  @override
  String get orDivider => 'or';

  @override
  String get rememberMe => 'Remember me';

  @override
  String get signingIn => 'Signing in…';

  @override
  String get welcomeBackTitle => 'Welcome back';

  @override
  String get welcomeBackSub =>
      'Sign in to continue mapping trees, biodiversity, and compliance evidence.';

  @override
  String get phoneOtpTab => 'Phone OTP';

  @override
  String get emailTab => 'Email';

  @override
  String get emailLabel => 'Email';

  @override
  String get passwordLabel => 'Password';

  @override
  String get gpsVerified => 'GPS-verified';

  @override
  String get offlineSyncLabel => 'Offline sync';

  @override
  String get assistantTitle => 'AI Assistant';

  @override
  String get assistantHint => 'Ask about trees, compliance, satellite health…';

  @override
  String get assistantSend => 'Send';

  @override
  String get assistantEmpty => 'Ask a question to get started.';

  @override
  String get creditsTitle => 'Credits';

  @override
  String get carbonTitle => 'Carbon estimator';

  @override
  String get speciesLabel => 'Species';

  @override
  String get dbhLabel => 'DBH (cm)';

  @override
  String get heightLabel => 'Height (m)';

  @override
  String get ageYearsLabel => 'Age (years)';

  @override
  String integrityScore(String score) {
    return 'Integrity $score';
  }

  @override
  String get forestIntegrityTitle => 'Forest Integrity';

  @override
  String get sarProviderLabel => 'Axentis SAR';

  @override
  String get portfolioAvg => '/ 100 portfolio avg';

  @override
  String atRiskCount(int count) {
    return '$count at risk';
  }

  @override
  String divergentCount(int count) {
    return '$count divergent';
  }

  @override
  String alignedCount(int count) {
    return '$count aligned';
  }

  @override
  String get sarBaselineHint =>
      'Run SAR scans on the web satellite page to establish Forest Integrity baselines.';

  @override
  String get selectSite => 'Select site';

  @override
  String devHint(String hint) {
    return 'Dev hint: $hint';
  }
}
