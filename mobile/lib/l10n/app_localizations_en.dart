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
  String get welcomeSubtitle =>
      'Plantation intelligence — field to audit-ready evidence.';

  @override
  String get signIn => 'Sign in';

  @override
  String get signUp => 'Sign up';

  @override
  String get createFreeAccount => 'Create free account';

  @override
  String get alreadyHaveAccount => 'I already have an account';

  @override
  String get welcomeBack => 'Welcome back';

  @override
  String get signInSubtitle => 'Sign in to your Aranyix account';

  @override
  String get createAccount => 'Create account';

  @override
  String get forgotPassword => 'Forgot password?';

  @override
  String get rememberMe => 'Remember me';

  @override
  String get continueWithGoogle => 'Continue with Google';

  @override
  String get home => 'Home';

  @override
  String get trees => 'Trees';

  @override
  String get map => 'Map';

  @override
  String get alerts => 'Alerts';

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
  String get yourJourney => 'Your journey';

  @override
  String get journeyCapture => 'Capture';

  @override
  String get journeyMonitor => 'Monitor';

  @override
  String get journeyReport => 'Report';

  @override
  String get journeyCaptureLine => 'GPS · photos · offline';

  @override
  String get journeyMonitorLine => 'NDVI · AI alerts';

  @override
  String get journeyReportLine => 'Carbon · audit pack';

  @override
  String get registrationPrograms => 'Registration programs';

  @override
  String get programsHint =>
      'BYOT Public is always active. Request approval for government, corporate, or NGO programs.';

  @override
  String get programActive => 'Active';

  @override
  String get programPending => 'Pending review';

  @override
  String get programRejected => 'Not approved';

  @override
  String get programLocked => 'Approval required';

  @override
  String get requestAccess => 'Request access';

  @override
  String get withdrawRequest => 'Withdraw';

  @override
  String get requestSubmitted =>
      'Access request submitted. An admin will review it shortly.';

  @override
  String get requestWithdrawn => 'Request withdrawn.';

  @override
  String get carbonCredits => 'Carbon Credits';

  @override
  String get carbonNeedsAnalysis =>
      'Run AI analysis on a tree to estimate carbon credits.';

  @override
  String get carbonZeroHint =>
      '0.00 tCO₂e — analyze trees to accumulate credits';

  @override
  String get rescanNdvi => 'Rescan NDVI';

  @override
  String get rescanningNdvi => 'Scanning satellite…';

  @override
  String get runSatelliteHealth => 'Run health check';

  @override
  String get runAiAnalysis => 'Run AI analysis';

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
      'Require fingerprint or face unlock when opening the app.';

  @override
  String get biometricUnlockReason => 'Confirm to enable biometric unlock';

  @override
  String get biometricUnlockFailed =>
      'Biometric check failed. Toggle left off.';

  @override
  String get screenshotGuard => 'Block screenshots';

  @override
  String get screenshotGuardHint =>
      'Prevents screenshots and screen recording on Android.';

  @override
  String get screenshotGuardFailed =>
      'Could not block screenshots on this device.';

  @override
  String get screenshotGuardUnsupported =>
      'Screenshot blocking is available on Android only.';

  @override
  String get certificatePinning => 'Certificate pinning';

  @override
  String get certificatePinningHint =>
      'Reject forged HTTPS certificates (recommended).';

  @override
  String helloName(String name) {
    return 'Hello, $name';
  }

  @override
  String get forestHealth => 'Forest Health';

  @override
  String get viewDetails => 'View Details';

  @override
  String get todaysAiBrief => 'Today\'s AI Brief';

  @override
  String get reviewActions => 'Review Actions';

  @override
  String trendSinceYesterday(String arrow, String delta) {
    return 'Trend: $arrow $delta since yesterday';
  }

  @override
  String get healthExcellent => 'Excellent';

  @override
  String get healthGood => 'Good';

  @override
  String get healthFair => 'Fair';

  @override
  String get healthNeedsCare => 'Needs care';

  @override
  String get programByotName => 'BYOT Public';

  @override
  String get programByotDesc =>
      'Quick citizen tagging for Bring Your Own Tree.';

  @override
  String get programGovName => 'Government & NHAI';

  @override
  String get programGovDesc =>
      'Audit-ready planting for highways, forest dept, and municipal schemes.';

  @override
  String get programCorporateName => 'Industry & Corporate ESG';

  @override
  String get programCorporateDesc =>
      'ESG and sustainability planting with audit baselines.';

  @override
  String get programNgoName => 'NGO & Community';

  @override
  String get programNgoDesc =>
      'Community, farmer, and watershed restoration planting.';

  @override
  String get bioacousticNav => 'Bioacoustic';

  @override
  String get signOut => 'Sign out';

  @override
  String get appVersion => 'App version';

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
}
