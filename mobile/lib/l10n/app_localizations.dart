import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:intl/intl.dart' as intl;

import 'app_localizations_en.dart';
import 'app_localizations_hi.dart';

// ignore_for_file: type=lint

/// Callers can lookup localized strings with an instance of AppLocalizations
/// returned by `AppLocalizations.of(context)`.
///
/// Applications need to include `AppLocalizations.delegate()` in their app's
/// `localizationDelegates` list, and the locales they support in the app's
/// `supportedLocales` list. For example:
///
/// ```dart
/// import 'l10n/app_localizations.dart';
///
/// return MaterialApp(
///   localizationsDelegates: AppLocalizations.localizationsDelegates,
///   supportedLocales: AppLocalizations.supportedLocales,
///   home: MyApplicationHome(),
/// );
/// ```
///
/// ## Update pubspec.yaml
///
/// Please make sure to update your pubspec.yaml to include the following
/// packages:
///
/// ```yaml
/// dependencies:
///   # Internationalization support.
///   flutter_localizations:
///     sdk: flutter
///   intl: any # Use the pinned version from flutter_localizations
///
///   # Rest of dependencies
/// ```
///
/// ## iOS Applications
///
/// iOS applications define key application metadata, including supported
/// locales, in an Info.plist file that is built into the application bundle.
/// To configure the locales supported by your app, you’ll need to edit this
/// file.
///
/// First, open your project’s ios/Runner.xcworkspace Xcode workspace file.
/// Then, in the Project Navigator, open the Info.plist file under the Runner
/// project’s Runner folder.
///
/// Next, select the Information Property List item, select Add Item from the
/// Editor menu, then select Localizations from the pop-up menu.
///
/// Select and expand the newly-created Localizations item then, for each
/// locale your application supports, add a new item and select the locale
/// you wish to add from the pop-up menu in the Value field. This list should
/// be consistent with the languages listed in the AppLocalizations.supportedLocales
/// property.
abstract class AppLocalizations {
  AppLocalizations(String locale)
      : localeName = intl.Intl.canonicalizedLocale(locale.toString());

  final String localeName;

  static AppLocalizations? of(BuildContext context) {
    return Localizations.of<AppLocalizations>(context, AppLocalizations);
  }

  static const LocalizationsDelegate<AppLocalizations> delegate =
      _AppLocalizationsDelegate();

  /// A list of this localizations delegate along with the default localizations
  /// delegates.
  ///
  /// Returns a list of localizations delegates containing this delegate along with
  /// GlobalMaterialLocalizations.delegate, GlobalCupertinoLocalizations.delegate,
  /// and GlobalWidgetsLocalizations.delegate.
  ///
  /// Additional delegates can be added by appending to this list in
  /// MaterialApp. This list does not have to be used at all if a custom list
  /// of delegates is preferred or required.
  static const List<LocalizationsDelegate<dynamic>> localizationsDelegates =
      <LocalizationsDelegate<dynamic>>[
    delegate,
    GlobalMaterialLocalizations.delegate,
    GlobalCupertinoLocalizations.delegate,
    GlobalWidgetsLocalizations.delegate,
  ];

  /// A list of this localizations delegate's supported locales.
  static const List<Locale> supportedLocales = <Locale>[
    Locale('en'),
    Locale('hi')
  ];

  /// No description provided for @appTitle.
  ///
  /// In en, this message translates to:
  /// **'Aranyix'**
  String get appTitle;

  /// No description provided for @welcomeTitle.
  ///
  /// In en, this message translates to:
  /// **'Grow forests with proof'**
  String get welcomeTitle;

  /// No description provided for @signIn.
  ///
  /// In en, this message translates to:
  /// **'Sign in'**
  String get signIn;

  /// No description provided for @signUp.
  ///
  /// In en, this message translates to:
  /// **'Sign up'**
  String get signUp;

  /// No description provided for @home.
  ///
  /// In en, this message translates to:
  /// **'Home'**
  String get home;

  /// No description provided for @trees.
  ///
  /// In en, this message translates to:
  /// **'Trees'**
  String get trees;

  /// No description provided for @map.
  ///
  /// In en, this message translates to:
  /// **'Map'**
  String get map;

  /// No description provided for @notifications.
  ///
  /// In en, this message translates to:
  /// **'Notifications'**
  String get notifications;

  /// No description provided for @profile.
  ///
  /// In en, this message translates to:
  /// **'Profile'**
  String get profile;

  /// No description provided for @monitoring.
  ///
  /// In en, this message translates to:
  /// **'Monitoring'**
  String get monitoring;

  /// No description provided for @projects.
  ///
  /// In en, this message translates to:
  /// **'Projects'**
  String get projects;

