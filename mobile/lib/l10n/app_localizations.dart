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
    Locale('hi'),
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

  /// No description provided for @navField.
  ///
  /// In en, this message translates to:
  /// **'Field'**
  String get navField;

  /// No description provided for @navBio.
  ///
  /// In en, this message translates to:
  /// **'Bio'**
  String get navBio;

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

  /// No description provided for @appearance.
  ///
  /// In en, this message translates to:
  /// **'Appearance'**
  String get appearance;

  /// No description provided for @themeSystem.
  ///
  /// In en, this message translates to:
  /// **'Match system'**
  String get themeSystem;

  /// No description provided for @themeLight.
  ///
  /// In en, this message translates to:
  /// **'Light'**
  String get themeLight;

  /// No description provided for @themeDark.
  ///
  /// In en, this message translates to:
  /// **'Dark'**
  String get themeDark;

  /// No description provided for @addTreeChainageNext.
  ///
  /// In en, this message translates to:
  /// **'Next chainage: {label}'**
  String addTreeChainageNext(String label);

  /// No description provided for @addTreeProjectMeasurementsHint.
  ///
  /// In en, this message translates to:
  /// **'Optional remeasurements for project MRV — leave blank if not measured in the field.'**
  String get addTreeProjectMeasurementsHint;

  /// No description provided for @citizenStewardshipTitle.
  ///
  /// In en, this message translates to:
  /// **'Citizen stewardship'**
  String get citizenStewardshipTitle;

  /// No description provided for @citizenStewardshipTrees.
  ///
  /// In en, this message translates to:
  /// **'{count} trees registered'**
  String citizenStewardshipTrees(int count);

  /// No description provided for @citizenStewardshipDue.
  ///
  /// In en, this message translates to:
  /// **'{count} stewardship check-ins due'**
  String citizenStewardshipDue(int count);

  /// No description provided for @citizenStewardshipAdopted.
  ///
  /// In en, this message translates to:
  /// **'{count} trees adopted'**
  String citizenStewardshipAdopted(int count);

  /// No description provided for @citizenStewardshipPoints.
  ///
  /// In en, this message translates to:
  /// **'{count} stewardship points'**
  String citizenStewardshipPoints(int count);

  /// No description provided for @citizenAdoptTitle.
  ///
  /// In en, this message translates to:
  /// **'Adopt a tree'**
  String get citizenAdoptTitle;

  /// No description provided for @citizenAdoptSubtitle.
  ///
  /// In en, this message translates to:
  /// **'Support a neighbour\'s BYOT tree with periodic check-ins.'**
  String get citizenAdoptSubtitle;

  /// No description provided for @citizenAdoptCodeLabel.
  ///
  /// In en, this message translates to:
  /// **'Tree public code'**
  String get citizenAdoptCodeLabel;

  /// No description provided for @citizenAdoptByCode.
  ///
  /// In en, this message translates to:
  /// **'Adopt by code'**
  String get citizenAdoptByCode;

  /// No description provided for @citizenAdoptAction.
  ///
  /// In en, this message translates to:
  /// **'Adopt'**
  String get citizenAdoptAction;

  /// No description provided for @citizenAdoptBrowseTitle.
  ///
  /// In en, this message translates to:
  /// **'Trees near you'**
  String get citizenAdoptBrowseTitle;

  /// No description provided for @citizenAdoptEmpty.
  ///
  /// In en, this message translates to:
  /// **'No adoptable trees right now. Try a public code from a QR link.'**
  String get citizenAdoptEmpty;

  /// No description provided for @citizenAdoptSuccess.
  ///
  /// In en, this message translates to:
  /// **'Tree adopted — thank you for stewarding!'**
  String get citizenAdoptSuccess;

  /// No description provided for @citizenAdoptNotAvailable.
  ///
  /// In en, this message translates to:
  /// **'Tree adoption is available for BYOT citizen accounts.'**
  String get citizenAdoptNotAvailable;

  /// No description provided for @citizenStewardshipHubTitle.
  ///
  /// In en, this message translates to:
  /// **'My stewardship'**
  String get citizenStewardshipHubTitle;

  /// No description provided for @citizenStewardshipOwnedTab.
  ///
  /// In en, this message translates to:
  /// **'My trees'**
  String get citizenStewardshipOwnedTab;

  /// No description provided for @citizenStewardshipAdoptedTab.
  ///
  /// In en, this message translates to:
  /// **'Adopted'**
  String get citizenStewardshipAdoptedTab;

  /// No description provided for @citizenStewardshipCheckIn.
  ///
  /// In en, this message translates to:
  /// **'Check in'**
  String get citizenStewardshipCheckIn;

  /// No description provided for @citizenStewardshipDueBadge.
  ///
  /// In en, this message translates to:
  /// **'Check-in due'**
  String get citizenStewardshipDueBadge;

  /// No description provided for @citizenStewardshipEmptyOwned.
  ///
  /// In en, this message translates to:
  /// **'No registered trees yet. Register your first tree from the Field tab.'**
  String get citizenStewardshipEmptyOwned;

  /// No description provided for @citizenStewardshipEmptyAdopted.
  ///
  /// In en, this message translates to:
  /// **'No adopted trees yet. Browse adoptable trees to get started.'**
  String get citizenStewardshipEmptyAdopted;

  /// No description provided for @citizenRelinquishTitle.
  ///
  /// In en, this message translates to:
  /// **'Stop stewarding this tree?'**
  String get citizenRelinquishTitle;

  /// No description provided for @citizenRelinquishConfirm.
  ///
  /// In en, this message translates to:
  /// **'You will no longer receive check-in reminders for this adopted tree. The tree owner keeps full ownership.'**
  String get citizenRelinquishConfirm;

  /// No description provided for @citizenRelinquishAction.
  ///
  /// In en, this message translates to:
  /// **'Relinquish'**
  String get citizenRelinquishAction;

  /// No description provided for @citizenRelinquishSuccess.
  ///
  /// In en, this message translates to:
  /// **'You are no longer stewarding this tree.'**
  String get citizenRelinquishSuccess;

  /// No description provided for @bioAnalysisRunning.
  ///
  /// In en, this message translates to:
  /// **'Analysis running…'**
  String get bioAnalysisRunning;

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

  /// No description provided for @biometricGateTitle.
  ///
  /// In en, this message translates to:
  /// **'Unlock Aranyix'**
  String get biometricGateTitle;

  /// No description provided for @biometricUnlockHint.
  ///
  /// In en, this message translates to:
  /// **'Require fingerprint or face unlock when reopening the app.'**
  String get biometricUnlockHint;

  /// No description provided for @tryAgain.
  ///
  /// In en, this message translates to:
  /// **'Try again'**
  String get tryAgain;

  /// No description provided for @signInWithPassword.
  ///
  /// In en, this message translates to:
  /// **'Sign in with password'**
  String get signInWithPassword;

  /// No description provided for @sessionExpired.
  ///
  /// In en, this message translates to:
  /// **'Your session expired. Sign in again to continue.'**
  String get sessionExpired;

  /// No description provided for @sessionExpiredBanner.
  ///
  /// In en, this message translates to:
  /// **'Your session expired. Sign in again to continue where you left off.'**
  String get sessionExpiredBanner;

  /// No description provided for @checkForUpdates.
  ///
  /// In en, this message translates to:
  /// **'Check for updates on Google Play'**
  String get checkForUpdates;

  /// No description provided for @biometricEnableFailed.
  ///
  /// In en, this message translates to:
  /// **'Biometric unlock was not enabled — confirmation failed.'**
  String get biometricEnableFailed;

  /// No description provided for @biometricEnabled.
  ///
  /// In en, this message translates to:
  /// **'Biometric unlock enabled.'**
  String get biometricEnabled;

  /// No description provided for @biometricDisabled.
  ///
  /// In en, this message translates to:
  /// **'Biometric unlock disabled.'**
  String get biometricDisabled;

  /// No description provided for @screenshotGuard.
  ///
  /// In en, this message translates to:
  /// **'Block screenshots'**
  String get screenshotGuard;

  /// No description provided for @screenshotGuardHint.
  ///
  /// In en, this message translates to:
  /// **'Blocks screenshots and screen recording on this device.'**
  String get screenshotGuardHint;

  /// No description provided for @screenshotGuardEnabled.
  ///
  /// In en, this message translates to:
  /// **'Screenshot guard enabled.'**
  String get screenshotGuardEnabled;

  /// No description provided for @screenshotGuardDisabled.
  ///
  /// In en, this message translates to:
  /// **'Screenshot guard disabled.'**
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

  /// No description provided for @offlineServerUnreachable.
  ///
  /// In en, this message translates to:
  /// **'Server unreachable — changes will sync when the API is back.'**
  String get offlineServerUnreachable;

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

  /// No description provided for @navDashboard.
  ///
  /// In en, this message translates to:
  /// **'Dashboard'**
  String get navDashboard;

  /// No description provided for @navSectionPlantation.
  ///
  /// In en, this message translates to:
  /// **'Setup & planting'**
  String get navSectionPlantation;

  /// No description provided for @navSectionPlantationDesc.
  ///
  /// In en, this message translates to:
  /// **'Programs, tree registry, map, and field work'**
  String get navSectionPlantationDesc;

  /// No description provided for @navSectionWorkspace.
  ///
  /// In en, this message translates to:
  /// **'Workspace'**
  String get navSectionWorkspace;

  /// No description provided for @navSectionWorkspaceDesc.
  ///
  /// In en, this message translates to:
  /// **'Projects, tree registry, and field queue'**
  String get navSectionWorkspaceDesc;

  /// No description provided for @navSectionIntelligence.
  ///
  /// In en, this message translates to:
  /// **'Monitoring & analysis'**
  String get navSectionIntelligence;

  /// No description provided for @navSectionIntelligenceDesc.
  ///
  /// In en, this message translates to:
  /// **'Satellite, biodiversity, and alerts'**
  String get navSectionIntelligenceDesc;

  /// No description provided for @navSectionCompliance.
  ///
  /// In en, this message translates to:
  /// **'Compliance & MRV'**
  String get navSectionCompliance;

  /// No description provided for @navSectionComplianceDesc.
  ///
  /// In en, this message translates to:
  /// **'Reports and evidence exports'**
  String get navSectionComplianceDesc;

  /// No description provided for @navSectionCarbon.
  ///
  /// In en, this message translates to:
  /// **'Carbon & credits'**
  String get navSectionCarbon;

  /// No description provided for @navSectionTools.
  ///
  /// In en, this message translates to:
  /// **'Tools'**
  String get navSectionTools;

  /// No description provided for @navSectionReports.
  ///
  /// In en, this message translates to:
  /// **'Reports & evidence'**
  String get navSectionReports;

  /// No description provided for @navSectionReportsDesc.
  ///
  /// In en, this message translates to:
  /// **'Exports, carbon, and AI assistant'**
  String get navSectionReportsDesc;

  /// No description provided for @navSectionAccount.
  ///
  /// In en, this message translates to:
  /// **'Account'**
  String get navSectionAccount;

  /// No description provided for @navFieldQueue.
  ///
  /// In en, this message translates to:
  /// **'Field queue & sync'**
  String get navFieldQueue;

  /// No description provided for @navBioacoustic.
  ///
  /// In en, this message translates to:
  /// **'Bioacoustic'**
  String get navBioacoustic;

  /// No description provided for @navAlerts.
  ///
  /// In en, this message translates to:
  /// **'Alerts'**
  String get navAlerts;

  /// No description provided for @navReports.
  ///
  /// In en, this message translates to:
  /// **'Reports'**
  String get navReports;

  /// No description provided for @navAssistant.
  ///
  /// In en, this message translates to:
  /// **'AI assistant'**
  String get navAssistant;

  /// No description provided for @navCarbon.
  ///
  /// In en, this message translates to:
  /// **'Carbon'**
  String get navCarbon;

  /// No description provided for @navCredits.
  ///
  /// In en, this message translates to:
  /// **'Credits'**
  String get navCredits;

  /// No description provided for @registerTreePrimary.
  ///
  /// In en, this message translates to:
  /// **'Register a tree'**
  String get registerTreePrimary;

  /// No description provided for @registerTreePrimarySub.
  ///
  /// In en, this message translates to:
  /// **'GPS, photos, and offline sync in the field'**
  String get registerTreePrimarySub;

  /// No description provided for @bioacousticActionSub.
  ///
  /// In en, this message translates to:
  /// **'Record 60–180s ambient sound for species detection'**
  String get bioacousticActionSub;

  /// No description provided for @bioacousticTileSub.
  ///
  /// In en, this message translates to:
  /// **'Record soundscape'**
  String get bioacousticTileSub;

  /// No description provided for @projectsTileSub.
  ///
  /// In en, this message translates to:
  /// **'Packages & work areas'**
  String get projectsTileSub;

  /// No description provided for @addActionFab.
  ///
  /// In en, this message translates to:
  /// **'Add'**
  String get addActionFab;

  /// No description provided for @addActionSheetTitle.
  ///
  /// In en, this message translates to:
  /// **'Field actions'**
  String get addActionSheetTitle;

  /// No description provided for @addActionSheetSubtitle.
  ///
  /// In en, this message translates to:
  /// **'Primary tools for registration and biodiversity monitoring'**
  String get addActionSheetSubtitle;

  /// No description provided for @addActionSheetEmpty.
  ///
  /// In en, this message translates to:
  /// **'No field actions available for your role.'**
  String get addActionSheetEmpty;

  /// No description provided for @menuOpen.
  ///
  /// In en, this message translates to:
  /// **'Open menu'**
  String get menuOpen;

  /// No description provided for @drawerLoadError.
  ///
  /// In en, this message translates to:
  /// **'Could not load your profile for navigation. Check your connection and retry.'**
  String get drawerLoadError;

  /// No description provided for @drawerSignInRequired.
  ///
  /// In en, this message translates to:
  /// **'Sign in to see navigation.'**
  String get drawerSignInRequired;

  /// No description provided for @drawerNoNavItems.
  ///
  /// In en, this message translates to:
  /// **'No menu items are available for your account.'**
  String get drawerNoNavItems;

  /// No description provided for @todayWork.
  ///
  /// In en, this message translates to:
  /// **'Today\'s work'**
  String get todayWork;

  /// No description provided for @fieldWorkspace.
  ///
  /// In en, this message translates to:
  /// **'Field workspace'**
  String get fieldWorkspace;

  /// No description provided for @viewFullDashboard.
  ///
  /// In en, this message translates to:
  /// **'View full dashboard'**
  String get viewFullDashboard;

  /// No description provided for @addTreeTitle.
  ///
  /// In en, this message translates to:
  /// **'Add tree'**
  String get addTreeTitle;

  /// No description provided for @addTreeTitleProject.
  ///
  /// In en, this message translates to:
  /// **'Register project tree'**
  String get addTreeTitleProject;

  /// No description provided for @addTreeStepContext.
  ///
  /// In en, this message translates to:
  /// **'Context'**
  String get addTreeStepContext;

  /// No description provided for @addTreeStepSpecies.
  ///
  /// In en, this message translates to:
  /// **'Species & details'**
  String get addTreeStepSpecies;

  /// No description provided for @addTreeStepLocation.
  ///
  /// In en, this message translates to:
  /// **'Location'**
  String get addTreeStepLocation;

  /// No description provided for @addTreeStepPhotos.
  ///
  /// In en, this message translates to:
  /// **'Photos'**
  String get addTreeStepPhotos;

  /// No description provided for @addTreeStepReview.
  ///
  /// In en, this message translates to:
  /// **'Review & save'**
  String get addTreeStepReview;

  /// No description provided for @addTreeStepOf.
  ///
  /// In en, this message translates to:
  /// **'Step {current} of {total}'**
  String addTreeStepOf(int current, int total);

  /// No description provided for @addTreeBack.
  ///
  /// In en, this message translates to:
  /// **'Back'**
  String get addTreeBack;

  /// No description provided for @addTreeNext.
  ///
  /// In en, this message translates to:
  /// **'Next'**
  String get addTreeNext;

  /// No description provided for @addTreeSaving.
  ///
  /// In en, this message translates to:
  /// **'Saving…'**
  String get addTreeSaving;

  /// No description provided for @addTreeSaveAndNext.
  ///
  /// In en, this message translates to:
  /// **'Save & register next'**
  String get addTreeSaveAndNext;

  /// No description provided for @addTreeSaveAndExit.
  ///
  /// In en, this message translates to:
  /// **'Save & exit'**
  String get addTreeSaveAndExit;

  /// No description provided for @addTreeProjectHint.
  ///
  /// In en, this message translates to:
  /// **'GPS, photos, and species only — pit, spacing, and guard inherit from the project.'**
  String get addTreeProjectHint;

  /// No description provided for @addTreeSetupBlockedTitle.
  ///
  /// In en, this message translates to:
  /// **'Finish project setup first'**
  String get addTreeSetupBlockedTitle;

  /// No description provided for @addTreeSetupBlockedBody.
  ///
  /// In en, this message translates to:
  /// **'Complete tree registration defaults (permit, site zone, agency) in the web project setup before registering trees here.'**
  String get addTreeSetupBlockedBody;

  /// No description provided for @addTreeOpenProject.
  ///
  /// In en, this message translates to:
  /// **'Open project'**
  String get addTreeOpenProject;

  /// No description provided for @addTreeWorkArea.
  ///
  /// In en, this message translates to:
  /// **'Work area *'**
  String get addTreeWorkArea;

  /// No description provided for @addTreeProgram.
  ///
  /// In en, this message translates to:
  /// **'Registration program'**
  String get addTreeProgram;

  /// No description provided for @addTreeProgramHint.
  ///
  /// In en, this message translates to:
  /// **'Choose BYOT citizen planting or a government program such as NHAI highway plantation.'**
  String get addTreeProgramHint;

  /// No description provided for @addTreeValidationProgram.
  ///
  /// In en, this message translates to:
  /// **'Select a registration program before continuing.'**
  String get addTreeValidationProgram;

  /// No description provided for @addTreeValidationWorkArea.
  ///
  /// In en, this message translates to:
  /// **'Select a work area before continuing.'**
  String get addTreeValidationWorkArea;

  /// No description provided for @addTreeApprovedSpecies.
  ///
  /// In en, this message translates to:
  /// **'Approved species'**
  String get addTreeApprovedSpecies;

  /// No description provided for @addTreeSpecies.
  ///
  /// In en, this message translates to:
  /// **'Species'**
  String get addTreeSpecies;

  /// No description provided for @addTreeRoadSide.
  ///
  /// In en, this message translates to:
  /// **'Road side *'**
  String get addTreeRoadSide;

  /// No description provided for @addTreeRoadSideNhai.
  ///
  /// In en, this message translates to:
  /// **'Road side (LHS/RHS) *'**
  String get addTreeRoadSideNhai;

  /// No description provided for @addTreeGuard.
  ///
  /// In en, this message translates to:
  /// **'Tree guard *'**
  String get addTreeGuard;

  /// No description provided for @addTreePitSize.
  ///
  /// In en, this message translates to:
  /// **'Pit size (LxWxD cm)'**
  String get addTreePitSize;

  /// No description provided for @addTreeMeasurementsTitle.
  ///
  /// In en, this message translates to:
  /// **'Field measurements (optional)'**
  String get addTreeMeasurementsTitle;

  /// No description provided for @addTreeMeasurementsHint.
  ///
  /// In en, this message translates to:
  /// **'Measure DBH at 1.3 m above ground. Leave blank if not measured yet.'**
  String get addTreeMeasurementsHint;

  /// No description provided for @addTreeMeasurementMethod.
  ///
  /// In en, this message translates to:
  /// **'Measurement method'**
  String get addTreeMeasurementMethod;

  /// No description provided for @addTreeDbh.
  ///
  /// In en, this message translates to:
  /// **'DBH (cm)'**
  String get addTreeDbh;

  /// No description provided for @addTreeHeight.
  ///
  /// In en, this message translates to:
  /// **'Height (m)'**
  String get addTreeHeight;

  /// No description provided for @addTreeLocationHint.
  ///
  /// In en, this message translates to:
  /// **'Capture GPS at the planting point. Compliance checks run automatically for project trees.'**
  String get addTreeLocationHint;

  /// No description provided for @addTreeGetGps.
  ///
  /// In en, this message translates to:
  /// **'Get GPS location'**
  String get addTreeGetGps;

  /// No description provided for @addTreePhotosHint.
  ///
  /// In en, this message translates to:
  /// **'Add clear photos of the tree and planting pit. Works offline — uploads when connected.'**
  String get addTreePhotosHint;

  /// No description provided for @addTreeAddPhoto.
  ///
  /// In en, this message translates to:
  /// **'Add photo ({count}/{target})'**
  String addTreeAddPhoto(int count, int target);

  /// No description provided for @addTreeOfflinePhotos.
  ///
  /// In en, this message translates to:
  /// **'{count} photo(s) saved offline'**
  String addTreeOfflinePhotos(int count);

  /// No description provided for @addTreeReviewTitle.
  ///
  /// In en, this message translates to:
  /// **'Review registration'**
  String get addTreeReviewTitle;

  /// No description provided for @addTreeSessionCount.
  ///
  /// In en, this message translates to:
  /// **'{count} this session'**
  String addTreeSessionCount(int count);

  /// No description provided for @addTreeMinPhotosWarning.
  ///
  /// In en, this message translates to:
  /// **'Program recommends at least {min} photos.'**
  String addTreeMinPhotosWarning(int min);

  /// No description provided for @addTreeValidationContext.
  ///
  /// In en, this message translates to:
  /// **'Finish project setup or select a work area before continuing.'**
  String get addTreeValidationContext;

  /// No description provided for @addTreeValidationSpecies.
  ///
  /// In en, this message translates to:
  /// **'Enter a species before continuing.'**
  String get addTreeValidationSpecies;

  /// No description provided for @addTreeValidationLocation.
  ///
  /// In en, this message translates to:
  /// **'Capture GPS before continuing.'**
  String get addTreeValidationLocation;

  /// No description provided for @addTreeValidationCompliance.
  ///
  /// In en, this message translates to:
  /// **'Compliance check failed — fix issues before saving (strict mode).'**
  String get addTreeValidationCompliance;

  /// No description provided for @addTreeValidationMinPhotos.
  ///
  /// In en, this message translates to:
  /// **'Add at least {min} photos before continuing.'**
  String addTreeValidationMinPhotos(int min);

  /// No description provided for @addTreeValidationSchemeProject.
  ///
  /// In en, this message translates to:
  /// **'Government and ESG programmes require a planting project. Open a project and register trees from there.'**
  String get addTreeValidationSchemeProject;

  /// No description provided for @addTreeSchemeProjectTitle.
  ///
  /// In en, this message translates to:
  /// **'Scheme planting requires a project'**
  String get addTreeSchemeProjectTitle;

  /// No description provided for @addTreeSchemeProjectBody.
  ///
  /// In en, this message translates to:
  /// **'NHAI, CAMPA, Nagar Van, and other central schemes are configured on a planting project. Create or open a project first, then register trees from that project.'**
  String get addTreeSchemeProjectBody;

  /// No description provided for @addTreeCreateProject.
  ///
  /// In en, this message translates to:
  /// **'Create planting project'**
  String get addTreeCreateProject;

  /// No description provided for @addTreeOpenProjects.
  ///
  /// In en, this message translates to:
  /// **'Open projects'**
  String get addTreeOpenProjects;

  /// No description provided for @addTreeLocatingGps.
  ///
  /// In en, this message translates to:
  /// **'Locating…'**
  String get addTreeLocatingGps;

  /// No description provided for @addTreeRefreshGps.
  ///
  /// In en, this message translates to:
  /// **'Refresh GPS lock'**
  String get addTreeRefreshGps;

  /// No description provided for @addTreeGpsCaptured.
  ///
  /// In en, this message translates to:
  /// **'GPS captured'**
  String get addTreeGpsCaptured;

  /// No description provided for @addTreeGpsNextHint.
  ///
  /// In en, this message translates to:
  /// **'GPS is saved. Tap Next to add photos, or refresh if you moved to a new planting point.'**
  String get addTreeGpsNextHint;

  /// No description provided for @addTreeGpsAccuracyWarning.
  ///
  /// In en, this message translates to:
  /// **'GPS accuracy is low (±{meters} m). Move outdoors with clear sky and tap Refresh.'**
  String addTreeGpsAccuracyWarning(int meters);

  /// No description provided for @addTreeOpenLocationSettings.
  ///
  /// In en, this message translates to:
  /// **'Open app settings'**
  String get addTreeOpenLocationSettings;

  /// No description provided for @addTreePhotosNextHint.
  ///
  /// In en, this message translates to:
  /// **'Add at least {target} photo(s), then tap Next to review.'**
  String addTreePhotosNextHint(int target);

  /// No description provided for @setupStepSchemeRefs.
  ///
  /// In en, this message translates to:
  /// **'Scheme references'**
  String get setupStepSchemeRefs;

  /// No description provided for @bioTabRecord.
  ///
  /// In en, this message translates to:
  /// **'Record'**
  String get bioTabRecord;

  /// No description provided for @bioTabHistory.
  ///
  /// In en, this message translates to:
  /// **'History'**
  String get bioTabHistory;

  /// No description provided for @bioRecordingLive.
  ///
  /// In en, this message translates to:
  /// **'Recording live'**
  String get bioRecordingLive;

  /// No description provided for @bioRecordingTarget.
  ///
  /// In en, this message translates to:
  /// **'Target: {min}–{max} s · 48 kHz mono WAV'**
  String bioRecordingTarget(int min, int max);

  /// No description provided for @bioStopAndSave.
  ///
  /// In en, this message translates to:
  /// **'Stop & save'**
  String get bioStopAndSave;

  /// No description provided for @bioStopMin.
  ///
  /// In en, this message translates to:
  /// **'Stop ({seconds}s min)'**
  String bioStopMin(int seconds);

  /// No description provided for @bioSiteOptional.
  ///
  /// In en, this message translates to:
  /// **'Plantation site (optional)'**
  String get bioSiteOptional;

  /// No description provided for @bioSiteGpsOnly.
  ///
  /// In en, this message translates to:
  /// **'No site — GPS only'**
  String get bioSiteGpsOnly;

  /// No description provided for @bioTapToRecord.
  ///
  /// In en, this message translates to:
  /// **'Tap to start recording'**
  String get bioTapToRecord;

  /// No description provided for @bioStartRecording.
  ///
  /// In en, this message translates to:
  /// **'Start ambient recording'**
  String get bioStartRecording;

  /// No description provided for @bioSplLevel.
  ///
  /// In en, this message translates to:
  /// **'Ambient SPL ≈ {level} dB'**
  String bioSplLevel(String level);

  /// No description provided for @bioNoiseWarning.
  ///
  /// In en, this message translates to:
  /// **'High background noise — traffic, wind, or machinery may reduce accuracy.'**
  String get bioNoiseWarning;

  /// No description provided for @bioFieldTips.
  ///
  /// In en, this message translates to:
  /// **'Record ambient environmental sound (not voice). Hold phone 1–1.5 m above ground, stay still. Best at sunrise or sunset. Works offline.'**
  String get bioFieldTips;

  /// No description provided for @bioSyncTooltip.
  ///
  /// In en, this message translates to:
  /// **'Sync offline recordings'**
  String get bioSyncTooltip;

  /// No description provided for @bioMicDenied.
  ///
  /// In en, this message translates to:
  /// **'Microphone permission denied'**
  String get bioMicDenied;

  /// No description provided for @bioRecordingStatus.
  ///
  /// In en, this message translates to:
  /// **'Recording ambient soundscape… hold phone 1–1.5 m above ground, stay still.'**
  String get bioRecordingStatus;

  /// No description provided for @bioTooShort.
  ///
  /// In en, this message translates to:
  /// **'Record at least {min} seconds (currently {elapsed} s).'**
  String bioTooShort(int min, int elapsed);

  /// No description provided for @bioSaving.
  ///
  /// In en, this message translates to:
  /// **'Saving recording…'**
  String get bioSaving;

  /// No description provided for @bioSavedOfflineGps.
  ///
  /// In en, this message translates to:
  /// **'Saved offline. {note}'**
  String bioSavedOfflineGps(String note);

  /// No description provided for @bioSavedOffline.
  ///
  /// In en, this message translates to:
  /// **'Saved offline. Will upload and analyze automatically when you have signal.'**
  String get bioSavedOffline;

  /// No description provided for @bioUploading.
  ///
  /// In en, this message translates to:
  /// **'Uploading and analyzing…'**
  String get bioUploading;

  /// No description provided for @bioAnalysisComplete.
  ///
  /// In en, this message translates to:
  /// **'Analysis complete. See results below.'**
  String get bioAnalysisComplete;

  /// No description provided for @bioUploadFailedOffline.
  ///
  /// In en, this message translates to:
  /// **'Upload failed — saved offline. Tap Sync when your connection is stable.'**
  String get bioUploadFailedOffline;

  /// No description provided for @bioSyncing.
  ///
  /// In en, this message translates to:
  /// **'Syncing offline recordings…'**
  String get bioSyncing;

  /// No description provided for @bioSyncedCount.
  ///
  /// In en, this message translates to:
  /// **'Synced {count} recording(s).'**
  String bioSyncedCount(int count);

  /// No description provided for @bioNothingToSync.
  ///
  /// In en, this message translates to:
  /// **'No pending recordings to sync.'**
  String get bioNothingToSync;

  /// No description provided for @bioQueuePending.
  ///
  /// In en, this message translates to:
  /// **'Waiting to sync'**
  String get bioQueuePending;

  /// No description provided for @bioQueueSyncing.
  ///
  /// In en, this message translates to:
  /// **'Syncing…'**
  String get bioQueueSyncing;

  /// No description provided for @bioQueueFailed.
  ///
  /// In en, this message translates to:
  /// **'Sync failed'**
  String get bioQueueFailed;

  /// No description provided for @bioOfflineQueue.
  ///
  /// In en, this message translates to:
  /// **'Offline queue'**
  String get bioOfflineQueue;

  /// No description provided for @bioSyncNow.
  ///
  /// In en, this message translates to:
  /// **'Sync now'**
  String get bioSyncNow;

  /// No description provided for @bioSyncedRecordings.
  ///
  /// In en, this message translates to:
  /// **'Synced recordings'**
  String get bioSyncedRecordings;

  /// No description provided for @bioNoRecordingsYet.
  ///
  /// In en, this message translates to:
  /// **'No synced recordings yet.'**
  String get bioNoRecordingsYet;

  /// No description provided for @retry.
  ///
  /// In en, this message translates to:
  /// **'Retry'**
  String get retry;

  /// No description provided for @monitoringStaleSatellite.
  ///
  /// In en, this message translates to:
  /// **'Stale satellite scans'**
  String get monitoringStaleSatellite;

  /// No description provided for @monitoringStaleSatelliteHint.
  ///
  /// In en, this message translates to:
  /// **'Work areas without a recent NDVI pass'**
  String get monitoringStaleSatelliteHint;

  /// No description provided for @monitoringOpenSarVerifications.
  ///
  /// In en, this message translates to:
  /// **'Open SAR field verifications'**
  String get monitoringOpenSarVerifications;

  /// No description provided for @monitoringSarAlerts30d.
  ///
  /// In en, this message translates to:
  /// **'SAR alerts (30d)'**
  String get monitoringSarAlerts30d;

  /// No description provided for @monitoringUnreadAlertsByKind.
  ///
  /// In en, this message translates to:
  /// **'Unread alerts by kind'**
  String get monitoringUnreadAlertsByKind;

  /// No description provided for @monitoringNoUnreadAlerts.
  ///
  /// In en, this message translates to:
  /// **'No unread alerts.'**
  String get monitoringNoUnreadAlerts;

  /// No description provided for @monitoringWorkAreaSarStatus.
  ///
  /// In en, this message translates to:
  /// **'Work area SAR status'**
  String get monitoringWorkAreaSarStatus;

  /// No description provided for @monitoringWorkAreaFallback.
  ///
  /// In en, this message translates to:
  /// **'Work area'**
  String get monitoringWorkAreaFallback;

  /// No description provided for @monitoringNoWorkAreas.
  ///
  /// In en, this message translates to:
  /// **'No work-area monitoring rows yet. Open violations: {violations}, survival due: {survival}.'**
  String monitoringNoWorkAreas(String violations, String survival);

  /// No description provided for @monitoringDaysSinceNdvi.
  ///
  /// In en, this message translates to:
  /// **'{days}d since NDVI'**
  String monitoringDaysSinceNdvi(String days);

  /// No description provided for @homeWelcomeBack.
  ///
  /// In en, this message translates to:
  /// **'Welcome back'**
  String get homeWelcomeBack;

  /// No description provided for @homeHello.
  ///
  /// In en, this message translates to:
  /// **'Hello, {name}'**
  String homeHello(String name);

  /// No description provided for @homeForestHealth.
  ///
  /// In en, this message translates to:
  /// **'Forest Health'**
  String get homeForestHealth;

  /// No description provided for @homeInsights.
  ///
  /// In en, this message translates to:
  /// **'Insights'**
  String get homeInsights;

  /// No description provided for @homeCarbonGrowth.
  ///
  /// In en, this message translates to:
  /// **'Carbon growth'**
  String get homeCarbonGrowth;

  /// No description provided for @homeCarbonGrowthHint.
  ///
  /// In en, this message translates to:
  /// **'Estimated sequestration trend'**
  String get homeCarbonGrowthHint;

  /// No description provided for @homeTreeHealth.
  ///
  /// In en, this message translates to:
  /// **'Tree health'**
  String get homeTreeHealth;

  /// No description provided for @homeTreeHealthHint.
  ///
  /// In en, this message translates to:
  /// **'Distribution across your portfolio'**
  String get homeTreeHealthHint;

  /// No description provided for @homeSpeciesMix.
  ///
  /// In en, this message translates to:
  /// **'Species mix'**
  String get homeSpeciesMix;

  /// No description provided for @homeSpeciesMixHint.
  ///
  /// In en, this message translates to:
  /// **'Top registered species'**
  String get homeSpeciesMixHint;

  /// No description provided for @homeMonitoringChip.
  ///
  /// In en, this message translates to:
  /// **'Monitoring'**
  String get homeMonitoringChip;

  /// No description provided for @homeFieldOpsChip.
  ///
  /// In en, this message translates to:
  /// **'Field ops'**
  String get homeFieldOpsChip;

  /// No description provided for @homeReportsChip.
  ///
  /// In en, this message translates to:
  /// **'Reports'**
  String get homeReportsChip;

  /// No description provided for @homeFieldProjects.
  ///
  /// In en, this message translates to:
  /// **'Field projects'**
  String get homeFieldProjects;

  /// No description provided for @homeAllSites.
  ///
  /// In en, this message translates to:
  /// **'All sites'**
  String get homeAllSites;

  /// No description provided for @homeQuickSnapshot.
  ///
  /// In en, this message translates to:
  /// **'Quick Snapshot'**
  String get homeQuickSnapshot;

  /// No description provided for @homeAskAranyix.
  ///
  /// In en, this message translates to:
  /// **'Ask Aranyix'**
  String get homeAskAranyix;

  /// No description provided for @save.
  ///
  /// In en, this message translates to:
  /// **'Save'**
  String get save;

  /// No description provided for @cancel.
  ///
  /// In en, this message translates to:
  /// **'Cancel'**
  String get cancel;

  /// No description provided for @saving.
  ///
  /// In en, this message translates to:
  /// **'Saving…'**
  String get saving;

  /// No description provided for @noAlerts.
  ///
  /// In en, this message translates to:
  /// **'No alerts.'**
  String get noAlerts;

  /// No description provided for @noTreesYet.
  ///
  /// In en, this message translates to:
  /// **'No trees yet.'**
  String get noTreesYet;

  /// No description provided for @addFirstTree.
  ///
  /// In en, this message translates to:
  /// **'Add your first tree'**
  String get addFirstTree;

  /// No description provided for @noProjectsYet.
  ///
  /// In en, this message translates to:
  /// **'No planting projects assigned yet.'**
  String get noProjectsYet;

  /// No description provided for @preferences.
  ///
  /// In en, this message translates to:
  /// **'Preferences'**
  String get preferences;

  /// No description provided for @alertPreferences.
  ///
  /// In en, this message translates to:
  /// **'Alert preferences'**
  String get alertPreferences;

  /// No description provided for @preferencesSaved.
  ///
  /// In en, this message translates to:
  /// **'Preferences saved'**
  String get preferencesSaved;

  /// No description provided for @satelliteHealth.
  ///
  /// In en, this message translates to:
  /// **'Satellite health'**
  String get satelliteHealth;

  /// No description provided for @survivalSurvey.
  ///
  /// In en, this message translates to:
  /// **'Survival survey'**
  String get survivalSurvey;

  /// No description provided for @threatWatch.
  ///
  /// In en, this message translates to:
  /// **'Threat watch'**
  String get threatWatch;

  /// No description provided for @complianceLabel.
  ///
  /// In en, this message translates to:
  /// **'Compliance'**
  String get complianceLabel;

  /// No description provided for @viewDetails.
  ///
  /// In en, this message translates to:
  /// **'View Details'**
  String get viewDetails;

  /// No description provided for @reviewActions.
  ///
  /// In en, this message translates to:
  /// **'Review Actions'**
  String get reviewActions;

  /// No description provided for @takeAction.
  ///
  /// In en, this message translates to:
  /// **'Take Action'**
  String get takeAction;

  /// No description provided for @homeTrend.
  ///
  /// In en, this message translates to:
  /// **'Trend: {trend}'**
  String homeTrend(String trend);

  /// No description provided for @signOut.
  ///
  /// In en, this message translates to:
  /// **'Sign out'**
  String get signOut;

  /// No description provided for @editProfile.
  ///
  /// In en, this message translates to:
  /// **'Edit personal profile'**
  String get editProfile;

  /// No description provided for @editProfileSub.
  ///
  /// In en, this message translates to:
  /// **'Name, phone, date of birth, city, state'**
  String get editProfileSub;

  /// No description provided for @appVersion.
  ///
  /// In en, this message translates to:
  /// **'App version'**
  String get appVersion;

  /// No description provided for @openPlayStore.
  ///
  /// In en, this message translates to:
  /// **'Open Google Play'**
  String get openPlayStore;

  /// No description provided for @workAreas.
  ///
  /// In en, this message translates to:
  /// **'Work areas'**
  String get workAreas;

  /// No description provided for @noWorkAreasYet.
  ///
  /// In en, this message translates to:
  /// **'No work areas defined on web yet.'**
  String get noWorkAreasYet;

  /// No description provided for @registerTreeBtn.
  ///
  /// In en, this message translates to:
  /// **'Register tree'**
  String get registerTreeBtn;

  /// No description provided for @createReport.
  ///
  /// In en, this message translates to:
  /// **'Create report'**
  String get createReport;

  /// No description provided for @yourReports.
  ///
  /// In en, this message translates to:
  /// **'Your reports'**
  String get yourReports;

  /// No description provided for @noReportsYet.
  ///
  /// In en, this message translates to:
  /// **'No reports yet.'**
  String get noReportsYet;

  /// No description provided for @reportCreated.
  ///
  /// In en, this message translates to:
  /// **'Report created'**
  String get reportCreated;

  /// No description provided for @reportNeedsArea.
  ///
  /// In en, this message translates to:
  /// **'This report type needs a plantation / work area.'**
  String get reportNeedsArea;

  /// No description provided for @byStatus.
  ///
  /// In en, this message translates to:
  /// **'By status'**
  String get byStatus;

  /// No description provided for @resolve.
  ///
  /// In en, this message translates to:
  /// **'Resolve'**
  String get resolve;

  /// No description provided for @violationResolved.
  ///
  /// In en, this message translates to:
  /// **'Violation resolved'**
  String get violationResolved;

  /// No description provided for @recentViolations.
  ///
  /// In en, this message translates to:
  /// **'Recent violations'**
  String get recentViolations;

  /// No description provided for @noOpenViolations.
  ///
  /// In en, this message translates to:
  /// **'No open violations.'**
  String get noOpenViolations;

  /// No description provided for @survivalDueByProject.
  ///
  /// In en, this message translates to:
  /// **'Survival due by project'**
  String get survivalDueByProject;

  /// No description provided for @noSurvivalDue.
  ///
  /// In en, this message translates to:
  /// **'No survival surveys due.'**
  String get noSurvivalDue;

  /// No description provided for @drawPolygon.
  ///
  /// In en, this message translates to:
  /// **'Draw polygon'**
  String get drawPolygon;

  /// No description provided for @drawCorridor.
  ///
  /// In en, this message translates to:
  /// **'Draw corridor'**
  String get drawCorridor;

  /// No description provided for @undoPoint.
  ///
  /// In en, this message translates to:
  /// **'Undo point'**
  String get undoPoint;

  /// No description provided for @cancelDraw.
  ///
  /// In en, this message translates to:
  /// **'Cancel draw'**
  String get cancelDraw;

  /// No description provided for @workAreaSaved.
  ///
  /// In en, this message translates to:
  /// **'Work area saved'**
  String get workAreaSaved;

  /// No description provided for @needTwoPoints.
  ///
  /// In en, this message translates to:
  /// **'Add at least 2 points on the map'**
  String get needTwoPoints;

  /// No description provided for @polygonNeedsThree.
  ///
  /// In en, this message translates to:
  /// **'Polygon needs at least 3 points'**
  String get polygonNeedsThree;

  /// No description provided for @createProjectFirst.
  ///
  /// In en, this message translates to:
  /// **'Create or join a planting project first'**
  String get createProjectFirst;

  /// No description provided for @noTreesOnMap.
  ///
  /// In en, this message translates to:
  /// **'No trees with GPS yet. Add a tree to see it on the map.'**
  String get noTreesOnMap;

  /// No description provided for @quickActions.
  ///
  /// In en, this message translates to:
  /// **'Quick actions'**
  String get quickActions;

  /// No description provided for @liveMap.
  ///
  /// In en, this message translates to:
  /// **'Live map'**
  String get liveMap;

  /// No description provided for @openFullMap.
  ///
  /// In en, this message translates to:
  /// **'Open full map'**
  String get openFullMap;

  /// No description provided for @expand.
  ///
  /// In en, this message translates to:
  /// **'Expand'**
  String get expand;

  /// No description provided for @noTreesOnMapPreview.
  ///
  /// In en, this message translates to:
  /// **'No trees on map yet'**
  String get noTreesOnMapPreview;

  /// No description provided for @registerFirstTree.
  ///
  /// In en, this message translates to:
  /// **'Register first tree'**
  String get registerFirstTree;

  /// No description provided for @pendingTreeRegistrations.
  ///
  /// In en, this message translates to:
  /// **'Pending tree registrations'**
  String get pendingTreeRegistrations;

  /// No description provided for @captureGpsBeforeRegister.
  ///
  /// In en, this message translates to:
  /// **'Capture GPS before registering.'**
  String get captureGpsBeforeRegister;

  /// No description provided for @selectWorkAreaForProject.
  ///
  /// In en, this message translates to:
  /// **'Select a work area for this project.'**
  String get selectWorkAreaForProject;

  /// No description provided for @complianceStrictBlock.
  ///
  /// In en, this message translates to:
  /// **'Compliance check failed — fix issues before saving (strict mode).'**
  String get complianceStrictBlock;

  /// No description provided for @offlineQueuedSync.
  ///
  /// In en, this message translates to:
  /// **'Offline — queued for sync.'**
  String get offlineQueuedSync;

  /// No description provided for @profileSaved.
  ///
  /// In en, this message translates to:
  /// **'Profile saved'**
  String get profileSaved;

  /// No description provided for @dateOfBirth.
  ///
  /// In en, this message translates to:
  /// **'Date of birth'**
  String get dateOfBirth;

  /// No description provided for @age.
  ///
  /// In en, this message translates to:
  /// **'Age'**
  String get age;

  /// No description provided for @dateOfMarriage.
  ///
  /// In en, this message translates to:
  /// **'Date of marriage'**
  String get dateOfMarriage;

  /// No description provided for @survivalRegeotag.
  ///
  /// In en, this message translates to:
  /// **'Survival / re-geotag'**
  String get survivalRegeotag;

  /// No description provided for @currentGps.
  ///
  /// In en, this message translates to:
  /// **'Current GPS'**
  String get currentGps;

  /// No description provided for @noGpsFix.
  ///
  /// In en, this message translates to:
  /// **'No fix yet'**
  String get noGpsFix;

  /// No description provided for @refreshGps.
  ///
  /// In en, this message translates to:
  /// **'Refresh GPS'**
  String get refreshGps;

  /// No description provided for @survivalSurveySaved.
  ///
  /// In en, this message translates to:
  /// **'Survival survey saved with measurement record'**
  String get survivalSurveySaved;

  /// No description provided for @continueWithGoogle.
  ///
  /// In en, this message translates to:
  /// **'Continue with Google'**
  String get continueWithGoogle;

  /// No description provided for @createAccount.
  ///
  /// In en, this message translates to:
  /// **'Create an account'**
  String get createAccount;

  /// No description provided for @forgotPassword.
  ///
  /// In en, this message translates to:
  /// **'Forgot password?'**
  String get forgotPassword;

  /// No description provided for @alreadyHaveAccountSignIn.
  ///
  /// In en, this message translates to:
  /// **'Already have an account? Sign in'**
  String get alreadyHaveAccountSignIn;

  /// No description provided for @createFreeAccount.
  ///
  /// In en, this message translates to:
  /// **'Create free account'**
  String get createFreeAccount;

  /// No description provided for @alreadyHaveAccountBtn.
  ///
  /// In en, this message translates to:
  /// **'I already have an account'**
  String get alreadyHaveAccountBtn;

  /// No description provided for @completingSignIn.
  ///
  /// In en, this message translates to:
  /// **'Completing sign-in…'**
  String get completingSignIn;

  /// No description provided for @backToSignIn.
  ///
  /// In en, this message translates to:
  /// **'Back to sign in'**
  String get backToSignIn;

  /// No description provided for @useEmailInstead.
  ///
  /// In en, this message translates to:
  /// **'Use email instead'**
  String get useEmailInstead;

  /// No description provided for @retrySecurityCheck.
  ///
  /// In en, this message translates to:
  /// **'Retry security check'**
  String get retrySecurityCheck;

  /// No description provided for @signInWithGoogle.
  ///
  /// In en, this message translates to:
  /// **'Sign in with Google'**
  String get signInWithGoogle;

  /// No description provided for @homeFieldProjectsSub.
  ///
  /// In en, this message translates to:
  /// **'NHAI packages, mine belts, society blocks'**
  String get homeFieldProjectsSub;

  /// No description provided for @estimate.
  ///
  /// In en, this message translates to:
  /// **'Estimate'**
  String get estimate;

  /// No description provided for @carbonKg.
  ///
  /// In en, this message translates to:
  /// **'Carbon: {kg} kg'**
  String carbonKg(String kg);

  /// No description provided for @inputCompleteness.
  ///
  /// In en, this message translates to:
  /// **'Input completeness: {value}'**
  String inputCompleteness(String value);

  /// No description provided for @methodologyLabel.
  ///
  /// In en, this message translates to:
  /// **'Methodology: {value}'**
  String methodologyLabel(String value);

  /// No description provided for @chainageKm.
  ///
  /// In en, this message translates to:
  /// **'Chainage: {km} km'**
  String chainageKm(String km);

  /// No description provided for @exploreByot.
  ///
  /// In en, this message translates to:
  /// **'Explore BYOT features'**
  String get exploreByot;

  /// No description provided for @visitWebsite.
  ///
  /// In en, this message translates to:
  /// **'Visit aranyix.tech'**
  String get visitWebsite;

  /// No description provided for @whatHappensNext.
  ///
  /// In en, this message translates to:
  /// **'What happens next'**
  String get whatHappensNext;

  /// No description provided for @orgTypeGovernment.
  ///
  /// In en, this message translates to:
  /// **'Government / public agency'**
  String get orgTypeGovernment;

  /// No description provided for @orgTypeCorporate.
  ///
  /// In en, this message translates to:
  /// **'Corporate / industry'**
  String get orgTypeCorporate;

  /// No description provided for @orgTypeNgo.
  ///
  /// In en, this message translates to:
  /// **'NGO / community'**
  String get orgTypeNgo;

  /// No description provided for @askAnythingForest.
  ///
  /// In en, this message translates to:
  /// **'Ask anything about your forest…'**
  String get askAnythingForest;

  /// No description provided for @alertFallback.
  ///
  /// In en, this message translates to:
  /// **'Alert'**
  String get alertFallback;

  /// No description provided for @noHealthDataYet.
  ///
  /// In en, this message translates to:
  /// **'No health data yet'**
  String get noHealthDataYet;

  /// No description provided for @siteFallback.
  ///
  /// In en, this message translates to:
  /// **'Site'**
  String get siteFallback;

  /// No description provided for @plantationFallback.
  ///
  /// In en, this message translates to:
  /// **'Plantation'**
  String get plantationFallback;

  /// No description provided for @orDivider.
  ///
  /// In en, this message translates to:
  /// **'or'**
  String get orDivider;

  /// No description provided for @rememberMe.
  ///
  /// In en, this message translates to:
  /// **'Remember me'**
  String get rememberMe;

  /// No description provided for @signingIn.
  ///
  /// In en, this message translates to:
  /// **'Signing in…'**
  String get signingIn;

  /// No description provided for @welcomeBackTitle.
  ///
  /// In en, this message translates to:
  /// **'Welcome back'**
  String get welcomeBackTitle;

  /// No description provided for @welcomeBackSub.
  ///
  /// In en, this message translates to:
  /// **'Sign in to continue mapping trees, biodiversity, and compliance evidence.'**
  String get welcomeBackSub;

  /// No description provided for @phoneOtpTab.
  ///
  /// In en, this message translates to:
  /// **'Phone OTP'**
  String get phoneOtpTab;

  /// No description provided for @emailTab.
  ///
  /// In en, this message translates to:
  /// **'Email'**
  String get emailTab;

  /// No description provided for @emailLabel.
  ///
  /// In en, this message translates to:
  /// **'Email'**
  String get emailLabel;

  /// No description provided for @passwordLabel.
  ///
  /// In en, this message translates to:
  /// **'Password'**
  String get passwordLabel;

  /// No description provided for @gpsVerified.
  ///
  /// In en, this message translates to:
  /// **'GPS-verified'**
  String get gpsVerified;

  /// No description provided for @offlineSyncLabel.
  ///
  /// In en, this message translates to:
  /// **'Offline sync'**
  String get offlineSyncLabel;

  /// No description provided for @assistantTitle.
  ///
  /// In en, this message translates to:
  /// **'AI Assistant'**
  String get assistantTitle;

  /// No description provided for @assistantHint.
  ///
  /// In en, this message translates to:
  /// **'Ask about trees, compliance, satellite health…'**
  String get assistantHint;

  /// No description provided for @assistantSend.
  ///
  /// In en, this message translates to:
  /// **'Send'**
  String get assistantSend;

  /// No description provided for @assistantEmpty.
  ///
  /// In en, this message translates to:
  /// **'Ask a question to get started.'**
  String get assistantEmpty;

  /// No description provided for @creditsTitle.
  ///
  /// In en, this message translates to:
  /// **'Credits'**
  String get creditsTitle;

  /// No description provided for @carbonTitle.
  ///
  /// In en, this message translates to:
  /// **'Carbon estimator'**
  String get carbonTitle;

  /// No description provided for @speciesLabel.
  ///
  /// In en, this message translates to:
  /// **'Species'**
  String get speciesLabel;

  /// No description provided for @dbhLabel.
  ///
  /// In en, this message translates to:
  /// **'DBH (cm)'**
  String get dbhLabel;

  /// No description provided for @heightLabel.
  ///
  /// In en, this message translates to:
  /// **'Height (m)'**
  String get heightLabel;

  /// No description provided for @ageYearsLabel.
  ///
  /// In en, this message translates to:
  /// **'Age (years)'**
  String get ageYearsLabel;

  /// No description provided for @integrityScore.
  ///
  /// In en, this message translates to:
  /// **'Integrity {score}'**
  String integrityScore(String score);

  /// No description provided for @forestIntegrityTitle.
  ///
  /// In en, this message translates to:
  /// **'Forest Integrity'**
  String get forestIntegrityTitle;

  /// No description provided for @sarProviderLabel.
  ///
  /// In en, this message translates to:
  /// **'Axentis SAR'**
  String get sarProviderLabel;

  /// No description provided for @portfolioAvg.
  ///
  /// In en, this message translates to:
  /// **'/ 100 portfolio avg'**
  String get portfolioAvg;

  /// No description provided for @atRiskCount.
  ///
  /// In en, this message translates to:
  /// **'{count} at risk'**
  String atRiskCount(int count);

  /// No description provided for @divergentCount.
  ///
  /// In en, this message translates to:
  /// **'{count} divergent'**
  String divergentCount(int count);

  /// No description provided for @alignedCount.
  ///
  /// In en, this message translates to:
  /// **'{count} aligned'**
  String alignedCount(int count);

  /// No description provided for @sarBaselineHint.
  ///
  /// In en, this message translates to:
  /// **'Run SAR scans on the web satellite page to establish Forest Integrity baselines.'**
  String get sarBaselineHint;

  /// No description provided for @selectSite.
  ///
  /// In en, this message translates to:
  /// **'Select site'**
  String get selectSite;

  /// No description provided for @devHint.
  ///
  /// In en, this message translates to:
  /// **'Dev hint: {hint}'**
  String devHint(String hint);

  /// No description provided for @registrationPrograms.
  ///
  /// In en, this message translates to:
  /// **'Registration programs'**
  String get registrationPrograms;

  /// No description provided for @registrationProgramsUpdated.
  ///
  /// In en, this message translates to:
  /// **'Registration programs updated.'**
  String get registrationProgramsUpdated;

  /// No description provided for @saveProgramPreferences.
  ///
  /// In en, this message translates to:
  /// **'Save program preferences'**
  String get saveProgramPreferences;

  /// No description provided for @biometricConfirmReason.
  ///
  /// In en, this message translates to:
  /// **'Confirm to enable biometric unlock'**
  String get biometricConfirmReason;

  /// No description provided for @defaultUserName.
  ///
  /// In en, this message translates to:
  /// **'Aranyix user'**
  String get defaultUserName;

  /// No description provided for @fullNameLabel.
  ///
  /// In en, this message translates to:
  /// **'Full name *'**
  String get fullNameLabel;

  /// No description provided for @fullNameValidation.
  ///
  /// In en, this message translates to:
  /// **'Enter your full name'**
  String get fullNameValidation;

  /// No description provided for @loginEmailLabel.
  ///
  /// In en, this message translates to:
  /// **'Login email'**
  String get loginEmailLabel;

  /// No description provided for @loginEmailHint.
  ///
  /// In en, this message translates to:
  /// **'Used to sign in. Cannot be changed here.'**
  String get loginEmailHint;

  /// No description provided for @phoneLabel.
  ///
  /// In en, this message translates to:
  /// **'Phone'**
  String get phoneLabel;

  /// No description provided for @cityLabel.
  ///
  /// In en, this message translates to:
  /// **'City'**
  String get cityLabel;

  /// No description provided for @stateLabel.
  ///
  /// In en, this message translates to:
  /// **'State'**
  String get stateLabel;

  /// No description provided for @notSet.
  ///
  /// In en, this message translates to:
  /// **'Not set'**
  String get notSet;

  /// No description provided for @setDateOfBirth.
  ///
  /// In en, this message translates to:
  /// **'Set date of birth'**
  String get setDateOfBirth;

  /// No description provided for @ageYearsCount.
  ///
  /// In en, this message translates to:
  /// **'{count} years'**
  String ageYearsCount(int count);

  /// No description provided for @saveProfile.
  ///
  /// In en, this message translates to:
  /// **'Save profile'**
  String get saveProfile;

  /// No description provided for @treeFallback.
  ///
  /// In en, this message translates to:
  /// **'Tree'**
  String get treeFallback;

  /// No description provided for @healthLabel.
  ///
  /// In en, this message translates to:
  /// **'Health'**
  String get healthLabel;

  /// No description provided for @carbonLabel.
  ///
  /// In en, this message translates to:
  /// **'Carbon'**
  String get carbonLabel;

  /// No description provided for @dbhCmLabel.
  ///
  /// In en, this message translates to:
  /// **'DBH'**
  String get dbhCmLabel;

  /// No description provided for @heightMLabel.
  ///
  /// In en, this message translates to:
  /// **'Height'**
  String get heightMLabel;

  /// No description provided for @satelliteLabel.
  ///
  /// In en, this message translates to:
  /// **'Satellite'**
  String get satelliteLabel;

  /// No description provided for @riskLabel.
  ///
  /// In en, this message translates to:
  /// **'Risk'**
  String get riskLabel;

  /// No description provided for @statusLabel.
  ///
  /// In en, this message translates to:
  /// **'Status'**
  String get statusLabel;

  /// No description provided for @ndviLabel.
  ///
  /// In en, this message translates to:
  /// **'NDVI'**
  String get ndviLabel;

  /// No description provided for @analyzing.
  ///
  /// In en, this message translates to:
  /// **'Analyzing…'**
  String get analyzing;

  /// No description provided for @runAiAnalysis.
  ///
  /// In en, this message translates to:
  /// **'Run AI analysis'**
  String get runAiAnalysis;

  /// No description provided for @checkingSatellite.
  ///
  /// In en, this message translates to:
  /// **'Checking satellite…'**
  String get checkingSatellite;

  /// No description provided for @runSatelliteHealth.
  ///
  /// In en, this message translates to:
  /// **'Run satellite health'**
  String get runSatelliteHealth;

  /// No description provided for @saveCorridor.
  ///
  /// In en, this message translates to:
  /// **'Save corridor'**
  String get saveCorridor;

  /// No description provided for @savePolygonWorkArea.
  ///
  /// In en, this message translates to:
  /// **'Save polygon work area'**
  String get savePolygonWorkArea;

  /// No description provided for @nameLabel.
  ///
  /// In en, this message translates to:
  /// **'Name'**
  String get nameLabel;

  /// No description provided for @projectLabel.
  ///
  /// In en, this message translates to:
  /// **'Project'**
  String get projectLabel;

  /// No description provided for @projectFallback.
  ///
  /// In en, this message translates to:
  /// **'Project'**
  String get projectFallback;

  /// No description provided for @bufferMLabel.
  ///
  /// In en, this message translates to:
  /// **'Buffer (m)'**
  String get bufferMLabel;

  /// No description provided for @saveWorkArea.
  ///
  /// In en, this message translates to:
  /// **'Save work area'**
  String get saveWorkArea;

  /// No description provided for @addTreeTooltip.
  ///
  /// In en, this message translates to:
  /// **'Add tree'**
  String get addTreeTooltip;

  /// No description provided for @polygonModeTooltip.
  ///
  /// In en, this message translates to:
  /// **'Polygon mode'**
  String get polygonModeTooltip;

  /// No description provided for @corridorModeTooltip.
  ///
  /// In en, this message translates to:
  /// **'Corridor / linear mode'**
  String get corridorModeTooltip;

  /// No description provided for @creditsSummaryHint.
  ///
  /// In en, this message translates to:
  /// **'Organization credit ledger summary (tCO₂e). Estimated until verified / issued.'**
  String get creditsSummaryHint;

  /// No description provided for @grossCredits.
  ///
  /// In en, this message translates to:
  /// **'Gross credits'**
  String get grossCredits;

  /// No description provided for @bufferWithheld.
  ///
  /// In en, this message translates to:
  /// **'Buffer withheld'**
  String get bufferWithheld;

  /// No description provided for @netCredits.
  ///
  /// In en, this message translates to:
  /// **'Net credits'**
  String get netCredits;

  /// No description provided for @issuedCredits.
  ///
  /// In en, this message translates to:
  /// **'Issued credits'**
  String get issuedCredits;

  /// No description provided for @homeAiBriefTitle.
  ///
  /// In en, this message translates to:
  /// **'Today\'s AI Brief'**
  String get homeAiBriefTitle;

  /// No description provided for @securityCheck.
  ///
  /// In en, this message translates to:
  /// **'Security check'**
  String get securityCheck;

  /// No description provided for @unknownSpecies.
  ///
  /// In en, this message translates to:
  /// **'Unknown'**
  String get unknownSpecies;

  /// No description provided for @workAreaFallback.
  ///
  /// In en, this message translates to:
  /// **'Work area'**
  String get workAreaFallback;

  /// No description provided for @areaFallback.
  ///
  /// In en, this message translates to:
  /// **'Area'**
  String get areaFallback;

  /// No description provided for @violationFallback.
  ///
  /// In en, this message translates to:
  /// **'Violation'**
  String get violationFallback;

  /// No description provided for @modeLabel.
  ///
  /// In en, this message translates to:
  /// **'Mode'**
  String get modeLabel;

  /// No description provided for @treesCountLabel.
  ///
  /// In en, this message translates to:
  /// **'Trees'**
  String get treesCountLabel;

  /// No description provided for @violationsLabel.
  ///
  /// In en, this message translates to:
  /// **'Violations'**
  String get violationsLabel;

  /// No description provided for @compliancePassed.
  ///
  /// In en, this message translates to:
  /// **'Compliance check passed'**
  String get compliancePassed;

  /// No description provided for @complianceIssuesFound.
  ///
  /// In en, this message translates to:
  /// **'Compliance issues found'**
  String get complianceIssuesFound;

  /// No description provided for @treeSaved.
  ///
  /// In en, this message translates to:
  /// **'Tree saved'**
  String get treeSaved;

  /// No description provided for @submitting.
  ///
  /// In en, this message translates to:
  /// **'Submitting…'**
  String get submitting;

  /// No description provided for @submitForReview.
  ///
  /// In en, this message translates to:
  /// **'Submit for review'**
  String get submitForReview;

  /// No description provided for @orgDetailsTitle.
  ///
  /// In en, this message translates to:
  /// **'Organization details'**
  String get orgDetailsTitle;

  /// No description provided for @workEmailLabel.
  ///
  /// In en, this message translates to:
  /// **'Work email'**
  String get workEmailLabel;

  /// No description provided for @contactPhoneLabel.
  ///
  /// In en, this message translates to:
  /// **'Contact phone'**
  String get contactPhoneLabel;

  /// No description provided for @updatePassword.
  ///
  /// In en, this message translates to:
  /// **'Update password'**
  String get updatePassword;

  /// No description provided for @sendResetCode.
  ///
  /// In en, this message translates to:
  /// **'Send reset code'**
  String get sendResetCode;

  /// No description provided for @sendSmsCode.
  ///
  /// In en, this message translates to:
  /// **'Send SMS code'**
  String get sendSmsCode;

  /// No description provided for @applicationReceivedTitle.
  ///
  /// In en, this message translates to:
  /// **'Application received'**
  String get applicationReceivedTitle;

  /// No description provided for @verifyPhone.
  ///
  /// In en, this message translates to:
  /// **'Verify phone'**
  String get verifyPhone;

  /// No description provided for @verifyEmail.
  ///
  /// In en, this message translates to:
  /// **'Verify email'**
  String get verifyEmail;

  /// No description provided for @creating.
  ///
  /// In en, this message translates to:
  /// **'Creating…'**
  String get creating;

  /// No description provided for @continueBtn.
  ///
  /// In en, this message translates to:
  /// **'Continue'**
  String get continueBtn;

  /// No description provided for @verifying.
  ///
  /// In en, this message translates to:
  /// **'Verifying…'**
  String get verifying;

  /// No description provided for @finishing.
  ///
  /// In en, this message translates to:
  /// **'Finishing…'**
  String get finishing;

  /// No description provided for @finish.
  ///
  /// In en, this message translates to:
  /// **'Finish'**
  String get finish;

  /// No description provided for @joiningAs.
  ///
  /// In en, this message translates to:
  /// **'I am joining as'**
  String get joiningAs;

  /// No description provided for @mobileLabel.
  ///
  /// In en, this message translates to:
  /// **'Mobile'**
  String get mobileLabel;

  /// No description provided for @yourJourney.
  ///
  /// In en, this message translates to:
  /// **'Your journey'**
  String get yourJourney;

  /// No description provided for @reportTypeTree.
  ///
  /// In en, this message translates to:
  /// **'Tree portfolio'**
  String get reportTypeTree;

  /// No description provided for @reportTypePlantation.
  ///
  /// In en, this message translates to:
  /// **'Plantation'**
  String get reportTypePlantation;

  /// No description provided for @reportTypeCarbon.
  ///
  /// In en, this message translates to:
  /// **'Carbon'**
  String get reportTypeCarbon;

  /// No description provided for @reportTypeBiodiversity.
  ///
  /// In en, this message translates to:
  /// **'Biodiversity'**
  String get reportTypeBiodiversity;

  /// No description provided for @reportTypeEsg.
  ///
  /// In en, this message translates to:
  /// **'ESG disclosure'**
  String get reportTypeEsg;

  /// No description provided for @typeLabel.
  ///
  /// In en, this message translates to:
  /// **'Type'**
  String get typeLabel;

  /// No description provided for @formatLabel.
  ///
  /// In en, this message translates to:
  /// **'Format'**
  String get formatLabel;

  /// No description provided for @survivalStatusLabel.
  ///
  /// In en, this message translates to:
  /// **'Survival status'**
  String get survivalStatusLabel;

  /// No description provided for @measurementMethodLabel.
  ///
  /// In en, this message translates to:
  /// **'Measurement method'**
  String get measurementMethodLabel;

  /// No description provided for @optionalRemeasure.
  ///
  /// In en, this message translates to:
  /// **'Optional remeasure'**
  String get optionalRemeasure;

  /// No description provided for @optionalHint.
  ///
  /// In en, this message translates to:
  /// **'Optional'**
  String get optionalHint;

  /// No description provided for @remarksLabel.
  ///
  /// In en, this message translates to:
  /// **'Remarks'**
  String get remarksLabel;

  /// No description provided for @submitSurvivalSurvey.
  ///
  /// In en, this message translates to:
  /// **'Submit survival survey'**
  String get submitSurvivalSurvey;

  /// No description provided for @survivalLive.
  ///
  /// In en, this message translates to:
  /// **'Live'**
  String get survivalLive;

  /// No description provided for @survivalStressed.
  ///
  /// In en, this message translates to:
  /// **'Stressed'**
  String get survivalStressed;

  /// No description provided for @survivalDead.
  ///
  /// In en, this message translates to:
  /// **'Dead'**
  String get survivalDead;

  /// No description provided for @survivalReplaced.
  ///
  /// In en, this message translates to:
  /// **'Replaced'**
  String get survivalReplaced;

  /// No description provided for @visualEstimate.
  ///
  /// In en, this message translates to:
  /// **'Visual estimate'**
  String get visualEstimate;

  /// No description provided for @caliper.
  ///
  /// In en, this message translates to:
  /// **'Caliper'**
  String get caliper;

  /// No description provided for @photogrammetry.
  ///
  /// In en, this message translates to:
  /// **'Photogrammetry'**
  String get photogrammetry;

  /// No description provided for @medianSide.
  ///
  /// In en, this message translates to:
  /// **'Median'**
  String get medianSide;

  /// No description provided for @generalCategory.
  ///
  /// In en, this message translates to:
  /// **'General'**
  String get generalCategory;

  /// No description provided for @apiServerLabel.
  ///
  /// In en, this message translates to:
  /// **'API server'**
  String get apiServerLabel;

  /// No description provided for @securityCheckUnavailable.
  ///
  /// In en, this message translates to:
  /// **'Security check unavailable.'**
  String get securityCheckUnavailable;

  /// No description provided for @welcomeJourneySub.
  ///
  /// In en, this message translates to:
  /// **'From field capture to executive clarity.'**
  String get welcomeJourneySub;

  /// No description provided for @indiaFirstMrv.
  ///
  /// In en, this message translates to:
  /// **'India-first MRV'**
  String get indiaFirstMrv;

  /// No description provided for @treeSavedReadyNext.
  ///
  /// In en, this message translates to:
  /// **'Tree saved. Ready for the next gap.'**
  String get treeSavedReadyNext;

  /// No description provided for @setupStepTreeDefaults.
  ///
  /// In en, this message translates to:
  /// **'Tree registration defaults'**
  String get setupStepTreeDefaults;

  /// No description provided for @setupStepPlantingStandard.
  ///
  /// In en, this message translates to:
  /// **'Planting standard'**
  String get setupStepPlantingStandard;

  /// No description provided for @setupStepWorkAreas.
  ///
  /// In en, this message translates to:
  /// **'Work areas on map'**
  String get setupStepWorkAreas;

  /// No description provided for @addTreeSetupBlockedExplain.
  ///
  /// In en, this message translates to:
  /// **'Tree registration for this project needs one-time settings on the web app. On mobile you only enter GPS, photos, and species per tree — not permit or legal fields again.'**
  String get addTreeSetupBlockedExplain;

  /// No description provided for @openProjectSetupWeb.
  ///
  /// In en, this message translates to:
  /// **'Complete setup on web'**
  String get openProjectSetupWeb;

  /// No description provided for @setupDefaultsSaved.
  ///
  /// In en, this message translates to:
  /// **'Permit, site zone, and agency saved'**
  String get setupDefaultsSaved;

  /// No description provided for @setupStandardAttached.
  ///
  /// In en, this message translates to:
  /// **'Compliance standard attached'**
  String get setupStandardAttached;

  /// No description provided for @setupNoStandard.
  ///
  /// In en, this message translates to:
  /// **'No planting standard attached'**
  String get setupNoStandard;

  /// No description provided for @setupWorkAreasCount.
  ///
  /// In en, this message translates to:
  /// **'{count} area(s) defined'**
  String setupWorkAreasCount(int count);

  /// No description provided for @setupDrawWorkArea.
  ///
  /// In en, this message translates to:
  /// **'Draw at least one polygon or corridor'**
  String get setupDrawWorkArea;

  /// No description provided for @setupMissingFields.
  ///
  /// In en, this message translates to:
  /// **'Missing: {fields}'**
  String setupMissingFields(String fields);

  /// No description provided for @fieldOpsQuickActions.
  ///
  /// In en, this message translates to:
  /// **'Quick actions'**
  String get fieldOpsQuickActions;

  /// No description provided for @viewAllProjects.
  ///
  /// In en, this message translates to:
  /// **'View all projects'**
  String get viewAllProjects;

  /// No description provided for @viewAll.
  ///
  /// In en, this message translates to:
  /// **'View all'**
  String get viewAll;

  /// No description provided for @noProjectsAssigned.
  ///
  /// In en, this message translates to:
  /// **'No projects assigned yet.'**
  String get noProjectsAssigned;

  /// No description provided for @registerTreeInField.
  ///
  /// In en, this message translates to:
  /// **'Register a tree'**
  String get registerTreeInField;

  /// No description provided for @navSyncQueue.
  ///
  /// In en, this message translates to:
  /// **'Sync queue'**
  String get navSyncQueue;

  /// No description provided for @auditWorkspaceTitle.
  ///
  /// In en, this message translates to:
  /// **'Estate Watch audit'**
  String get auditWorkspaceTitle;

  /// No description provided for @auditWorkspaceSubtitle.
  ///
  /// In en, this message translates to:
  /// **'Field verification, attestation, and sync status'**
  String get auditWorkspaceSubtitle;

  /// No description provided for @auditWorkspaceNoAccess.
  ///
  /// In en, this message translates to:
  /// **'You do not have access to Estate Watch audit tools.'**
  String get auditWorkspaceNoAccess;

  /// No description provided for @auditEngagements.
  ///
  /// In en, this message translates to:
  /// **'Engagements'**
  String get auditEngagements;

  /// No description provided for @auditPlotsDue.
  ///
  /// In en, this message translates to:
  /// **'Plots due'**
  String get auditPlotsDue;

  /// No description provided for @auditInField.
  ///
  /// In en, this message translates to:
  /// **'In field'**
  String get auditInField;

  /// No description provided for @auditExportReady.
  ///
  /// In en, this message translates to:
  /// **'Export ready'**
  String get auditExportReady;

  /// No description provided for @auditAttested.
  ///
  /// In en, this message translates to:
  /// **'Attested'**
  String get auditAttested;

  /// No description provided for @auditNearestAction.
  ///
  /// In en, this message translates to:
  /// **'Nearest action'**
  String get auditNearestAction;

  /// No description provided for @auditPlotsDueTitle.
  ///
  /// In en, this message translates to:
  /// **'{count, plural, =1{1 plot needs a visit} other{{count} plots need visits}}'**
  String auditPlotsDueTitle(int count);

  /// No description provided for @auditPlotsDueSubtitle.
  ///
  /// In en, this message translates to:
  /// **'Capture GPS, photos, and tree counts at assigned plots'**
  String get auditPlotsDueSubtitle;

  /// No description provided for @auditOpenPlots.
  ///
  /// In en, this message translates to:
  /// **'Open plots'**
  String get auditOpenPlots;

  /// No description provided for @auditAttestationAction.
  ///
  /// In en, this message translates to:
  /// **'Attestation'**
  String get auditAttestationAction;

  /// No description provided for @auditOpenAttestation.
  ///
  /// In en, this message translates to:
  /// **'Review & sign'**
  String get auditOpenAttestation;

  /// No description provided for @auditQuickLinks.
  ///
  /// In en, this message translates to:
  /// **'Quick links'**
  String get auditQuickLinks;

  /// No description provided for @auditPlotVisits.
  ///
  /// In en, this message translates to:
  /// **'Plot visits'**
  String get auditPlotVisits;

  /// No description provided for @auditPlotNavigate.
  ///
  /// In en, this message translates to:
  /// **'Navigate'**
  String get auditPlotNavigate;

  /// No description provided for @auditPlotStartVisit.
  ///
  /// In en, this message translates to:
  /// **'Start visit'**
  String get auditPlotStartVisit;

  /// No description provided for @auditPlotsWaiting.
  ///
  /// In en, this message translates to:
  /// **'{count, plural, =1{1 plot waiting for verifier visit} other{{count} plots waiting for verifier visits}}'**
  String auditPlotsWaiting(int count);

  /// No description provided for @auditPlotsAllVisitedShort.
  ///
  /// In en, this message translates to:
  /// **'All assigned audit plots are visited for the current scope.'**
  String get auditPlotsAllVisitedShort;

  /// No description provided for @auditPlotsAllVisited.
  ///
  /// In en, this message translates to:
  /// **'All assigned plots visited for current scope'**
  String get auditPlotsAllVisited;

  /// No description provided for @auditAttestationTitle.
  ///
  /// In en, this message translates to:
  /// **'Attestation'**
  String get auditAttestationTitle;

  /// No description provided for @auditAttestationMobileSubtitle.
  ///
  /// In en, this message translates to:
  /// **'Review anomalies and sign off export bundles'**
  String get auditAttestationMobileSubtitle;

  /// No description provided for @auditAttestationUnavailable.
  ///
  /// In en, this message translates to:
  /// **'No engagement is ready for attestation yet.'**
  String get auditAttestationUnavailable;

  /// No description provided for @auditSyncQueueHint.
  ///
  /// In en, this message translates to:
  /// **'Retry failed audit visits and offline uploads'**
  String get auditSyncQueueHint;

  /// No description provided for @auditProjectsTitle.
  ///
  /// In en, this message translates to:
  /// **'Estate projects'**
  String get auditProjectsTitle;

  /// No description provided for @auditNoEstateProjects.
  ///
  /// In en, this message translates to:
  /// **'No estate monitoring projects'**
  String get auditNoEstateProjects;

  /// No description provided for @auditNoEstateProjectsHint.
  ///
  /// In en, this message translates to:
  /// **'Estate Watch engagements appear here when estate monitoring projects are assigned.'**
  String get auditNoEstateProjectsHint;

  /// No description provided for @auditAttestationLocked.
  ///
  /// In en, this message translates to:
  /// **'Attestation locked'**
  String get auditAttestationLocked;

  /// No description provided for @auditAttestationExportRequired.
  ///
  /// In en, this message translates to:
  /// **'Complete export readiness on web before mobile sign-off.'**
  String get auditAttestationExportRequired;

  /// No description provided for @auditAnomalyReviews.
  ///
  /// In en, this message translates to:
  /// **'Anomaly reviews'**
  String get auditAnomalyReviews;

  /// No description provided for @auditNoAnomalies.
  ///
  /// In en, this message translates to:
  /// **'No anomalies require review.'**
  String get auditNoAnomalies;

  /// No description provided for @auditReviewAnomaly.
  ///
  /// In en, this message translates to:
  /// **'Review'**
  String get auditReviewAnomaly;

  /// No description provided for @auditReviewSaved.
  ///
  /// In en, this message translates to:
  /// **'Anomaly review saved'**
  String get auditReviewSaved;

  /// No description provided for @auditReviewRationaleRequired.
  ///
  /// In en, this message translates to:
  /// **'Enter a rationale for this review.'**
  String get auditReviewRationaleRequired;

  /// No description provided for @auditDispositionUphold.
  ///
  /// In en, this message translates to:
  /// **'Uphold'**
  String get auditDispositionUphold;

  /// No description provided for @auditDispositionOverturn.
  ///
  /// In en, this message translates to:
  /// **'Overturn'**
  String get auditDispositionOverturn;

  /// No description provided for @auditDispositionDefer.
  ///
  /// In en, this message translates to:
  /// **'Defer'**
  String get auditDispositionDefer;

  /// No description provided for @auditLeadSignOff.
  ///
  /// In en, this message translates to:
  /// **'Lead sign-off'**
  String get auditLeadSignOff;

  /// No description provided for @auditVerdictLabel.
  ///
  /// In en, this message translates to:
  /// **'Verdict'**
  String get auditVerdictLabel;

  /// No description provided for @auditVerdictApproved.
  ///
  /// In en, this message translates to:
  /// **'Approved'**
  String get auditVerdictApproved;

  /// No description provided for @auditVerdictConditional.
  ///
  /// In en, this message translates to:
  /// **'Conditional'**
  String get auditVerdictConditional;

  /// No description provided for @auditVerdictRejected.
  ///
  /// In en, this message translates to:
  /// **'Rejected'**
  String get auditVerdictRejected;

  /// No description provided for @auditSignSummaryLabel.
  ///
  /// In en, this message translates to:
  /// **'Attestation summary'**
  String get auditSignSummaryLabel;

  /// No description provided for @auditSignSummaryRequired.
  ///
  /// In en, this message translates to:
  /// **'Enter an attestation summary.'**
  String get auditSignSummaryRequired;

  /// No description provided for @auditSignNotesLabel.
  ///
  /// In en, this message translates to:
  /// **'Notes (optional)'**
  String get auditSignNotesLabel;

  /// No description provided for @auditSignAttestation.
  ///
  /// In en, this message translates to:
  /// **'Sign attestation'**
  String get auditSignAttestation;

  /// No description provided for @auditSignSaved.
  ///
  /// In en, this message translates to:
  /// **'Attestation signed'**
  String get auditSignSaved;

  /// No description provided for @auditCosignTitle.
  ///
  /// In en, this message translates to:
  /// **'Co-sign attestation'**
  String get auditCosignTitle;

  /// No description provided for @auditCosignNotesLabel.
  ///
  /// In en, this message translates to:
  /// **'Co-sign notes (optional)'**
  String get auditCosignNotesLabel;

  /// No description provided for @auditCosignAttestation.
  ///
  /// In en, this message translates to:
  /// **'Co-sign'**
  String get auditCosignAttestation;

  /// No description provided for @auditCosignSaved.
  ///
  /// In en, this message translates to:
  /// **'Co-signature recorded'**
  String get auditCosignSaved;

  /// No description provided for @auditSignaturesTitle.
  ///
  /// In en, this message translates to:
  /// **'{count} of {required} signatures'**
  String auditSignaturesTitle(int count, int required);

  /// No description provided for @auditPendingCosign.
  ///
  /// In en, this message translates to:
  /// **'{count, plural, =1{1 co-signature pending} other{{count} co-signatures pending}}'**
  String auditPendingCosign(int count);

  /// No description provided for @auditSignedVerdict.
  ///
  /// In en, this message translates to:
  /// **'Signed: {verdict}'**
  String auditSignedVerdict(String verdict);

  /// No description provided for @auditCreateVerifyLink.
  ///
  /// In en, this message translates to:
  /// **'Create public verify link'**
  String get auditCreateVerifyLink;

  /// No description provided for @auditCopyVerifyLink.
  ///
  /// In en, this message translates to:
  /// **'Copy link'**
  String get auditCopyVerifyLink;

  /// No description provided for @auditOpenVerifyLink.
  ///
  /// In en, this message translates to:
  /// **'Open'**
  String get auditOpenVerifyLink;

  /// No description provided for @auditVerifyLinkCopied.
  ///
  /// In en, this message translates to:
  /// **'Verify link copied'**
  String get auditVerifyLinkCopied;

  /// No description provided for @auditSyncAuditVisits.
  ///
  /// In en, this message translates to:
  /// **'Audit plot visits'**
  String get auditSyncAuditVisits;

  /// No description provided for @auditSyncRetryFailed.
  ///
  /// In en, this message translates to:
  /// **'Retry failed visits'**
  String get auditSyncRetryFailed;

  /// No description provided for @auditSyncOpenWorkspace.
  ///
  /// In en, this message translates to:
  /// **'Open Estate Watch'**
  String get auditSyncOpenWorkspace;

  /// No description provided for @auditSyncEmptyHint.
  ///
  /// In en, this message translates to:
  /// **'Capture plot visits from Field or Estate Watch audit'**
  String get auditSyncEmptyHint;

  /// No description provided for @dashboardAlertsSection.
  ///
  /// In en, this message translates to:
  /// **'Alerts'**
  String get dashboardAlertsSection;

  /// No description provided for @dashboardNoUrgentAlerts.
  ///
  /// In en, this message translates to:
  /// **'No urgent items'**
  String get dashboardNoUrgentAlerts;

  /// No description provided for @dashboardAlertsClear.
  ///
  /// In en, this message translates to:
  /// **'Field alerts are clear for now'**
  String get dashboardAlertsClear;

  /// No description provided for @pendingSyncBannerSyncing.
  ///
  /// In en, this message translates to:
  /// **'Syncing offline data…'**
  String get pendingSyncBannerSyncing;

  /// No description provided for @pendingSyncBannerWaiting.
  ///
  /// In en, this message translates to:
  /// **'{count, plural, =1{1 item waiting to sync when online} other{{count} items waiting to sync when online}}'**
  String pendingSyncBannerWaiting(int count);

  /// No description provided for @syncNow.
  ///
  /// In en, this message translates to:
  /// **'Sync now'**
  String get syncNow;

  /// No description provided for @syncQueueAllSynced.
  ///
  /// In en, this message translates to:
  /// **'All synced'**
  String get syncQueueAllSynced;

  /// No description provided for @syncQueuePendingCount.
  ///
  /// In en, this message translates to:
  /// **'{count, plural, =1{1 item pending} other{{count} items pending}}'**
  String syncQueuePendingCount(int count);

  /// No description provided for @syncQueueBreakdown.
  ///
  /// In en, this message translates to:
  /// **'{trees} trees · {survival} survival · {audit} audit · {bio} bio'**
  String syncQueueBreakdown(int trees, int survival, int audit, int bio);

  /// No description provided for @fieldAlertsTitle.
  ///
  /// In en, this message translates to:
  /// **'Field alerts'**
  String get fieldAlertsTitle;

  /// No description provided for @addTreeWizardSiteSpecies.
  ///
  /// In en, this message translates to:
  /// **'Site & species'**
  String get addTreeWizardSiteSpecies;

  /// No description provided for @addTreeWizardGpsPlacement.
  ///
  /// In en, this message translates to:
  /// **'GPS & placement'**
  String get addTreeWizardGpsPlacement;

  /// No description provided for @addTreeWizardPhotosSubmit.
  ///
  /// In en, this message translates to:
  /// **'Photos & submit'**
  String get addTreeWizardPhotosSubmit;

  /// No description provided for @viewSyncQueue.
  ///
  /// In en, this message translates to:
  /// **'View sync queue'**
  String get viewSyncQueue;

  /// No description provided for @monitoringBioLoadError.
  ///
  /// In en, this message translates to:
  /// **'Bioacoustic summary unavailable'**
  String get monitoringBioLoadError;

  /// No description provided for @addTreeWizardContext.
  ///
  /// In en, this message translates to:
  /// **'Project & work area'**
  String get addTreeWizardContext;

  /// No description provided for @addTreeWizardPhotos.
  ///
  /// In en, this message translates to:
  /// **'Photos'**
  String get addTreeWizardPhotos;

  /// No description provided for @addTreeWizardReview.
  ///
  /// In en, this message translates to:
  /// **'Review & submit'**
  String get addTreeWizardReview;

  /// No description provided for @fieldNearbyTreesSorted.
  ///
  /// In en, this message translates to:
  /// **'Sorted by distance from your current location'**
  String get fieldNearbyTreesSorted;

  /// No description provided for @dashboardTreesRegistered.
  ///
  /// In en, this message translates to:
  /// **'{count} trees registered'**
  String dashboardTreesRegistered(int count);

  /// No description provided for @segmentNutriGarden.
  ///
  /// In en, this message translates to:
  /// **'Nutri-garden / Poshan Vatika'**
  String get segmentNutriGarden;

  /// No description provided for @schemePoshanVatika.
  ///
  /// In en, this message translates to:
  /// **'Amrit Poshan Vatika'**
  String get schemePoshanVatika;

  /// No description provided for @schemeApvSiteId.
  ///
  /// In en, this message translates to:
  /// **'APV site ID'**
  String get schemeApvSiteId;

  /// No description provided for @schemeGramPanchayat.
  ///
  /// In en, this message translates to:
  /// **'Gram panchayat'**
  String get schemeGramPanchayat;

  /// No description provided for @schemeSiteAreaHa.
  ///
  /// In en, this message translates to:
  /// **'Site area (ha)'**
  String get schemeSiteAreaHa;

  /// No description provided for @syncQueueSyncing.
  ///
  /// In en, this message translates to:
  /// **'Syncing…'**
  String get syncQueueSyncing;

  /// No description provided for @syncQueueSyncedCount.
  ///
  /// In en, this message translates to:
  /// **'Synced {count} item(s)'**
  String syncQueueSyncedCount(int count);

  /// No description provided for @syncQueueDeleteConfirmBody.
  ///
  /// In en, this message translates to:
  /// **'This removes the offline item from your device. It cannot be undone.'**
  String get syncQueueDeleteConfirmBody;

  /// No description provided for @deleteLabel.
  ///
  /// In en, this message translates to:
  /// **'Delete'**
  String get deleteLabel;

  /// No description provided for @syncQueueItemRemoved.
  ///
  /// In en, this message translates to:
  /// **'Item removed'**
  String get syncQueueItemRemoved;

  /// No description provided for @syncQueueTreeRegistration.
  ///
  /// In en, this message translates to:
  /// **'Tree registration'**
  String get syncQueueTreeRegistration;

  /// No description provided for @syncQueueStatusLine.
  ///
  /// In en, this message translates to:
  /// **'Status: {status}'**
  String syncQueueStatusLine(String status);

  /// No description provided for @syncQueuePhotosLine.
  ///
  /// In en, this message translates to:
  /// **'Photos: {count}'**
  String syncQueuePhotosLine(int count);

  /// No description provided for @syncQueueGpsLine.
  ///
  /// In en, this message translates to:
  /// **'GPS: {lat}, {lon}'**
  String syncQueueGpsLine(String lat, String lon);

  /// No description provided for @syncQueueQueuedLine.
  ///
  /// In en, this message translates to:
  /// **'Queued: {time}'**
  String syncQueueQueuedLine(String time);

  /// No description provided for @syncQueueRetryUpload.
  ///
  /// In en, this message translates to:
  /// **'Retry upload'**
  String get syncQueueRetryUpload;

  /// No description provided for @syncQueueDeleteFromQueue.
  ///
  /// In en, this message translates to:
  /// **'Delete from queue'**
  String get syncQueueDeleteFromQueue;

  /// No description provided for @syncQueueDeleteTreeTitle.
  ///
  /// In en, this message translates to:
  /// **'Delete tree registration?'**
  String get syncQueueDeleteTreeTitle;

  /// No description provided for @syncQueueBioRecording.
  ///
  /// In en, this message translates to:
  /// **'Bioacoustic recording'**
  String get syncQueueBioRecording;

  /// No description provided for @syncQueueDurationLine.
  ///
  /// In en, this message translates to:
  /// **'Duration: {seconds}s'**
  String syncQueueDurationLine(String seconds);

  /// No description provided for @syncQueueDeleteRecordingTitle.
  ///
  /// In en, this message translates to:
  /// **'Delete recording?'**
  String get syncQueueDeleteRecordingTitle;

  /// No description provided for @syncQueueAuditPlotVisit.
  ///
  /// In en, this message translates to:
  /// **'Audit plot visit'**
  String get syncQueueAuditPlotVisit;

  /// No description provided for @syncQueuePresenceLine.
  ///
  /// In en, this message translates to:
  /// **'Presence: {value}'**
  String syncQueuePresenceLine(String value);

  /// No description provided for @syncQueueDeleteAuditVisitTitle.
  ///
  /// In en, this message translates to:
  /// **'Delete audit visit?'**
  String get syncQueueDeleteAuditVisitTitle;

  /// No description provided for @syncQueueSurvivalSurveyTitle.
  ///
  /// In en, this message translates to:
  /// **'Survival survey'**
  String get syncQueueSurvivalSurveyTitle;

  /// No description provided for @syncQueueTreeLine.
  ///
  /// In en, this message translates to:
  /// **'Tree: {id}'**
  String syncQueueTreeLine(String id);

  /// No description provided for @syncQueueSurvivalStatusLine.
  ///
  /// In en, this message translates to:
  /// **'Status: {status}'**
  String syncQueueSurvivalStatusLine(String status);

  /// No description provided for @syncQueueQueueLine.
  ///
  /// In en, this message translates to:
  /// **'Queue: {status}'**
  String syncQueueQueueLine(String status);

  /// No description provided for @syncQueueDeleteSurvivalTitle.
  ///
  /// In en, this message translates to:
  /// **'Delete survival survey?'**
  String get syncQueueDeleteSurvivalTitle;

  /// No description provided for @syncQueueRecordingMeta.
  ///
  /// In en, this message translates to:
  /// **'{seconds}s recording'**
  String syncQueueRecordingMeta(String seconds);

  /// No description provided for @syncQueuePhotosMeta.
  ///
  /// In en, this message translates to:
  /// **'{count} photo(s) · {status}'**
  String syncQueuePhotosMeta(int count, String status);

  /// No description provided for @plotFallback.
  ///
  /// In en, this message translates to:
  /// **'Plot'**
  String get plotFallback;

  /// No description provided for @surveyFallback.
  ///
  /// In en, this message translates to:
  /// **'survey'**
  String get surveyFallback;

  /// No description provided for @visitFallback.
  ///
  /// In en, this message translates to:
  /// **'visit'**
  String get visitFallback;

  /// No description provided for @evidenceTitle.
  ///
  /// In en, this message translates to:
  /// **'Evidence & MRV'**
  String get evidenceTitle;

  /// No description provided for @evidenceMrvShareText.
  ///
  /// In en, this message translates to:
  /// **'MRV compliance export'**
  String get evidenceMrvShareText;

  /// No description provided for @evidenceMrvReady.
  ///
  /// In en, this message translates to:
  /// **'MRV export ready to share'**
  String get evidenceMrvReady;

  /// No description provided for @evidenceBundleShareText.
  ///
  /// In en, this message translates to:
  /// **'Evidence bundle'**
  String get evidenceBundleShareText;

  /// No description provided for @evidenceBundleReady.
  ///
  /// In en, this message translates to:
  /// **'Evidence bundle ready to share'**
  String get evidenceBundleReady;

  /// No description provided for @evidenceProjectScope.
  ///
  /// In en, this message translates to:
  /// **'Project scope'**
  String get evidenceProjectScope;

  /// No description provided for @evidenceNoProjects.
  ///
  /// In en, this message translates to:
  /// **'No projects available'**
  String get evidenceNoProjects;

  /// No description provided for @evidenceSelectProject.
  ///
  /// In en, this message translates to:
  /// **'Select project'**
  String get evidenceSelectProject;

  /// No description provided for @evidencePortfolioAll.
  ///
  /// In en, this message translates to:
  /// **'Portfolio (all)'**
  String get evidencePortfolioAll;

  /// No description provided for @evidencePipeline.
  ///
  /// In en, this message translates to:
  /// **'Evidence pipeline'**
  String get evidencePipeline;

  /// No description provided for @evidenceVerified.
  ///
  /// In en, this message translates to:
  /// **'Verified'**
  String get evidenceVerified;

  /// No description provided for @evidencePending.
  ///
  /// In en, this message translates to:
  /// **'Pending'**
  String get evidencePending;

  /// No description provided for @evidenceGaps.
  ///
  /// In en, this message translates to:
  /// **'Gaps'**
  String get evidenceGaps;

  /// No description provided for @evidenceGapsHeader.
  ///
  /// In en, this message translates to:
  /// **'Gaps needing attention'**
  String get evidenceGapsHeader;

  /// No description provided for @evidenceNoGaps.
  ///
  /// In en, this message translates to:
  /// **'No evidence gaps'**
  String get evidenceNoGaps;

  /// No description provided for @evidenceNoGapsSub.
  ///
  /// In en, this message translates to:
  /// **'Portfolio evidence is up to date'**
  String get evidenceNoGapsSub;

  /// No description provided for @evidenceExports.
  ///
  /// In en, this message translates to:
  /// **'Exports'**
  String get evidenceExports;

  /// No description provided for @evidenceDownloadMrvPdf.
  ///
  /// In en, this message translates to:
  /// **'Download MRV pack (PDF)'**
  String get evidenceDownloadMrvPdf;

  /// No description provided for @evidenceDownloadMrvExcel.
  ///
  /// In en, this message translates to:
  /// **'Download MRV pack (Excel)'**
  String get evidenceDownloadMrvExcel;

  /// No description provided for @evidenceDownloadBundle.
  ///
  /// In en, this message translates to:
  /// **'Download evidence bundle (ZIP)'**
  String get evidenceDownloadBundle;

  /// No description provided for @evidenceReportsExports.
  ///
  /// In en, this message translates to:
  /// **'Reports & exports'**
  String get evidenceReportsExports;

  /// No description provided for @evidenceGapSurvivalDue.
  ///
  /// In en, this message translates to:
  /// **'Survival survey evidence due'**
  String get evidenceGapSurvivalDue;

  /// No description provided for @evidenceGapViolationsOpen.
  ///
  /// In en, this message translates to:
  /// **'Compliance violations open'**
  String get evidenceGapViolationsOpen;

  /// No description provided for @evidenceGapIntegrityBlocked.
  ///
  /// In en, this message translates to:
  /// **'Integrity monitoring gate blocked'**
  String get evidenceGapIntegrityBlocked;

  /// No description provided for @evidenceGapCreditTransitions.
  ///
  /// In en, this message translates to:
  /// **'Credit transitions'**
  String get evidenceGapCreditTransitions;

  /// No description provided for @evidenceGapFieldOps.
  ///
  /// In en, this message translates to:
  /// **'Field ops'**
  String get evidenceGapFieldOps;

  /// No description provided for @evidenceGapTreesCount.
  ///
  /// In en, this message translates to:
  /// **'{count} trees'**
  String evidenceGapTreesCount(String count);

  /// No description provided for @evidenceGapOpenCount.
  ///
  /// In en, this message translates to:
  /// **'{count} open'**
  String evidenceGapOpenCount(String count);

  /// No description provided for @treeRegistryTitle.
  ///
  /// In en, this message translates to:
  /// **'Tree registry'**
  String get treeRegistryTitle;

  /// No description provided for @filtersTitle.
  ///
  /// In en, this message translates to:
  /// **'Filters'**
  String get filtersTitle;

  /// No description provided for @filterAll.
  ///
  /// In en, this message translates to:
  /// **'All'**
  String get filterAll;

  /// No description provided for @clearFilters.
  ///
  /// In en, this message translates to:
  /// **'Clear filters'**
  String get clearFilters;

  /// No description provided for @treeRegistrySearchHint.
  ///
  /// In en, this message translates to:
  /// **'Search ID, species, area…'**
  String get treeRegistrySearchHint;

  /// No description provided for @sortRecent.
  ///
  /// In en, this message translates to:
  /// **'Recent'**
  String get sortRecent;

  /// No description provided for @sortTreeId.
  ///
  /// In en, this message translates to:
  /// **'Tree ID'**
  String get sortTreeId;

  /// No description provided for @treesCountSuffix.
  ///
  /// In en, this message translates to:
  /// **'trees'**
  String get treesCountSuffix;

  /// No description provided for @registryCategoryAttention.
  ///
  /// In en, this message translates to:
  /// **'Attention'**
  String get registryCategoryAttention;

  /// No description provided for @registryCategoryMissingEvidence.
  ///
  /// In en, this message translates to:
  /// **'Missing evidence'**
  String get registryCategoryMissingEvidence;

  /// No description provided for @registryCategoryUnverified.
  ///
  /// In en, this message translates to:
  /// **'Unverified'**
  String get registryCategoryUnverified;

  /// No description provided for @registryCategoryHealthy.
  ///
  /// In en, this message translates to:
  /// **'Healthy'**
  String get registryCategoryHealthy;

  /// No description provided for @registryOnPageTotal.
  ///
  /// In en, this message translates to:
  /// **'{onPage} on page · {total} total'**
  String registryOnPageTotal(int onPage, int total);

  /// No description provided for @registryPageOf.
  ///
  /// In en, this message translates to:
  /// **'Page {current} of {pages}'**
  String registryPageOf(int current, int pages);

  /// No description provided for @registryPrev.
  ///
  /// In en, this message translates to:
  /// **'← Prev'**
  String get registryPrev;

  /// No description provided for @registryNext.
  ///
  /// In en, this message translates to:
  /// **'Next →'**
  String get registryNext;

  /// No description provided for @registryNoMatch.
  ///
  /// In en, this message translates to:
  /// **'No trees match'**
  String get registryNoMatch;

  /// No description provided for @registryNoMatchSub.
  ///
  /// In en, this message translates to:
  /// **'Try a different filter or search term'**
  String get registryNoMatchSub;

  /// No description provided for @registryCachedList.
  ///
  /// In en, this message translates to:
  /// **'Showing cached tree list'**
  String get registryCachedList;

  /// No description provided for @registryCachedListFrom.
  ///
  /// In en, this message translates to:
  /// **'Showing cached tree list from {time}'**
  String registryCachedListFrom(String time);

  /// No description provided for @statusUnverified.
  ///
  /// In en, this message translates to:
  /// **'Unverified'**
  String get statusUnverified;

  /// No description provided for @projectCreditLedger.
  ///
  /// In en, this message translates to:
  /// **'Credit ledger'**
  String get projectCreditLedger;

  /// No description provided for @projectSetupTitle.
  ///
  /// In en, this message translates to:
  /// **'Project setup'**
  String get projectSetupTitle;

  /// No description provided for @completeSetup.
  ///
  /// In en, this message translates to:
  /// **'Complete setup'**
  String get completeSetup;

  /// No description provided for @openSetupOnWeb.
  ///
  /// In en, this message translates to:
  /// **'Open setup on web'**
  String get openSetupOnWeb;

  /// No description provided for @survivalSurveysDue.
  ///
  /// In en, this message translates to:
  /// **'Survival surveys due'**
  String get survivalSurveysDue;

  /// No description provided for @survivalNoSurveysDue.
  ///
  /// In en, this message translates to:
  /// **'No survival surveys due ({total} trees on {interval} day interval)'**
  String survivalNoSurveysDue(int total, String interval);

  /// No description provided for @survivalTreesNeedRegeotag.
  ///
  /// In en, this message translates to:
  /// **'{due} of {total} trees need re-geotag ({interval} day interval)'**
  String survivalTreesNeedRegeotag(int due, int total, String interval);

  /// No description provided for @treeIdLabel.
  ///
  /// In en, this message translates to:
  /// **'Tree {id}'**
  String treeIdLabel(String id);

  /// No description provided for @moreCount.
  ///
  /// In en, this message translates to:
  /// **'+ {count} more'**
  String moreCount(int count);

  /// No description provided for @integrityMonitoringGate.
  ///
  /// In en, this message translates to:
  /// **'Integrity monitoring gate'**
  String get integrityMonitoringGate;

  /// No description provided for @integrityGatePassed.
  ///
  /// In en, this message translates to:
  /// **'Monitoring gate passed for credit transitions.'**
  String get integrityGatePassed;

  /// No description provided for @integrityGateBlocked.
  ///
  /// In en, this message translates to:
  /// **'Monitoring gate blocked for credit transitions.'**
  String get integrityGateBlocked;

  /// No description provided for @integrityEligibleAudit.
  ///
  /// In en, this message translates to:
  /// **'Eligible {eligible}/{total} · Audit ready {auditReady}/{total}'**
  String integrityEligibleAudit(
    String eligible,
    String total,
    String auditReady,
  );

  /// No description provided for @treesWithBlockingIssues.
  ///
  /// In en, this message translates to:
  /// **'{count} tree(s) with blocking issues'**
  String treesWithBlockingIssues(int count);

  /// No description provided for @satelliteNoScan.
  ///
  /// In en, this message translates to:
  /// **'Satellite: no scan yet'**
  String get satelliteNoScan;

  /// No description provided for @satelliteScanned.
  ///
  /// In en, this message translates to:
  /// **'Satellite: scanned'**
  String get satelliteScanned;

  /// No description provided for @satelliteStale.
  ///
  /// In en, this message translates to:
  /// **'Satellite: stale ({days} days ago)'**
  String satelliteStale(int days);

  /// No description provided for @satelliteScannedToday.
  ///
  /// In en, this message translates to:
  /// **'Satellite: scanned today'**
  String get satelliteScannedToday;

  /// No description provided for @satelliteDaysAgo.
  ///
  /// In en, this message translates to:
  /// **'Satellite: {days} days ago'**
  String satelliteDaysAgo(int days);

  /// No description provided for @treesPerHa.
  ///
  /// In en, this message translates to:
  /// **'{count} trees/ha'**
  String treesPerHa(String count);

  /// No description provided for @workAreaBlock.
  ///
  /// In en, this message translates to:
  /// **'block {code}'**
  String workAreaBlock(String code);

  /// No description provided for @treeDetailOverview.
  ///
  /// In en, this message translates to:
  /// **'Overview'**
  String get treeDetailOverview;

  /// No description provided for @treeDetailField.
  ///
  /// In en, this message translates to:
  /// **'Field'**
  String get treeDetailField;

  /// No description provided for @treeDetailIntelligence.
  ///
  /// In en, this message translates to:
  /// **'Intelligence'**
  String get treeDetailIntelligence;

  /// No description provided for @treeDetailMap.
  ///
  /// In en, this message translates to:
  /// **'Map'**
  String get treeDetailMap;

  /// No description provided for @treeDetailInspect.
  ///
  /// In en, this message translates to:
  /// **'Inspect'**
  String get treeDetailInspect;

  /// No description provided for @treeDetailEvidence.
  ///
  /// In en, this message translates to:
  /// **'Evidence'**
  String get treeDetailEvidence;

  /// No description provided for @treeDetailMonitor.
  ///
  /// In en, this message translates to:
  /// **'Monitor'**
  String get treeDetailMonitor;

  /// No description provided for @treeDetailVerified.
  ///
  /// In en, this message translates to:
  /// **'Verified'**
  String get treeDetailVerified;

  /// No description provided for @treeDetailFieldLocation.
  ///
  /// In en, this message translates to:
  /// **'Field location'**
  String get treeDetailFieldLocation;

  /// No description provided for @treeDetailFollowUpPhotoAdded.
  ///
  /// In en, this message translates to:
  /// **'Follow-up photo added'**
  String get treeDetailFollowUpPhotoAdded;

  /// No description provided for @treeDetailCachedDetail.
  ///
  /// In en, this message translates to:
  /// **'Showing cached tree detail — connect to refresh'**
  String get treeDetailCachedDetail;

  /// No description provided for @treeDetailUploadingPhoto.
  ///
  /// In en, this message translates to:
  /// **'Uploading photo…'**
  String get treeDetailUploadingPhoto;

  /// No description provided for @treeDetailAddFollowUpPhoto.
  ///
  /// In en, this message translates to:
  /// **'Add follow-up photo'**
  String get treeDetailAddFollowUpPhoto;

  /// No description provided for @treeDetailPhotoGallery.
  ///
  /// In en, this message translates to:
  /// **'Photo gallery'**
  String get treeDetailPhotoGallery;

  /// No description provided for @treeDetailNoPhotos.
  ///
  /// In en, this message translates to:
  /// **'No photos yet'**
  String get treeDetailNoPhotos;

  /// No description provided for @treeDetailNoPhotosSub.
  ///
  /// In en, this message translates to:
  /// **'Add a follow-up photo from Overview or during survival survey'**
  String get treeDetailNoPhotosSub;

  /// No description provided for @treeDetailMeasurementHistory.
  ///
  /// In en, this message translates to:
  /// **'Measurement history'**
  String get treeDetailMeasurementHistory;

  /// No description provided for @treeDetailNoMeasurements.
  ///
  /// In en, this message translates to:
  /// **'No measurements recorded'**
  String get treeDetailNoMeasurements;

  /// No description provided for @treeDetailNoMeasurementsSub.
  ///
  /// In en, this message translates to:
  /// **'Survival surveys and field captures appear here'**
  String get treeDetailNoMeasurementsSub;

  /// No description provided for @treeDetailAiHistory.
  ///
  /// In en, this message translates to:
  /// **'AI analysis history'**
  String get treeDetailAiHistory;

  /// No description provided for @treeDetailNoAiAnalyses.
  ///
  /// In en, this message translates to:
  /// **'No AI analyses yet'**
  String get treeDetailNoAiAnalyses;

  /// No description provided for @treeDetailNoAiAnalysesSub.
  ///
  /// In en, this message translates to:
  /// **'Run AI analysis from the Overview tab'**
  String get treeDetailNoAiAnalysesSub;

  /// No description provided for @treeDetailSarFusion.
  ///
  /// In en, this message translates to:
  /// **'SAR integrity fusion'**
  String get treeDetailSarFusion;

  /// No description provided for @treeDetailGroundStatus.
  ///
  /// In en, this message translates to:
  /// **'Ground status'**
  String get treeDetailGroundStatus;

  /// No description provided for @treeDetailIntegrityScoreLabel.
  ///
  /// In en, this message translates to:
  /// **'Integrity score'**
  String get treeDetailIntegrityScoreLabel;

  /// No description provided for @treeDetailAuditBlockers.
  ///
  /// In en, this message translates to:
  /// **'Audit-ready blockers'**
  String get treeDetailAuditBlockers;

  /// No description provided for @treeDetailTimeline.
  ///
  /// In en, this message translates to:
  /// **'Timeline'**
  String get treeDetailTimeline;

  /// No description provided for @treeDetailRegistered.
  ///
  /// In en, this message translates to:
  /// **'Registered · {date}'**
  String treeDetailRegistered(String date);

  /// No description provided for @treeDetailFieldCapture.
  ///
  /// In en, this message translates to:
  /// **'Field capture'**
  String get treeDetailFieldCapture;

  /// No description provided for @treeDetailSatelliteVerified.
  ///
  /// In en, this message translates to:
  /// **'Satellite verified'**
  String get treeDetailSatelliteVerified;

  /// No description provided for @treeDetailRemoteSensingPassed.
  ///
  /// In en, this message translates to:
  /// **'Remote sensing check passed'**
  String get treeDetailRemoteSensingPassed;

  /// No description provided for @treeDetailNdviSignal.
  ///
  /// In en, this message translates to:
  /// **'NDVI signal · {level}'**
  String treeDetailNdviSignal(String level);

  /// No description provided for @treeDetailMeasurement.
  ///
  /// In en, this message translates to:
  /// **'Measurement'**
  String get treeDetailMeasurement;

  /// No description provided for @treeDetailCanopy.
  ///
  /// In en, this message translates to:
  /// **'Canopy'**
  String get treeDetailCanopy;

  /// No description provided for @treeDetailAnalysis.
  ///
  /// In en, this message translates to:
  /// **'Analysis'**
  String get treeDetailAnalysis;

  /// No description provided for @treeDetailFusionScore.
  ///
  /// In en, this message translates to:
  /// **'Fusion score {score}'**
  String treeDetailFusionScore(String score);

  /// No description provided for @treeDetailCarbonSummary.
  ///
  /// In en, this message translates to:
  /// **'Carbon {kg} kg · DBH {dbh} cm'**
  String treeDetailCarbonSummary(String kg, String dbh);

  /// No description provided for @treeDetailHealthLine.
  ///
  /// In en, this message translates to:
  /// **'Health {health}'**
  String treeDetailHealthLine(String health);

  /// No description provided for @auditVisitQueued.
  ///
  /// In en, this message translates to:
  /// **'Visit queued for sync when online'**
  String get auditVisitQueued;

  /// No description provided for @auditVisitSaved.
  ///
  /// In en, this message translates to:
  /// **'Audit plot visit saved'**
  String get auditVisitSaved;

  /// No description provided for @auditVisitTitle.
  ///
  /// In en, this message translates to:
  /// **'Visit {code}'**
  String auditVisitTitle(String code);

  /// No description provided for @auditCapturingGps.
  ///
  /// In en, this message translates to:
  /// **'Capturing GPS…'**
  String get auditCapturingGps;

  /// No description provided for @auditTreePresence.
  ///
  /// In en, this message translates to:
  /// **'Tree presence'**
  String get auditTreePresence;

  /// No description provided for @auditTreesPresent.
  ///
  /// In en, this message translates to:
  /// **'Trees present'**
  String get auditTreesPresent;

  /// No description provided for @auditTreesAbsent.
  ///
  /// In en, this message translates to:
  /// **'No trees / bare ground'**
  String get auditTreesAbsent;

  /// No description provided for @auditTreesSparse.
  ///
  /// In en, this message translates to:
  /// **'Sparse / scattered'**
  String get auditTreesSparse;

  /// No description provided for @auditCannotAssess.
  ///
  /// In en, this message translates to:
  /// **'Cannot assess'**
  String get auditCannotAssess;

  /// No description provided for @auditTreesObserved.
  ///
  /// In en, this message translates to:
  /// **'Trees observed'**
  String get auditTreesObserved;

  /// No description provided for @auditTreesAlive.
  ///
  /// In en, this message translates to:
  /// **'Trees alive'**
  String get auditTreesAlive;

  /// No description provided for @auditOutcome.
  ///
  /// In en, this message translates to:
  /// **'Outcome'**
  String get auditOutcome;

  /// No description provided for @auditOutcomeInconclusive.
  ///
  /// In en, this message translates to:
  /// **'Inconclusive'**
  String get auditOutcomeInconclusive;

  /// No description provided for @auditOutcomeSupported.
  ///
  /// In en, this message translates to:
  /// **'Supported'**
  String get auditOutcomeSupported;

  /// No description provided for @auditOutcomeUnsupported.
  ///
  /// In en, this message translates to:
  /// **'Unsupported'**
  String get auditOutcomeUnsupported;

  /// No description provided for @auditFieldNotes.
  ///
  /// In en, this message translates to:
  /// **'Field notes'**
  String get auditFieldNotes;

  /// No description provided for @auditUploadingPhoto.
  ///
  /// In en, this message translates to:
  /// **'Uploading photo…'**
  String get auditUploadingPhoto;

  /// No description provided for @auditAddFieldPhoto.
  ///
  /// In en, this message translates to:
  /// **'Add field photo ({current}/5)'**
  String auditAddFieldPhoto(int current);

  /// No description provided for @auditSaveVisit.
  ///
  /// In en, this message translates to:
  /// **'Save visit'**
  String get auditSaveVisit;

  /// No description provided for @auditGpsRequired.
  ///
  /// In en, this message translates to:
  /// **'Capture GPS before saving the visit.'**
  String get auditGpsRequired;

  /// No description provided for @auditPhotoRequired.
  ///
  /// In en, this message translates to:
  /// **'Add at least one field photo.'**
  String get auditPhotoRequired;

  /// No description provided for @auditRiskSuffix.
  ///
  /// In en, this message translates to:
  /// **'{risk} risk'**
  String auditRiskSuffix(String risk);

  /// No description provided for @bioSessionDetailTitle.
  ///
  /// In en, this message translates to:
  /// **'Session detail'**
  String get bioSessionDetailTitle;

  /// No description provided for @bioDetectionTierAccepted.
  ///
  /// In en, this message translates to:
  /// **'Accepted'**
  String get bioDetectionTierAccepted;

  /// No description provided for @bioDetectionTierProbable.
  ///
  /// In en, this message translates to:
  /// **'Probable'**
  String get bioDetectionTierProbable;

  /// No description provided for @bioDetectionTierReview.
  ///
  /// In en, this message translates to:
  /// **'Review required'**
  String get bioDetectionTierReview;

  /// No description provided for @bioFieldSite.
  ///
  /// In en, this message translates to:
  /// **'Field site'**
  String get bioFieldSite;

  /// No description provided for @bioDetectedSpecies.
  ///
  /// In en, this message translates to:
  /// **'Detected species'**
  String get bioDetectedSpecies;

  /// No description provided for @bioDetectionsPending.
  ///
  /// In en, this message translates to:
  /// **'Species detections will appear when analysis completes.'**
  String get bioDetectionsPending;

  /// No description provided for @bioNoDetections.
  ///
  /// In en, this message translates to:
  /// **'No species detections yet.'**
  String get bioNoDetections;

  /// No description provided for @bioViewBiodiversityFusion.
  ///
  /// In en, this message translates to:
  /// **'View biodiversity fusion'**
  String get bioViewBiodiversityFusion;

  /// No description provided for @bioAddToEvidence.
  ///
  /// In en, this message translates to:
  /// **'Add to evidence bundle'**
  String get bioAddToEvidence;

  /// No description provided for @viewOnMap.
  ///
  /// In en, this message translates to:
  /// **'View on map'**
  String get viewOnMap;

  /// No description provided for @bioConfidenceScore.
  ///
  /// In en, this message translates to:
  /// **'Confidence {score}/100'**
  String bioConfidenceScore(String score);

  /// No description provided for @bioAcceptedCount.
  ///
  /// In en, this message translates to:
  /// **'Accepted {count}'**
  String bioAcceptedCount(String count);

  /// No description provided for @bioShannonLine.
  ///
  /// In en, this message translates to:
  /// **'Shannon {value}'**
  String bioShannonLine(String value);

  /// No description provided for @bioCallsCount.
  ///
  /// In en, this message translates to:
  /// **'{count} calls'**
  String bioCallsCount(String count);

  /// No description provided for @biodiversityTitle.
  ///
  /// In en, this message translates to:
  /// **'Biodiversity'**
  String get biodiversityTitle;

  /// No description provided for @bioTaxa.
  ///
  /// In en, this message translates to:
  /// **'Taxa'**
  String get bioTaxa;

  /// No description provided for @bioShannonLabel.
  ///
  /// In en, this message translates to:
  /// **'Shannon'**
  String get bioShannonLabel;

  /// No description provided for @bioConfidenceLabel.
  ///
  /// In en, this message translates to:
  /// **'Confidence'**
  String get bioConfidenceLabel;

  /// No description provided for @bioConfidenceHint.
  ///
  /// In en, this message translates to:
  /// **'Biodiversity Confidence from {count} analyzed recordings (evidence quality, not habitat health)'**
  String bioConfidenceHint(int count);

  /// No description provided for @bioRegionalSpeciesNear.
  ///
  /// In en, this message translates to:
  /// **'Regional species near {lat}, {lon}'**
  String bioRegionalSpeciesNear(String lat, String lon);

  /// No description provided for @bioRegionalSpeciesGbif.
  ///
  /// In en, this message translates to:
  /// **'Regional species (GBIF)'**
  String get bioRegionalSpeciesGbif;

  /// No description provided for @bioHotspotsByWorkArea.
  ///
  /// In en, this message translates to:
  /// **'Hotspots by work area'**
  String get bioHotspotsByWorkArea;

  /// No description provided for @bioNoWorkAreas.
  ///
  /// In en, this message translates to:
  /// **'No work areas'**
  String get bioNoWorkAreas;

  /// No description provided for @bioNoWorkAreasMapped.
  ///
  /// In en, this message translates to:
  /// **'No work areas mapped'**
  String get bioNoWorkAreasMapped;

  /// No description provided for @bioConfidenceMeta.
  ///
  /// In en, this message translates to:
  /// **'Confidence {score}/100'**
  String bioConfidenceMeta(int score);

  /// No description provided for @bioStrong.
  ///
  /// In en, this message translates to:
  /// **'Strong'**
  String get bioStrong;

  /// No description provided for @bioWatch.
  ///
  /// In en, this message translates to:
  /// **'Watch'**
  String get bioWatch;

  /// No description provided for @bioAcousticDetail.
  ///
  /// In en, this message translates to:
  /// **'Bioacoustic detail'**
  String get bioAcousticDetail;

  /// No description provided for @bioRunSurvey.
  ///
  /// In en, this message translates to:
  /// **'Run bioacoustic survey'**
  String get bioRunSurvey;

  /// No description provided for @bioNoLocationSpecies.
  ///
  /// In en, this message translates to:
  /// **'No location for species list'**
  String get bioNoLocationSpecies;

  /// No description provided for @bioNoLocationSpeciesSub.
  ///
  /// In en, this message translates to:
  /// **'Add a work area boundary or register a tree with GPS to load regional fauna.'**
  String get bioNoLocationSpeciesSub;

  /// No description provided for @bioNoRegionalSpecies.
  ///
  /// In en, this message translates to:
  /// **'No regional species found'**
  String get bioNoRegionalSpecies;

  /// No description provided for @bioNoRegionalSpeciesSub.
  ///
  /// In en, this message translates to:
  /// **'GBIF returned no nearby occurrences for this site.'**
  String get bioNoRegionalSpeciesSub;

  /// No description provided for @bioViewOnMapMeta.
  ///
  /// In en, this message translates to:
  /// **'View on map'**
  String get bioViewOnMapMeta;

  /// No description provided for @bioOpen.
  ///
  /// In en, this message translates to:
  /// **'Open'**
  String get bioOpen;

  /// No description provided for @carbonPortfolioTco2e.
  ///
  /// In en, this message translates to:
  /// **'tCO₂e estimated (portfolio)'**
  String get carbonPortfolioTco2e;

  /// No description provided for @carbonAnnualPace.
  ///
  /// In en, this message translates to:
  /// **'{pct}% of annual sequestration pace'**
  String carbonAnnualPace(int pct);

  /// No description provided for @carbonTreesInPortfolio.
  ///
  /// In en, this message translates to:
  /// **'{count} trees in portfolio'**
  String carbonTreesInPortfolio(int count);

  /// No description provided for @carbonByProject.
  ///
  /// In en, this message translates to:
  /// **'By project'**
  String get carbonByProject;

  /// No description provided for @carbonEnterSpecies.
  ///
  /// In en, this message translates to:
  /// **'Enter a species name.'**
  String get carbonEnterSpecies;

  /// No description provided for @carbonEstimateDisclaimer.
  ///
  /// In en, this message translates to:
  /// **'Estimate CO₂e from species and optional measurements. This is an Estimate — not a Live field measurement or registry-issued credit.'**
  String get carbonEstimateDisclaimer;

  /// No description provided for @carbonCo2eRange.
  ///
  /// In en, this message translates to:
  /// **'{lower}–{upper} kg CO₂e (90% CI)'**
  String carbonCo2eRange(String lower, String upper);

  /// No description provided for @carbonCo2eSingle.
  ///
  /// In en, this message translates to:
  /// **'{value} kg CO₂e'**
  String carbonCo2eSingle(String value);

  /// No description provided for @carbonUncertainty.
  ///
  /// In en, this message translates to:
  /// **'±{pct}% measurement + model uncertainty'**
  String carbonUncertainty(String pct);

  /// No description provided for @carbonHonestyLabel.
  ///
  /// In en, this message translates to:
  /// **'Honesty label: Estimate (modelled). Not Live sensor data.'**
  String get carbonHonestyLabel;

  /// No description provided for @reportReadyToShare.
  ///
  /// In en, this message translates to:
  /// **'Report ready to share'**
  String get reportReadyToShare;

  /// No description provided for @reportMisTitle.
  ///
  /// In en, this message translates to:
  /// **'Plantation MIS reports'**
  String get reportMisTitle;

  /// No description provided for @reportMisSubtitle.
  ///
  /// In en, this message translates to:
  /// **'Operational exports used by government plantation programmes'**
  String get reportMisSubtitle;

  /// No description provided for @reportTypeLabel.
  ///
  /// In en, this message translates to:
  /// **'Report type'**
  String get reportTypeLabel;

  /// No description provided for @reportDownloading.
  ///
  /// In en, this message translates to:
  /// **'Downloading…'**
  String get reportDownloading;

  /// No description provided for @reportDownloadMis.
  ///
  /// In en, this message translates to:
  /// **'Download MIS report'**
  String get reportDownloadMis;

  /// No description provided for @reportReadyShareNamed.
  ///
  /// In en, this message translates to:
  /// **'{name} ready to share'**
  String reportReadyShareNamed(String name);

  /// No description provided for @downloadLabel.
  ///
  /// In en, this message translates to:
  /// **'Download'**
  String get downloadLabel;

  /// No description provided for @creditIntegrityFusion.
  ///
  /// In en, this message translates to:
  /// **'Integrity fusion'**
  String get creditIntegrityFusion;

  /// No description provided for @creditAuditReady.
  ///
  /// In en, this message translates to:
  /// **'Audit ready'**
  String get creditAuditReady;

  /// No description provided for @creditEligible.
  ///
  /// In en, this message translates to:
  /// **'Credit eligible'**
  String get creditEligible;

  /// No description provided for @creditStatusHistory.
  ///
  /// In en, this message translates to:
  /// **'Status history'**
  String get creditStatusHistory;

  /// No description provided for @creditSerials.
  ///
  /// In en, this message translates to:
  /// **'Credit serials'**
  String get creditSerials;

  /// No description provided for @creditSerialFallback.
  ///
  /// In en, this message translates to:
  /// **'Serial'**
  String get creditSerialFallback;

  /// No description provided for @viewProject.
  ///
  /// In en, this message translates to:
  /// **'View project'**
  String get viewProject;

  /// No description provided for @projectLedgers.
  ///
  /// In en, this message translates to:
  /// **'Project ledgers'**
  String get projectLedgers;

  /// No description provided for @alertRecommendedAction.
  ///
  /// In en, this message translates to:
  /// **'Recommended action'**
  String get alertRecommendedAction;

  /// No description provided for @alertMarkReviewed.
  ///
  /// In en, this message translates to:
  /// **'Mark reviewed'**
  String get alertMarkReviewed;

  /// No description provided for @alertViewAffectedTree.
  ///
  /// In en, this message translates to:
  /// **'View affected tree →'**
  String get alertViewAffectedTree;

  /// No description provided for @createProjectTitle.
  ///
  /// In en, this message translates to:
  /// **'Create project'**
  String get createProjectTitle;

  /// No description provided for @createProjectSubtitle.
  ///
  /// In en, this message translates to:
  /// **'Supervisors can start a planting project and finish setup on the web.'**
  String get createProjectSubtitle;

  /// No description provided for @createProjectNameLabel.
  ///
  /// In en, this message translates to:
  /// **'Project name'**
  String get createProjectNameLabel;

  /// No description provided for @createProjectDescriptionLabel.
  ///
  /// In en, this message translates to:
  /// **'Description (optional)'**
  String get createProjectDescriptionLabel;

  /// No description provided for @createProjectSegmentLabel.
  ///
  /// In en, this message translates to:
  /// **'Segment'**
  String get createProjectSegmentLabel;

  /// No description provided for @createProjectNameRequired.
  ///
  /// In en, this message translates to:
  /// **'Project name is required'**
  String get createProjectNameRequired;

  /// No description provided for @newProject.
  ///
  /// In en, this message translates to:
  /// **'New project'**
  String get newProject;

  /// No description provided for @survivalMissingUprooted.
  ///
  /// In en, this message translates to:
  /// **'Missing / uprooted'**
  String get survivalMissingUprooted;

  /// No description provided for @survivalTapeMeasure.
  ///
  /// In en, this message translates to:
  /// **'Tape measure (DBH at 1.3 m)'**
  String get survivalTapeMeasure;

  /// No description provided for @survivalClinometer.
  ///
  /// In en, this message translates to:
  /// **'Clinometer (height)'**
  String get survivalClinometer;

  /// No description provided for @survivalPhotoAttached.
  ///
  /// In en, this message translates to:
  /// **'Survey photo attached'**
  String get survivalPhotoAttached;

  /// No description provided for @survivalCapturingPhoto.
  ///
  /// In en, this message translates to:
  /// **'Capturing photo…'**
  String get survivalCapturingPhoto;

  /// No description provided for @survivalAddPhoto.
  ///
  /// In en, this message translates to:
  /// **'Add survey photo (camera)'**
  String get survivalAddPhoto;

  /// No description provided for @survivalRemarksHint.
  ///
  /// In en, this message translates to:
  /// **'Condition, replacement notes…'**
  String get survivalRemarksHint;

  /// No description provided for @openInMaps.
  ///
  /// In en, this message translates to:
  /// **'Open in Maps'**
  String get openInMaps;

  /// No description provided for @myLocation.
  ///
  /// In en, this message translates to:
  /// **'My location'**
  String get myLocation;

  /// No description provided for @closeLabel.
  ///
  /// In en, this message translates to:
  /// **'Close'**
  String get closeLabel;

  /// No description provided for @prepareLabel.
  ///
  /// In en, this message translates to:
  /// **'Prepare'**
  String get prepareLabel;

  /// No description provided for @schemeProgramme.
  ///
  /// In en, this message translates to:
  /// **'Scheme programme'**
  String get schemeProgramme;

  /// No description provided for @governmentReferences.
  ///
  /// In en, this message translates to:
  /// **'Government references'**
  String get governmentReferences;

  /// No description provided for @schemeFallback.
  ///
  /// In en, this message translates to:
  /// **'Scheme'**
  String get schemeFallback;

  /// No description provided for @onboardingVerifyOrg.
  ///
  /// In en, this message translates to:
  /// **'• Our team verifies your organization details'**
  String get onboardingVerifyOrg;

  /// No description provided for @onboardingApprovalEmail.
  ///
  /// In en, this message translates to:
  /// **'• You receive an approval email'**
  String get onboardingApprovalEmail;

  /// No description provided for @onboardingSignInDashboard.
  ///
  /// In en, this message translates to:
  /// **'• Open the app and sign in to access your dashboard'**
  String get onboardingSignInDashboard;

  /// No description provided for @onboardingPendingSubtitle.
  ///
  /// In en, this message translates to:
  /// **'Your organization profile is under review. We will email you when your account is approved — usually within 1–2 business days.'**
  String get onboardingPendingSubtitle;

  /// No description provided for @blockerInsufficientPhotos.
  ///
  /// In en, this message translates to:
  /// **'Need at least 2 photos'**
  String get blockerInsufficientPhotos;

  /// No description provided for @blockerPhotoSpanTooShort.
  ///
  /// In en, this message translates to:
  /// **'Photos must span 30+ days'**
  String get blockerPhotoSpanTooShort;

  /// No description provided for @blockerSatelliteScanStale.
  ///
  /// In en, this message translates to:
  /// **'Satellite scan older than 90 days'**
  String get blockerSatelliteScanStale;

  /// No description provided for @blockerFusionBelowAudit.
  ///
  /// In en, this message translates to:
  /// **'Fusion score below 75'**
  String get blockerFusionBelowAudit;

  /// No description provided for @blockerMissingExif.
  ///
  /// In en, this message translates to:
  /// **'Missing camera EXIF'**
  String get blockerMissingExif;

  /// No description provided for @blockerMissingPhotoGps.
  ///
  /// In en, this message translates to:
  /// **'Photo missing GPS'**
  String get blockerMissingPhotoGps;

  /// No description provided for @blockerMissingPhotoTimestamp.
  ///
  /// In en, this message translates to:
  /// **'Photo missing timestamp'**
  String get blockerMissingPhotoTimestamp;

  /// No description provided for @blockerPhotoTimestampStale.
  ///
  /// In en, this message translates to:
  /// **'Photo older than 7 days'**
  String get blockerPhotoTimestampStale;

  /// No description provided for @blockerRegeotagMismatch.
  ///
  /// In en, this message translates to:
  /// **'Re-geotag mismatch'**
  String get blockerRegeotagMismatch;

  /// No description provided for @blockerDuplicatePhoto.
  ///
  /// In en, this message translates to:
  /// **'Duplicate photo'**
  String get blockerDuplicatePhoto;

  /// No description provided for @blockerDuplicateCoordinate.
  ///
  /// In en, this message translates to:
  /// **'Duplicate coordinate'**
  String get blockerDuplicateCoordinate;

  /// No description provided for @blockerAiConfidenceLow.
  ///
  /// In en, this message translates to:
  /// **'Low AI confidence'**
  String get blockerAiConfidenceLow;

  /// No description provided for @blockerSarIntegrityBelow.
  ///
  /// In en, this message translates to:
  /// **'SAR forest integrity below minimum'**
  String get blockerSarIntegrityBelow;

  /// No description provided for @blockerOpticalScanStale.
  ///
  /// In en, this message translates to:
  /// **'Work area optical scan stale'**
  String get blockerOpticalScanStale;

  /// No description provided for @blockerFusionBelowMinimum.
  ///
  /// In en, this message translates to:
  /// **'Fusion score below minimum'**
  String get blockerFusionBelowMinimum;

  /// No description provided for @blockerNotCreditEligible.
  ///
  /// In en, this message translates to:
  /// **'Not credit eligible'**
  String get blockerNotCreditEligible;

  /// No description provided for @remediationAddFollowUpPhoto.
  ///
  /// In en, this message translates to:
  /// **'Add a follow-up field photo from the tree detail page.'**
  String get remediationAddFollowUpPhoto;

  /// No description provided for @remediationRunSurvivalSurvey.
  ///
  /// In en, this message translates to:
  /// **'Run a survival survey with GPS and an optional survey photo.'**
  String get remediationRunSurvivalSurvey;

  /// No description provided for @remediationTriggerSatellite.
  ///
  /// In en, this message translates to:
  /// **'Trigger a satellite health scan from tree detail.'**
  String get remediationTriggerSatellite;

  /// No description provided for @remediationReviewMonitoring.
  ///
  /// In en, this message translates to:
  /// **'Review monitoring coverage for this project.'**
  String get remediationReviewMonitoring;

  /// No description provided for @monitoringNeedsDecision.
  ///
  /// In en, this message translates to:
  /// **'Needs decision'**
  String get monitoringNeedsDecision;

  /// No description provided for @monitoringNoUrgentAlerts.
  ///
  /// In en, this message translates to:
  /// **'No urgent alerts'**
  String get monitoringNoUrgentAlerts;

  /// No description provided for @monitoringSignalsStable.
  ///
  /// In en, this message translates to:
  /// **'Monitoring signals are stable'**
  String get monitoringSignalsStable;

  /// No description provided for @monitoringSitePulse.
  ///
  /// In en, this message translates to:
  /// **'Site pulse'**
  String get monitoringSitePulse;

  /// No description provided for @alertCategoryFire.
  ///
  /// In en, this message translates to:
  /// **'Fire'**
  String get alertCategoryFire;

  /// No description provided for @alertCategoryFlood.
  ///
  /// In en, this message translates to:
  /// **'Flood'**
  String get alertCategoryFlood;

  /// No description provided for @alertCategoryWeather.
  ///
  /// In en, this message translates to:
  /// **'Weather'**
  String get alertCategoryWeather;

  /// No description provided for @alertCategoryPest.
  ///
  /// In en, this message translates to:
  /// **'Pest'**
  String get alertCategoryPest;

  /// No description provided for @alertCategorySatellite.
  ///
  /// In en, this message translates to:
  /// **'Satellite'**
  String get alertCategorySatellite;

  /// No description provided for @alertUrgencyActNow.
  ///
  /// In en, this message translates to:
  /// **'Act now'**
  String get alertUrgencyActNow;

  /// No description provided for @alertUrgencyPrepare.
  ///
  /// In en, this message translates to:
  /// **'Prepare'**
  String get alertUrgencyPrepare;

  /// No description provided for @alertUrgencyMonitor.
  ///
  /// In en, this message translates to:
  /// **'Monitor'**
  String get alertUrgencyMonitor;

  /// No description provided for @healthFilterHealthy.
  ///
  /// In en, this message translates to:
  /// **'healthy'**
  String get healthFilterHealthy;

  /// No description provided for @healthFilterStressed.
  ///
  /// In en, this message translates to:
  /// **'stressed'**
  String get healthFilterStressed;

  /// No description provided for @healthFilterDead.
  ///
  /// In en, this message translates to:
  /// **'dead'**
  String get healthFilterDead;

  /// No description provided for @monthJan.
  ///
  /// In en, this message translates to:
  /// **'Jan'**
  String get monthJan;

  /// No description provided for @monthFeb.
  ///
  /// In en, this message translates to:
  /// **'Feb'**
  String get monthFeb;

  /// No description provided for @monthMar.
  ///
  /// In en, this message translates to:
  /// **'Mar'**
  String get monthMar;

  /// No description provided for @monthApr.
  ///
  /// In en, this message translates to:
  /// **'Apr'**
  String get monthApr;

  /// No description provided for @monthMay.
  ///
  /// In en, this message translates to:
  /// **'May'**
  String get monthMay;

  /// No description provided for @monthJun.
  ///
  /// In en, this message translates to:
  /// **'Jun'**
  String get monthJun;

  /// No description provided for @monthJul.
  ///
  /// In en, this message translates to:
  /// **'Jul'**
  String get monthJul;

  /// No description provided for @monthAug.
  ///
  /// In en, this message translates to:
  /// **'Aug'**
  String get monthAug;

  /// No description provided for @monthSep.
  ///
  /// In en, this message translates to:
  /// **'Sep'**
  String get monthSep;

  /// No description provided for @monthOct.
  ///
  /// In en, this message translates to:
  /// **'Oct'**
  String get monthOct;

  /// No description provided for @monthNov.
  ///
  /// In en, this message translates to:
  /// **'Nov'**
  String get monthNov;

  /// No description provided for @monthDec.
  ///
  /// In en, this message translates to:
  /// **'Dec'**
  String get monthDec;

  /// No description provided for @methodologyTitle.
  ///
  /// In en, this message translates to:
  /// **'Methodology'**
  String get methodologyTitle;

  /// No description provided for @alertUrgencyActToday.
  ///
  /// In en, this message translates to:
  /// **'Act today'**
  String get alertUrgencyActToday;

  /// No description provided for @alertUrgencyThisWeek.
  ///
  /// In en, this message translates to:
  /// **'This week'**
  String get alertUrgencyThisWeek;
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
    'that was used.',
  );
}
