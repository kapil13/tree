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
  String get navField => 'Field';

  @override
  String get navBio => 'Bio';

  @override
  String get shareTreeQr => 'Share tree QR';

  @override
  String shareTreeMessage(String url) {
    return 'View this tree on Aranyix: $url';
  }

  @override
  String get language => 'Language';

  @override
  String get appearance => 'Appearance';

  @override
  String get themeSystem => 'Match system';

  @override
  String get themeLight => 'Light';

  @override
  String get themeDark => 'Dark';

  @override
  String addTreeChainageNext(String label) {
    return 'Next chainage: $label';
  }

  @override
  String get addTreeProjectMeasurementsHint =>
      'Optional remeasurements for project MRV — leave blank if not measured in the field.';

  @override
  String get citizenStewardshipTitle => 'Citizen stewardship';

  @override
  String citizenStewardshipTrees(int count) {
    return '$count trees registered';
  }

  @override
  String citizenStewardshipDue(int count) {
    return '$count stewardship check-ins due';
  }

  @override
  String citizenStewardshipAdopted(int count) {
    return '$count trees adopted';
  }

  @override
  String citizenStewardshipPoints(int count) {
    return '$count stewardship points';
  }

  @override
  String get citizenAdoptTitle => 'Adopt a tree';

  @override
  String get citizenAdoptSubtitle =>
      'Support a neighbour\'s BYOT tree with periodic check-ins.';

  @override
  String get citizenAdoptCodeLabel => 'Tree public code';

  @override
  String get citizenAdoptByCode => 'Adopt by code';

  @override
  String get citizenAdoptAction => 'Adopt';

  @override
  String get citizenAdoptBrowseTitle => 'Trees near you';

  @override
  String get citizenAdoptEmpty =>
      'No adoptable trees right now. Try a public code from a QR link.';

  @override
  String get citizenAdoptSuccess => 'Tree adopted — thank you for stewarding!';

  @override
  String get citizenAdoptNotAvailable =>
      'Tree adoption is available for BYOT citizen accounts.';

  @override
  String get citizenStewardshipHubTitle => 'My stewardship';

  @override
  String get citizenStewardshipOwnedTab => 'My trees';

  @override
  String get citizenStewardshipAdoptedTab => 'Adopted';

  @override
  String get citizenStewardshipCheckIn => 'Check in';

  @override
  String get citizenStewardshipDueBadge => 'Check-in due';

  @override
  String get citizenStewardshipEmptyOwned =>
      'No registered trees yet. Register your first tree from the Field tab.';

  @override
  String get citizenStewardshipEmptyAdopted =>
      'No adopted trees yet. Browse adoptable trees to get started.';

  @override
  String get citizenRelinquishTitle => 'Stop stewarding this tree?';

  @override
  String get citizenRelinquishConfirm =>
      'You will no longer receive check-in reminders for this adopted tree. The tree owner keeps full ownership.';

  @override
  String get citizenRelinquishAction => 'Relinquish';

  @override
  String get citizenRelinquishSuccess =>
      'You are no longer stewarding this tree.';

  @override
  String get bioAnalysisRunning => 'Analysis running…';

  @override
  String get languageEnglish => 'English';

  @override
  String get languageHindi => 'Hindi';

  @override
  String get security => 'Security';

  @override
  String get biometricUnlock => 'Unlock with biometrics';

  @override
  String get biometricGateTitle => 'Unlock Aranyix';

  @override
  String get biometricUnlockHint =>
      'Require fingerprint or face unlock when reopening the app.';

  @override
  String get tryAgain => 'Try again';

  @override
  String get signInWithPassword => 'Sign in with password';

  @override
  String get sessionExpired =>
      'Your session expired. Sign in again to continue.';

  @override
  String get sessionExpiredBanner =>
      'Your session expired. Sign in again to continue where you left off.';

  @override
  String get checkForUpdates => 'Check for updates on Google Play';

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
  String get offlineServerUnreachable =>
      'Server unreachable — changes will sync when the API is back.';

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
  String get navSectionWorkspace => 'Workspace';

  @override
  String get navSectionWorkspaceDesc =>
      'Projects, tree registry, and field queue';

  @override
  String get navSectionIntelligence => 'Monitoring & analysis';

  @override
  String get navSectionIntelligenceDesc =>
      'Satellite, biodiversity, and alerts';

  @override
  String get navSectionCompliance => 'Compliance & MRV';

  @override
  String get navSectionComplianceDesc => 'Reports and evidence exports';

  @override
  String get navSectionCarbon => 'Carbon & credits';

  @override
  String get navSectionTools => 'Tools';

  @override
  String get navSectionReports => 'Reports & evidence';

  @override
  String get navSectionReportsDesc => 'Exports, carbon, and AI assistant';

  @override
  String get navSectionAccount => 'Account';

  @override
  String get navFieldQueue => 'Field queue & sync';

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
  String addTreeValidationMinPhotos(int min) {
    return 'Add at least $min photos before continuing.';
  }

  @override
  String get addTreeValidationSchemeProject =>
      'Government and ESG programmes require a planting project. Open a project and register trees from there.';

  @override
  String get addTreeSchemeProjectTitle => 'Scheme planting requires a project';

  @override
  String get addTreeSchemeProjectBody =>
      'NHAI, CAMPA, Nagar Van, and other central schemes are configured on a planting project. Create or open a project first, then register trees from that project.';

  @override
  String get addTreeCreateProject => 'Create planting project';

  @override
  String get addTreeOpenProjects => 'Open projects';

  @override
  String get addTreeLocatingGps => 'Locating…';

  @override
  String get addTreeRefreshGps => 'Refresh GPS lock';

  @override
  String get addTreeGpsCaptured => 'GPS captured';

  @override
  String get addTreeGpsNextHint =>
      'GPS is saved. Tap Next to add photos, or refresh if you moved to a new planting point.';

  @override
  String addTreeGpsAccuracyWarning(int meters) {
    return 'GPS accuracy is low (±$meters m). Move outdoors with clear sky and tap Refresh.';
  }

  @override
  String get addTreeOpenLocationSettings => 'Open app settings';

  @override
  String addTreePhotosNextHint(int target) {
    return 'Add at least $target photo(s), then tap Next to review.';
  }

  @override
  String get setupStepSchemeRefs => 'Scheme references';

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
  String get openPlayStore => 'Open Google Play';

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

  @override
  String get registrationPrograms => 'Registration programs';

  @override
  String get registrationProgramsUpdated => 'Registration programs updated.';

  @override
  String get saveProgramPreferences => 'Save program preferences';

  @override
  String get biometricConfirmReason => 'Confirm to enable biometric unlock';

  @override
  String get defaultUserName => 'Aranyix user';

  @override
  String get fullNameLabel => 'Full name *';

  @override
  String get fullNameValidation => 'Enter your full name';

  @override
  String get loginEmailLabel => 'Login email';

  @override
  String get loginEmailHint => 'Used to sign in. Cannot be changed here.';

  @override
  String get phoneLabel => 'Phone';

  @override
  String get cityLabel => 'City';

  @override
  String get stateLabel => 'State';

  @override
  String get notSet => 'Not set';

  @override
  String get setDateOfBirth => 'Set date of birth';

  @override
  String ageYearsCount(int count) {
    return '$count years';
  }

  @override
  String get saveProfile => 'Save profile';

  @override
  String get treeFallback => 'Tree';

  @override
  String get healthLabel => 'Health';

  @override
  String get carbonLabel => 'Carbon';

  @override
  String get dbhCmLabel => 'DBH';

  @override
  String get heightMLabel => 'Height';

  @override
  String get satelliteLabel => 'Satellite';

  @override
  String get riskLabel => 'Risk';

  @override
  String get statusLabel => 'Status';

  @override
  String get ndviLabel => 'NDVI';

  @override
  String get analyzing => 'Analyzing…';

  @override
  String get runAiAnalysis => 'Run AI analysis';

  @override
  String get checkingSatellite => 'Checking satellite…';

  @override
  String get runSatelliteHealth => 'Run satellite health';

  @override
  String get saveCorridor => 'Save corridor';

  @override
  String get savePolygonWorkArea => 'Save polygon work area';

  @override
  String get nameLabel => 'Name';

  @override
  String get projectLabel => 'Project';

  @override
  String get projectFallback => 'Project';

  @override
  String get bufferMLabel => 'Buffer (m)';

  @override
  String get saveWorkArea => 'Save work area';

  @override
  String get addTreeTooltip => 'Add tree';

  @override
  String get polygonModeTooltip => 'Polygon mode';

  @override
  String get corridorModeTooltip => 'Corridor / linear mode';

  @override
  String get creditsSummaryHint =>
      'Organization credit ledger summary (tCO₂e). Estimated until verified / issued.';

  @override
  String get grossCredits => 'Gross credits';

  @override
  String get bufferWithheld => 'Buffer withheld';

  @override
  String get netCredits => 'Net credits';

  @override
  String get issuedCredits => 'Issued credits';

  @override
  String get homeAiBriefTitle => 'Today\'s AI Brief';

  @override
  String get securityCheck => 'Security check';

  @override
  String get unknownSpecies => 'Unknown';

  @override
  String get workAreaFallback => 'Work area';

  @override
  String get areaFallback => 'Area';

  @override
  String get violationFallback => 'Violation';

  @override
  String get modeLabel => 'Mode';

  @override
  String get treesCountLabel => 'Trees';

  @override
  String get violationsLabel => 'Violations';

  @override
  String get compliancePassed => 'Compliance check passed';

  @override
  String get complianceIssuesFound => 'Compliance issues found';

  @override
  String get treeSaved => 'Tree saved';

  @override
  String get submitting => 'Submitting…';

  @override
  String get submitForReview => 'Submit for review';

  @override
  String get orgDetailsTitle => 'Organization details';

  @override
  String get workEmailLabel => 'Work email';

  @override
  String get contactPhoneLabel => 'Contact phone';

  @override
  String get updatePassword => 'Update password';

  @override
  String get sendResetCode => 'Send reset code';

  @override
  String get sendSmsCode => 'Send SMS code';

  @override
  String get applicationReceivedTitle => 'Application received';

  @override
  String get verifyPhone => 'Verify phone';

  @override
  String get verifyEmail => 'Verify email';

  @override
  String get creating => 'Creating…';

  @override
  String get continueBtn => 'Continue';

  @override
  String get verifying => 'Verifying…';

  @override
  String get finishing => 'Finishing…';

  @override
  String get finish => 'Finish';

  @override
  String get joiningAs => 'I am joining as';

  @override
  String get mobileLabel => 'Mobile';

  @override
  String get yourJourney => 'Your journey';

  @override
  String get reportTypeTree => 'Tree portfolio';

  @override
  String get reportTypePlantation => 'Plantation';

  @override
  String get reportTypeCarbon => 'Carbon';

  @override
  String get reportTypeBiodiversity => 'Biodiversity';

  @override
  String get reportTypeEsg => 'ESG disclosure';

  @override
  String get typeLabel => 'Type';

  @override
  String get formatLabel => 'Format';

  @override
  String get survivalStatusLabel => 'Survival status';

  @override
  String get measurementMethodLabel => 'Measurement method';

  @override
  String get optionalRemeasure => 'Optional remeasure';

  @override
  String get optionalHint => 'Optional';

  @override
  String get remarksLabel => 'Remarks';

  @override
  String get submitSurvivalSurvey => 'Submit survival survey';

  @override
  String get survivalLive => 'Live';

  @override
  String get survivalStressed => 'Stressed';

  @override
  String get survivalDead => 'Dead';

  @override
  String get survivalReplaced => 'Replaced';

  @override
  String get visualEstimate => 'Visual estimate';

  @override
  String get caliper => 'Caliper';

  @override
  String get photogrammetry => 'Photogrammetry';

  @override
  String get medianSide => 'Median';

  @override
  String get generalCategory => 'General';

  @override
  String get apiServerLabel => 'API server';

  @override
  String get securityCheckUnavailable => 'Security check unavailable.';

  @override
  String get welcomeJourneySub => 'From field capture to executive clarity.';

  @override
  String get indiaFirstMrv => 'India-first MRV';

  @override
  String get treeSavedReadyNext => 'Tree saved. Ready for the next gap.';

  @override
  String get setupStepTreeDefaults => 'Tree registration defaults';

  @override
  String get setupStepPlantingStandard => 'Planting standard';

  @override
  String get setupStepWorkAreas => 'Work areas on map';

  @override
  String get addTreeSetupBlockedExplain =>
      'Tree registration for this project needs one-time settings on the web app. On mobile you only enter GPS, photos, and species per tree — not permit or legal fields again.';

  @override
  String get openProjectSetupWeb => 'Complete setup on web';

  @override
  String get setupDefaultsSaved => 'Permit, site zone, and agency saved';

  @override
  String get setupStandardAttached => 'Compliance standard attached';

  @override
  String get setupNoStandard => 'No planting standard attached';

  @override
  String setupWorkAreasCount(int count) {
    return '$count area(s) defined';
  }

  @override
  String get setupDrawWorkArea => 'Draw at least one polygon or corridor';

  @override
  String setupMissingFields(String fields) {
    return 'Missing: $fields';
  }

  @override
  String get fieldOpsQuickActions => 'Quick actions';

  @override
  String get viewAllProjects => 'View all projects';

  @override
  String get viewAll => 'View all';

  @override
  String get noProjectsAssigned => 'No projects assigned yet.';

  @override
  String get registerTreeInField => 'Register a tree';

  @override
  String get navSyncQueue => 'Sync queue';

  @override
  String get auditWorkspaceTitle => 'Estate Watch audit';

  @override
  String get auditWorkspaceSubtitle =>
      'Field verification, attestation, and sync status';

  @override
  String get auditWorkspaceNoAccess =>
      'You do not have access to Estate Watch audit tools.';

  @override
  String get auditEngagements => 'Engagements';

  @override
  String get auditPlotsDue => 'Plots due';

  @override
  String get auditInField => 'In field';

  @override
  String get auditExportReady => 'Export ready';

  @override
  String get auditAttested => 'Attested';

  @override
  String get auditNearestAction => 'Nearest action';

  @override
  String auditPlotsDueTitle(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count plots need visits',
      one: '1 plot needs a visit',
    );
    return '$_temp0';
  }

  @override
  String get auditPlotsDueSubtitle =>
      'Capture GPS, photos, and tree counts at assigned plots';

  @override
  String get auditOpenPlots => 'Open plots';

  @override
  String get auditAttestationAction => 'Attestation';

  @override
  String get auditOpenAttestation => 'Review & sign';

  @override
  String get auditQuickLinks => 'Quick links';

  @override
  String get auditPlotVisits => 'Plot visits';

  @override
  String get auditPlotNavigate => 'Navigate';

  @override
  String get auditPlotStartVisit => 'Start visit';

  @override
  String auditPlotsWaiting(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count plots waiting for verifier visits',
      one: '1 plot waiting for verifier visit',
    );
    return '$_temp0';
  }

  @override
  String get auditPlotsAllVisitedShort =>
      'All assigned audit plots are visited for the current scope.';

  @override
  String get auditPlotsAllVisited =>
      'All assigned plots visited for current scope';

  @override
  String get auditAttestationTitle => 'Attestation';

  @override
  String get auditAttestationMobileSubtitle =>
      'Review anomalies and sign off export bundles';

  @override
  String get auditAttestationUnavailable =>
      'No engagement is ready for attestation yet.';

  @override
  String get auditSyncQueueHint =>
      'Retry failed audit visits and offline uploads';

  @override
  String get auditProjectsTitle => 'Estate projects';

  @override
  String get auditNoEstateProjects => 'No estate monitoring projects';

  @override
  String get auditNoEstateProjectsHint =>
      'Estate Watch engagements appear here when estate monitoring projects are assigned.';

  @override
  String get auditAttestationLocked => 'Attestation locked';

  @override
  String get auditAttestationExportRequired =>
      'Complete export readiness on web before mobile sign-off.';

  @override
  String get auditAnomalyReviews => 'Anomaly reviews';

  @override
  String get auditNoAnomalies => 'No anomalies require review.';

  @override
  String get auditReviewAnomaly => 'Review';

  @override
  String get auditReviewSaved => 'Anomaly review saved';

  @override
  String get auditReviewRationaleRequired =>
      'Enter a rationale for this review.';

  @override
  String get auditDispositionUphold => 'Uphold';

  @override
  String get auditDispositionOverturn => 'Overturn';

  @override
  String get auditDispositionDefer => 'Defer';

  @override
  String get auditLeadSignOff => 'Lead sign-off';

  @override
  String get auditVerdictLabel => 'Verdict';

  @override
  String get auditVerdictApproved => 'Approved';

  @override
  String get auditVerdictConditional => 'Conditional';

  @override
  String get auditVerdictRejected => 'Rejected';

  @override
  String get auditSignSummaryLabel => 'Attestation summary';

  @override
  String get auditSignSummaryRequired => 'Enter an attestation summary.';

  @override
  String get auditSignNotesLabel => 'Notes (optional)';

  @override
  String get auditSignAttestation => 'Sign attestation';

  @override
  String get auditSignSaved => 'Attestation signed';

  @override
  String get auditCosignTitle => 'Co-sign attestation';

  @override
  String get auditCosignNotesLabel => 'Co-sign notes (optional)';

  @override
  String get auditCosignAttestation => 'Co-sign';

  @override
  String get auditCosignSaved => 'Co-signature recorded';

  @override
  String auditSignaturesTitle(int count, int required) {
    return '$count of $required signatures';
  }

  @override
  String auditPendingCosign(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count co-signatures pending',
      one: '1 co-signature pending',
    );
    return '$_temp0';
  }

  @override
  String auditSignedVerdict(String verdict) {
    return 'Signed: $verdict';
  }

  @override
  String get auditCreateVerifyLink => 'Create public verify link';

  @override
  String get auditCopyVerifyLink => 'Copy link';

  @override
  String get auditOpenVerifyLink => 'Open';

  @override
  String get auditVerifyLinkCopied => 'Verify link copied';

  @override
  String get auditSyncAuditVisits => 'Audit plot visits';

  @override
  String get auditSyncRetryFailed => 'Retry failed visits';

  @override
  String get auditSyncOpenWorkspace => 'Open Estate Watch';

  @override
  String get auditSyncEmptyHint =>
      'Capture plot visits from Field or Estate Watch audit';

  @override
  String get dashboardAlertsSection => 'Alerts';

  @override
  String get dashboardNoUrgentAlerts => 'No urgent items';

  @override
  String get dashboardAlertsClear => 'Field alerts are clear for now';

  @override
  String get pendingSyncBannerSyncing => 'Syncing offline data…';

  @override
  String pendingSyncBannerWaiting(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count items waiting to sync when online',
      one: '1 item waiting to sync when online',
    );
    return '$_temp0';
  }

  @override
  String get syncNow => 'Sync now';

  @override
  String get syncQueueAllSynced => 'All synced';

  @override
  String syncQueuePendingCount(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count items pending',
      one: '1 item pending',
    );
    return '$_temp0';
  }

  @override
  String syncQueueBreakdown(int trees, int survival, int audit, int bio) {
    return '$trees trees · $survival survival · $audit audit · $bio bio';
  }

  @override
  String get fieldAlertsTitle => 'Field alerts';

  @override
  String get addTreeWizardSiteSpecies => 'Site & species';

  @override
  String get addTreeWizardGpsPlacement => 'GPS & placement';

  @override
  String get addTreeWizardPhotosSubmit => 'Photos & submit';

  @override
  String get viewSyncQueue => 'View sync queue';

  @override
  String get monitoringBioLoadError => 'Bioacoustic summary unavailable';

  @override
  String get addTreeWizardContext => 'Project & work area';

  @override
  String get addTreeWizardPhotos => 'Photos';

  @override
  String get addTreeWizardReview => 'Review & submit';

  @override
  String get fieldNearbyTreesSorted =>
      'Sorted by distance from your current location';

  @override
  String dashboardTreesRegistered(int count) {
    return '$count trees registered';
  }

  @override
  String get segmentNutriGarden => 'Nutri-garden / Poshan Vatika';

  @override
  String get schemePoshanVatika => 'Amrit Poshan Vatika';

  @override
  String get schemeApvSiteId => 'APV site ID';

  @override
  String get schemeGramPanchayat => 'Gram panchayat';

  @override
  String get schemeSiteAreaHa => 'Site area (ha)';

  @override
  String get syncQueueSyncing => 'Syncing…';

  @override
  String syncQueueSyncedCount(int count) {
    return 'Synced $count item(s)';
  }

  @override
  String get syncQueueDeleteConfirmBody =>
      'This removes the offline item from your device. It cannot be undone.';

  @override
  String get deleteLabel => 'Delete';

  @override
  String get syncQueueItemRemoved => 'Item removed';

  @override
  String get syncQueueTreeRegistration => 'Tree registration';

  @override
  String syncQueueStatusLine(String status) {
    return 'Status: $status';
  }

  @override
  String syncQueuePhotosLine(int count) {
    return 'Photos: $count';
  }

  @override
  String syncQueueGpsLine(String lat, String lon) {
    return 'GPS: $lat, $lon';
  }

  @override
  String syncQueueQueuedLine(String time) {
    return 'Queued: $time';
  }

  @override
  String get syncQueueRetryUpload => 'Retry upload';

  @override
  String get syncQueueDeleteFromQueue => 'Delete from queue';

  @override
  String get syncQueueDeleteTreeTitle => 'Delete tree registration?';

  @override
  String get syncQueueBioRecording => 'Bioacoustic recording';

  @override
  String syncQueueDurationLine(String seconds) {
    return 'Duration: ${seconds}s';
  }

  @override
  String get syncQueueDeleteRecordingTitle => 'Delete recording?';

  @override
  String get syncQueueAuditPlotVisit => 'Audit plot visit';

  @override
  String syncQueuePresenceLine(String value) {
    return 'Presence: $value';
  }

  @override
  String get syncQueueDeleteAuditVisitTitle => 'Delete audit visit?';

  @override
  String get syncQueueSurvivalSurveyTitle => 'Survival survey';

  @override
  String syncQueueTreeLine(String id) {
    return 'Tree: $id';
  }

  @override
  String syncQueueSurvivalStatusLine(String status) {
    return 'Status: $status';
  }

  @override
  String syncQueueQueueLine(String status) {
    return 'Queue: $status';
  }

  @override
  String get syncQueueDeleteSurvivalTitle => 'Delete survival survey?';

  @override
  String syncQueueRecordingMeta(String seconds) {
    return '${seconds}s recording';
  }

  @override
  String syncQueuePhotosMeta(int count, String status) {
    return '$count photo(s) · $status';
  }

  @override
  String get plotFallback => 'Plot';

  @override
  String get surveyFallback => 'survey';

  @override
  String get visitFallback => 'visit';

  @override
  String get evidenceTitle => 'Evidence & MRV';

  @override
  String get evidenceMrvShareText => 'MRV compliance export';

  @override
  String get evidenceMrvReady => 'MRV export ready to share';

  @override
  String get evidenceBundleShareText => 'Evidence bundle';

  @override
  String get evidenceBundleReady => 'Evidence bundle ready to share';

  @override
  String get evidenceProjectScope => 'Project scope';

  @override
  String get evidenceNoProjects => 'No projects available';

  @override
  String get evidenceSelectProject => 'Select project';

  @override
  String get evidencePortfolioAll => 'Portfolio (all)';

  @override
  String get evidencePipeline => 'Evidence pipeline';

  @override
  String get evidenceVerified => 'Verified';

  @override
  String get evidencePending => 'Pending';

  @override
  String get evidenceGaps => 'Gaps';

  @override
  String get evidenceGapsHeader => 'Gaps needing attention';

  @override
  String get evidenceNoGaps => 'No evidence gaps';

  @override
  String get evidenceNoGapsSub => 'Portfolio evidence is up to date';

  @override
  String get evidenceExports => 'Exports';

  @override
  String get evidenceDownloadMrvPdf => 'Download MRV pack (PDF)';

  @override
  String get evidenceDownloadMrvExcel => 'Download MRV pack (Excel)';

  @override
  String get evidenceDownloadBundle => 'Download evidence bundle (ZIP)';

  @override
  String get evidenceReportsExports => 'Reports & exports';

  @override
  String get evidenceGapSurvivalDue => 'Survival survey evidence due';

  @override
  String get evidenceGapViolationsOpen => 'Compliance violations open';

  @override
  String get evidenceGapIntegrityBlocked => 'Integrity monitoring gate blocked';

  @override
  String get evidenceGapCreditTransitions => 'Credit transitions';

  @override
  String get evidenceGapFieldOps => 'Field ops';

  @override
  String evidenceGapTreesCount(String count) {
    return '$count trees';
  }

  @override
  String evidenceGapOpenCount(String count) {
    return '$count open';
  }

  @override
  String get treeRegistryTitle => 'Tree registry';

  @override
  String get filtersTitle => 'Filters';

  @override
  String get filterAll => 'All';

  @override
  String get clearFilters => 'Clear filters';

  @override
  String get treeRegistrySearchHint => 'Search ID, species, area…';

  @override
  String get sortRecent => 'Recent';

  @override
  String get sortTreeId => 'Tree ID';

  @override
  String get treesCountSuffix => 'trees';

  @override
  String get registryCategoryAttention => 'Attention';

  @override
  String get registryCategoryMissingEvidence => 'Missing evidence';

  @override
  String get registryCategoryUnverified => 'Unverified';

  @override
  String get registryCategoryHealthy => 'Healthy';

  @override
  String registryOnPageTotal(int onPage, int total) {
    return '$onPage on page · $total total';
  }

  @override
  String registryPageOf(int current, int pages) {
    return 'Page $current of $pages';
  }

  @override
  String get registryPrev => '← Prev';

  @override
  String get registryNext => 'Next →';

  @override
  String get registryNoMatch => 'No trees match';

  @override
  String get registryNoMatchSub => 'Try a different filter or search term';

  @override
  String get registryCachedList => 'Showing cached tree list';

  @override
  String registryCachedListFrom(String time) {
    return 'Showing cached tree list from $time';
  }

  @override
  String get statusUnverified => 'Unverified';

  @override
  String get projectCreditLedger => 'Credit ledger';

  @override
  String get projectSetupTitle => 'Project setup';

  @override
  String get completeSetup => 'Complete setup';

  @override
  String get openSetupOnWeb => 'Open setup on web';

  @override
  String get survivalSurveysDue => 'Survival surveys due';

  @override
  String survivalNoSurveysDue(int total, String interval) {
    return 'No survival surveys due ($total trees on $interval day interval)';
  }

  @override
  String survivalTreesNeedRegeotag(int due, int total, String interval) {
    return '$due of $total trees need re-geotag ($interval day interval)';
  }

  @override
  String treeIdLabel(String id) {
    return 'Tree $id';
  }

  @override
  String moreCount(int count) {
    return '+ $count more';
  }

  @override
  String get integrityMonitoringGate => 'Integrity monitoring gate';

  @override
  String get integrityGatePassed =>
      'Monitoring gate passed for credit transitions.';

  @override
  String get integrityGateBlocked =>
      'Monitoring gate blocked for credit transitions.';

  @override
  String integrityEligibleAudit(
    String eligible,
    String total,
    String auditReady,
  ) {
    return 'Eligible $eligible/$total · Audit ready $auditReady/$total';
  }

  @override
  String treesWithBlockingIssues(int count) {
    return '$count tree(s) with blocking issues';
  }

  @override
  String get satelliteNoScan => 'Satellite: no scan yet';

  @override
  String get satelliteScanned => 'Satellite: scanned';

  @override
  String satelliteStale(int days) {
    return 'Satellite: stale ($days days ago)';
  }

  @override
  String get satelliteScannedToday => 'Satellite: scanned today';

  @override
  String satelliteDaysAgo(int days) {
    return 'Satellite: $days days ago';
  }

  @override
  String treesPerHa(String count) {
    return '$count trees/ha';
  }

  @override
  String workAreaBlock(String code) {
    return 'block $code';
  }

  @override
  String get treeDetailOverview => 'Overview';

  @override
  String get treeDetailField => 'Field';

  @override
  String get treeDetailIntelligence => 'Intelligence';

  @override
  String get treeDetailMap => 'Map';

  @override
  String get treeDetailInspect => 'Inspect';

  @override
  String get treeDetailEvidence => 'Evidence';

  @override
  String get treeDetailMonitor => 'Monitor';

  @override
  String get treeDetailVerified => 'Verified';

  @override
  String get treeDetailFieldLocation => 'Field location';

  @override
  String get treeDetailFollowUpPhotoAdded => 'Follow-up photo added';

  @override
  String get treeDetailCachedDetail =>
      'Showing cached tree detail — connect to refresh';

  @override
  String get treeDetailUploadingPhoto => 'Uploading photo…';

  @override
  String get treeDetailAddFollowUpPhoto => 'Add follow-up photo';

  @override
  String get treeDetailPhotoGallery => 'Photo gallery';

  @override
  String get treeDetailNoPhotos => 'No photos yet';

  @override
  String get treeDetailNoPhotosSub =>
      'Add a follow-up photo from Overview or during survival survey';

  @override
  String get treeDetailMeasurementHistory => 'Measurement history';

  @override
  String get treeDetailNoMeasurements => 'No measurements recorded';

  @override
  String get treeDetailNoMeasurementsSub =>
      'Survival surveys and field captures appear here';

  @override
  String get treeDetailAiHistory => 'AI analysis history';

  @override
  String get treeDetailNoAiAnalyses => 'No AI analyses yet';

  @override
  String get treeDetailNoAiAnalysesSub =>
      'Run AI analysis from the Overview tab';

  @override
  String get treeDetailSarFusion => 'SAR integrity fusion';

  @override
  String get treeDetailGroundStatus => 'Ground status';

  @override
  String get treeDetailIntegrityScoreLabel => 'Integrity score';

  @override
  String get treeDetailAuditBlockers => 'Audit-ready blockers';

  @override
  String get treeDetailTimeline => 'Timeline';

  @override
  String treeDetailRegistered(String date) {
    return 'Registered · $date';
  }

  @override
  String get treeDetailFieldCapture => 'Field capture';

  @override
  String get treeDetailSatelliteVerified => 'Satellite verified';

  @override
  String get treeDetailRemoteSensingPassed => 'Remote sensing check passed';

  @override
  String treeDetailNdviSignal(String level) {
    return 'NDVI signal · $level';
  }

  @override
  String get treeDetailMeasurement => 'Measurement';

  @override
  String get treeDetailCanopy => 'Canopy';

  @override
  String get treeDetailAnalysis => 'Analysis';

  @override
  String treeDetailFusionScore(String score) {
    return 'Fusion score $score';
  }

  @override
  String treeDetailCarbonSummary(String kg, String dbh) {
    return 'Carbon $kg kg · DBH $dbh cm';
  }

  @override
  String treeDetailHealthLine(String health) {
    return 'Health $health';
  }

  @override
  String get auditVisitQueued => 'Visit queued for sync when online';

  @override
  String get auditVisitSaved => 'Audit plot visit saved';

  @override
  String auditVisitTitle(String code) {
    return 'Visit $code';
  }

  @override
  String get auditCapturingGps => 'Capturing GPS…';

  @override
  String get auditTreePresence => 'Tree presence';

  @override
  String get auditTreesPresent => 'Trees present';

  @override
  String get auditTreesAbsent => 'No trees / bare ground';

  @override
  String get auditTreesSparse => 'Sparse / scattered';

  @override
  String get auditCannotAssess => 'Cannot assess';

  @override
  String get auditTreesObserved => 'Trees observed';

  @override
  String get auditTreesAlive => 'Trees alive';

  @override
  String get auditOutcome => 'Outcome';

  @override
  String get auditOutcomeInconclusive => 'Inconclusive';

  @override
  String get auditOutcomeSupported => 'Supported';

  @override
  String get auditOutcomeUnsupported => 'Unsupported';

  @override
  String get auditFieldNotes => 'Field notes';

  @override
  String get auditUploadingPhoto => 'Uploading photo…';

  @override
  String auditAddFieldPhoto(int current) {
    return 'Add field photo ($current/5)';
  }

  @override
  String get auditSaveVisit => 'Save visit';

  @override
  String get auditGpsRequired => 'Capture GPS before saving the visit.';

  @override
  String get auditPhotoRequired => 'Add at least one field photo.';

  @override
  String auditRiskSuffix(String risk) {
    return '$risk risk';
  }

  @override
  String get bioSessionDetailTitle => 'Session detail';

  @override
  String get bioDetectionTierAccepted => 'Accepted';

  @override
  String get bioDetectionTierProbable => 'Probable';

  @override
  String get bioDetectionTierReview => 'Review required';

  @override
  String get bioFieldSite => 'Field site';

  @override
  String get bioDetectedSpecies => 'Detected species';

  @override
  String get bioDetectionsPending =>
      'Species detections will appear when analysis completes.';

  @override
  String get bioNoDetections => 'No species detections yet.';

  @override
  String get bioViewBiodiversityFusion => 'View biodiversity fusion';

  @override
  String get bioAddToEvidence => 'Add to evidence bundle';

  @override
  String get viewOnMap => 'View on map';

  @override
  String bioConfidenceScore(String score) {
    return 'Confidence $score/100';
  }

  @override
  String bioAcceptedCount(String count) {
    return 'Accepted $count';
  }

  @override
  String bioShannonLine(String value) {
    return 'Shannon $value';
  }

  @override
  String bioCallsCount(String count) {
    return '$count calls';
  }

  @override
  String get biodiversityTitle => 'Biodiversity';

  @override
  String get bioTaxa => 'Taxa';

  @override
  String get bioShannonLabel => 'Shannon';

  @override
  String get bioConfidenceLabel => 'Confidence';

  @override
  String bioConfidenceHint(int count) {
    return 'Biodiversity Confidence from $count analyzed recordings (evidence quality, not habitat health)';
  }

  @override
  String bioRegionalSpeciesNear(String lat, String lon) {
    return 'Regional species near $lat, $lon';
  }

  @override
  String get bioRegionalSpeciesGbif => 'Regional species (GBIF)';

  @override
  String get bioHotspotsByWorkArea => 'Hotspots by work area';

  @override
  String get bioNoWorkAreas => 'No work areas';

  @override
  String get bioNoWorkAreasMapped => 'No work areas mapped';

  @override
  String bioConfidenceMeta(int score) {
    return 'Confidence $score/100';
  }

  @override
  String get bioStrong => 'Strong';

  @override
  String get bioWatch => 'Watch';

  @override
  String get bioAcousticDetail => 'Bioacoustic detail';

  @override
  String get bioRunSurvey => 'Run bioacoustic survey';

  @override
  String get bioNoLocationSpecies => 'No location for species list';

  @override
  String get bioNoLocationSpeciesSub =>
      'Add a work area boundary or register a tree with GPS to load regional fauna.';

  @override
  String get bioNoRegionalSpecies => 'No regional species found';

  @override
  String get bioNoRegionalSpeciesSub =>
      'GBIF returned no nearby occurrences for this site.';

  @override
  String get bioViewOnMapMeta => 'View on map';

  @override
  String get bioOpen => 'Open';

  @override
  String get carbonPortfolioTco2e => 'tCO₂e estimated (portfolio)';

  @override
  String carbonAnnualPace(int pct) {
    return '$pct% of annual sequestration pace';
  }

  @override
  String carbonTreesInPortfolio(int count) {
    return '$count trees in portfolio';
  }

  @override
  String get carbonByProject => 'By project';

  @override
  String get carbonEnterSpecies => 'Enter a species name.';

  @override
  String get carbonEstimateDisclaimer =>
      'Estimate CO₂e from species and optional measurements. This is an Estimate — not a Live field measurement or registry-issued credit.';

  @override
  String carbonCo2eRange(String lower, String upper) {
    return '$lower–$upper kg CO₂e (90% CI)';
  }

  @override
  String carbonCo2eSingle(String value) {
    return '$value kg CO₂e';
  }

  @override
  String carbonUncertainty(String pct) {
    return '±$pct% measurement + model uncertainty';
  }

  @override
  String get carbonHonestyLabel =>
      'Honesty label: Estimate (modelled). Not Live sensor data.';

  @override
  String get reportReadyToShare => 'Report ready to share';

  @override
  String get reportMisTitle => 'Plantation MIS reports';

  @override
  String get reportMisSubtitle =>
      'Operational exports used by government plantation programmes';

  @override
  String get reportTypeLabel => 'Report type';

  @override
  String get reportDownloading => 'Downloading…';

  @override
  String get reportDownloadMis => 'Download MIS report';

  @override
  String reportReadyShareNamed(String name) {
    return '$name ready to share';
  }

  @override
  String get downloadLabel => 'Download';

  @override
  String get creditIntegrityFusion => 'Integrity fusion';

  @override
  String get creditAuditReady => 'Audit ready';

  @override
  String get creditEligible => 'Credit eligible';

  @override
  String get creditStatusHistory => 'Status history';

  @override
  String get creditSerials => 'Credit serials';

  @override
  String get creditSerialFallback => 'Serial';

  @override
  String get viewProject => 'View project';

  @override
  String get projectLedgers => 'Project ledgers';

  @override
  String get alertRecommendedAction => 'Recommended action';

  @override
  String get alertMarkReviewed => 'Mark reviewed';

  @override
  String get alertViewAffectedTree => 'View affected tree →';

  @override
  String get createProjectTitle => 'Create project';

  @override
  String get createProjectSubtitle =>
      'Supervisors can start a planting project and finish setup on the web.';

  @override
  String get createProjectNameLabel => 'Project name';

  @override
  String get createProjectDescriptionLabel => 'Description (optional)';

  @override
  String get createProjectSegmentLabel => 'Segment';

  @override
  String get createProjectNameRequired => 'Project name is required';

  @override
  String get newProject => 'New project';

  @override
  String get survivalMissingUprooted => 'Missing / uprooted';

  @override
  String get survivalTapeMeasure => 'Tape measure (DBH at 1.3 m)';

  @override
  String get survivalClinometer => 'Clinometer (height)';

  @override
  String get survivalPhotoAttached => 'Survey photo attached';

  @override
  String get survivalCapturingPhoto => 'Capturing photo…';

  @override
  String get survivalAddPhoto => 'Add survey photo (camera)';

  @override
  String get survivalRemarksHint => 'Condition, replacement notes…';

  @override
  String get openInMaps => 'Open in Maps';

  @override
  String get myLocation => 'My location';

  @override
  String get closeLabel => 'Close';

  @override
  String get prepareLabel => 'Prepare';

  @override
  String get schemeProgramme => 'Scheme programme';

  @override
  String get governmentReferences => 'Government references';

  @override
  String get schemeFallback => 'Scheme';

  @override
  String get onboardingVerifyOrg =>
      '• Our team verifies your organization details';

  @override
  String get onboardingApprovalEmail => '• You receive an approval email';

  @override
  String get onboardingSignInDashboard =>
      '• Open the app and sign in to access your dashboard';

  @override
  String get onboardingPendingSubtitle =>
      'Your organization profile is under review. We will email you when your account is approved — usually within 1–2 business days.';

  @override
  String get blockerInsufficientPhotos => 'Need at least 2 photos';

  @override
  String get blockerPhotoSpanTooShort => 'Photos must span 30+ days';

  @override
  String get blockerSatelliteScanStale => 'Satellite scan older than 90 days';

  @override
  String get blockerFusionBelowAudit => 'Fusion score below 75';

  @override
  String get blockerMissingExif => 'Missing camera EXIF';

  @override
  String get blockerMissingPhotoGps => 'Photo missing GPS';

  @override
  String get blockerMissingPhotoTimestamp => 'Photo missing timestamp';

  @override
  String get blockerPhotoTimestampStale => 'Photo older than 7 days';

  @override
  String get blockerRegeotagMismatch => 'Re-geotag mismatch';

  @override
  String get blockerDuplicatePhoto => 'Duplicate photo';

  @override
  String get blockerDuplicateCoordinate => 'Duplicate coordinate';

  @override
  String get blockerAiConfidenceLow => 'Low AI confidence';

  @override
  String get blockerSarIntegrityBelow => 'SAR forest integrity below minimum';

  @override
  String get blockerOpticalScanStale => 'Work area optical scan stale';

  @override
  String get blockerFusionBelowMinimum => 'Fusion score below minimum';

  @override
  String get blockerNotCreditEligible => 'Not credit eligible';

  @override
  String get remediationAddFollowUpPhoto =>
      'Add a follow-up field photo from the tree detail page.';

  @override
  String get remediationRunSurvivalSurvey =>
      'Run a survival survey with GPS and an optional survey photo.';

  @override
  String get remediationTriggerSatellite =>
      'Trigger a satellite health scan from tree detail.';

  @override
  String get remediationReviewMonitoring =>
      'Review monitoring coverage for this project.';

  @override
  String get monitoringNeedsDecision => 'Needs decision';

  @override
  String get monitoringNoUrgentAlerts => 'No urgent alerts';

  @override
  String get monitoringSignalsStable => 'Monitoring signals are stable';

  @override
  String get monitoringSitePulse => 'Site pulse';

  @override
  String get alertCategoryFire => 'Fire';

  @override
  String get alertCategoryFlood => 'Flood';

  @override
  String get alertCategoryWeather => 'Weather';

  @override
  String get alertCategoryPest => 'Pest';

  @override
  String get alertCategorySatellite => 'Satellite';

  @override
  String get alertUrgencyActNow => 'Act now';

  @override
  String get alertUrgencyPrepare => 'Prepare';

  @override
  String get alertUrgencyMonitor => 'Monitor';

  @override
  String get healthFilterHealthy => 'healthy';

  @override
  String get healthFilterStressed => 'stressed';

  @override
  String get healthFilterDead => 'dead';

  @override
  String get monthJan => 'Jan';

  @override
  String get monthFeb => 'Feb';

  @override
  String get monthMar => 'Mar';

  @override
  String get monthApr => 'Apr';

  @override
  String get monthMay => 'May';

  @override
  String get monthJun => 'Jun';

  @override
  String get monthJul => 'Jul';

  @override
  String get monthAug => 'Aug';

  @override
  String get monthSep => 'Sep';

  @override
  String get monthOct => 'Oct';

  @override
  String get monthNov => 'Nov';

  @override
  String get monthDec => 'Dec';

  @override
  String get methodologyTitle => 'Methodology';

  @override
  String get alertUrgencyActToday => 'Act today';

  @override
  String get alertUrgencyThisWeek => 'This week';
}