  /// No description provided for @fieldOps.
  ///
  /// In en, this message translates to:
  /// **'Field ops'**
  String get fieldOps;

  /// No description provided for @shareTreeQr.
  ///
  /// In en, this message translates to:
  /// **'Share tree QR'**
  String get shareTreeQr;

  /// No description provided for @shareTreeMessage.
  ///
  /// In en, this message translates to:
  /// **'View this tree on Aranyix: {url}'**
  String shareTreeMessage(String url);

  /// No description provided for @language.
  ///
  /// In en, this message translates to:
  /// **'Language'**
  String get language;

  /// No description provided for @languageEnglish.
  ///
  /// In en, this message translates to:
  /// **'English'**
  String get languageEnglish;

  /// No description provided for @languageHindi.
  ///
  /// In en, this message translates to:
  /// **'Hindi'**
  String get languageHindi;

  /// No description provided for @security.
  ///
  /// In en, this message translates to:
  /// **'Security'**
  String get security;

  /// No description provided for @biometricUnlock.
  ///
  /// In en, this message translates to:
  /// **'Unlock with biometrics'**
  String get biometricUnlock;

  /// No description provided for @biometricUnlockHint.
  String get biometricUnlockHint;

  /// No description provided for @biometricEnableFailed.
  String get biometricEnableFailed;

  /// No description provided for @biometricEnabled.
  String get biometricEnabled;

  /// No description provided for @biometricDisabled.
  String get biometricDisabled;

  /// No description provided for @screenshotGuard.
  ///
  /// In en, this message translates to:
  /// **'Block screenshots'**
  String get screenshotGuard;

  String get screenshotGuardHint;

  String get screenshotGuardEnabled;

  String get screenshotGuardDisabled;

  /// No description provided for @certificatePinning.
  ///
  /// In en, this message translates to:
  /// **'Certificate pinning'**
  String get certificatePinning;

  /// No description provided for @offlineSyncPending.
  ///
  /// In en, this message translates to:
  /// **'{count, plural, =1{1 item waiting to sync} other{{count} items waiting to sync}}'**
  String offlineSyncPending(int count);

  /// No description provided for @offlineSyncing.
  ///
  /// In en, this message translates to:
  /// **'Syncing offline data…'**
  String get offlineSyncing;

  /// No description provided for @offlineMode.
  ///
  /// In en, this message translates to:
  /// **'You are offline — changes will sync when connected.'**
  String get offlineMode;

  /// No description provided for @coachMarkHomeTitle.
  ///
  /// In en, this message translates to:
  /// **'Your forest dashboard'**
  String get coachMarkHomeTitle;

  /// No description provided for @coachMarkHomeBody.
  ///
  /// In en, this message translates to:
  /// **'Health score, alerts, and quick actions live here.'**
  String get coachMarkHomeBody;

  /// No description provided for @coachMarkTreesTitle.
  ///
  /// In en, this message translates to:
  /// **'Register & track trees'**
  String get coachMarkTreesTitle;

  /// No description provided for @coachMarkTreesBody.
  ///
  /// In en, this message translates to:
  /// **'Add trees in the field — they sync when you are back online.'**
  String get coachMarkTreesBody;

  /// No description provided for @coachMarkMapTitle.
  ///
  /// In en, this message translates to:
  /// **'Map your plantation'**
  String get coachMarkMapTitle;

  /// No description provided for @coachMarkMapBody.
  ///
  /// In en, this message translates to:
  /// **'See sites, corridors, and NDVI context on the map.'**
  String get coachMarkMapBody;

  /// No description provided for @coachMarkDone.
  ///
  /// In en, this message translates to:
  /// **'Got it'**
  String get coachMarkDone;

  /// No description provided for @pushNotifications.
  ///
  /// In en, this message translates to:
  /// **'Push notifications'**
  String get pushNotifications;

  /// No description provided for @pushNotificationsHint.
  ///
  /// In en, this message translates to:
  /// **'Alerts for satellite health, compliance, and survival surveys.'**
  String get pushNotificationsHint;

  /// No description provided for @deepLinkTreeNotFound.
  ///
  /// In en, this message translates to:
  /// **'Tree not found or you do not have access.'**
  String get deepLinkTreeNotFound;

  /// No description provided for @analyticsEnabled.
  ///
  /// In en, this message translates to:
  /// **'Usage analytics'**
  String get analyticsEnabled;

  /// No description provided for @analyticsHint.
  ///
  /// In en, this message translates to:
  /// **'Helps improve the app (no personal tree photos).'**
  String get analyticsHint;

