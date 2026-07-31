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
  String get screenshotGuard => 'Block screenshots';

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
}