  String get navDashboard;
  String get navSectionPlantation;
  String get navSectionPlantationDesc;
  String get navSectionIntelligence;
  String get navSectionIntelligenceDesc;
  String get navSectionReports;
  String get navSectionReportsDesc;
  String get navSectionAccount;
  String get navBioacoustic;
  String get navAlerts;
  String get navReports;
  String get navAssistant;
  String get navCarbon;
  String get navCredits;
  String get registerTreePrimary;
  String get registerTreePrimarySub;
  String get bioacousticActionSub;
  String get bioacousticTileSub;
  String get projectsTileSub;
  String get addActionFab;
  String get addActionSheetTitle;
  String get addActionSheetSubtitle;
  String get addActionSheetEmpty;
  String get menuOpen;

  String get drawerLoadError;

  String get drawerSignInRequired;

  String get drawerNoNavItems;

  String get todayWork;
  String get fieldWorkspace;
  String get viewFullDashboard;

  String get addTreeTitle;
  String get addTreeTitleProject;
  String get addTreeStepContext;
  String get addTreeStepSpecies;
  String get addTreeStepLocation;
  String get addTreeStepPhotos;
  String get addTreeStepReview;
  String addTreeStepOf(int current, int total);
  String get addTreeBack;
  String get addTreeNext;
  String get addTreeSaving;
  String get addTreeSaveAndNext;
  String get addTreeSaveAndExit;
  String get addTreeProjectHint;
  String get addTreeSetupBlockedTitle;
  String get addTreeSetupBlockedBody;
  String get addTreeOpenProject;
  String get addTreeWorkArea;
  String get addTreeProgram;

  String get addTreeProgramHint;

  String get addTreeValidationProgram;

  String get addTreeValidationWorkArea;

  String get addTreeApprovedSpecies;
  String get addTreeSpecies;
  String get addTreeRoadSide;
  String get addTreeRoadSideNhai;
  String get addTreeGuard;
  String get addTreePitSize;
  String get addTreeMeasurementsTitle;
  String get addTreeMeasurementsHint;
  String get addTreeMeasurementMethod;
  String get addTreeDbh;
  String get addTreeHeight;
  String get addTreeLocationHint;
  String get addTreeGetGps;
  String get addTreePhotosHint;
  String addTreeAddPhoto(int count, int target);
  String addTreeOfflinePhotos(int count);
  String get addTreeReviewTitle;
  String addTreeSessionCount(int count);
  String addTreeMinPhotosWarning(int min);
  String get addTreeValidationContext;
  String get addTreeValidationSpecies;
  String get addTreeValidationLocation;
  String get addTreeValidationCompliance;
  String get bioTabRecord;
  String get bioTabHistory;
  String get bioRecordingLive;
  String bioRecordingTarget(int min, int max);
  String get bioStopAndSave;
  String bioStopMin(int seconds);
  String get bioSiteOptional;
  String get bioSiteGpsOnly;
  String get bioTapToRecord;
  String get bioStartRecording;
  String bioSplLevel(String level);
  String get bioNoiseWarning;
  String get bioFieldTips;
  String get bioSyncTooltip;
  String get bioMicDenied;
  String get bioRecordingStatus;
  String bioTooShort(int min, int elapsed);
  String get bioSaving;
  String bioSavedOfflineGps(String note);
  String get bioSavedOffline;
  String get bioUploading;
  String get bioAnalysisComplete;
  String get bioUploadFailedOffline;
  String get bioSyncing;
  String bioSyncedCount(int count);
  String get bioNothingToSync;
  String get bioQueuePending;
  String get bioQueueSyncing;
  String get bioQueueFailed;
  String get bioOfflineQueue;
  String get bioSyncNow;
  String get bioSyncedRecordings;
  String get bioNoRecordingsYet;
}

class _AppLocalizationsDelegate
    extends LocalizationsDelegate<AppLocalizations> {
  const _AppLocalizationsDelegate();

  @override
  Future<AppLocalizations> load(Locale locale) {
    return SynchronousFuture<AppLocalizations>(lookupAppLocalizations(locale));
  }

  @override
  bool isSupported(Locale locale) =>
      <String>['en', 'hi'].contains(locale.languageCode);

  @override
  bool shouldReload(_AppLocalizationsDelegate old) => false;
}

AppLocalizations lookupAppLocalizations(Locale locale) {
  // Lookup logic when only language code is specified.
  switch (locale.languageCode) {
    case 'en':
      return AppLocalizationsEn();
    case 'hi':
      return AppLocalizationsHi();
  }

  throw FlutterError(
      'AppLocalizations.delegate failed to load unsupported locale "$locale". This is likely '
      'an issue with the localizations generation tool. Please file an issue '
      'on GitHub with a reproducible sample app and the gen-l10n configuration '
      'that was used.');
}
