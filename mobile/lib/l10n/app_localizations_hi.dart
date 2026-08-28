// ignore: unused_import
import 'package:intl/intl.dart' as intl;
import 'app_localizations.dart';

// ignore_for_file: type=lint

/// The translations for Hindi (`hi`).
class AppLocalizationsHi extends AppLocalizations {
  AppLocalizationsHi([String locale = 'hi']) : super(locale);

  @override
  String get appTitle => 'अरणयिक्स';

  @override
  String get welcomeTitle => 'प्रमाण के साथ वन उगाएँ';

  @override
  String get signIn => 'साइन इन';

  @override
  String get signUp => 'साइन अप';

  @override
  String get home => 'होम';

  @override
  String get trees => 'पेड़';

  @override
  String get map => 'मानचित्र';

  @override
  String get notifications => 'सूचनाएँ';

  @override
  String get profile => 'प्रोफ़ाइल';

  @override
  String get monitoring => 'निगरानी';

  @override
  String get projects => 'परियोजनाएँ';

  @override
  String get fieldOps => 'फील्ड कार्य';

  @override
  String get shareTreeQr => 'पेड़ QR साझा करें';

  @override
  String shareTreeMessage(String url) {
    return 'Aranyix पर यह पेड़ देखें: $url';
  }

  @override
  String get language => 'भाषा';

  @override
  String get languageEnglish => 'अंग्रेज़ी';

  @override
  String get languageHindi => 'हिंदी';

  @override
  String get security => 'सुरक्षा';

  @override
  String get biometricUnlock => 'बायोमेट्रिक से अनलॉक';

  @override
  String get biometricUnlockHint =>
      'ऐप दोबारा खोलने पर फिंगरप्रिंट या फेस अनलॉक आवश्यक।';

  @override
  String get biometricEnableFailed =>
      'बायोमेट्रिक अनलॉक सक्षम नहीं — पुष्टि विफल।';

  @override
  String get biometricEnabled => 'बायोमेट्रिक अनलॉक सक्षम।';

  @override
  String get biometricDisabled => 'बायोमेट्रिक अनलॉक अक्षम।';

  @override
  String get screenshotGuard => 'स्क्रीनशॉट रोकें';

  @override
  String get screenshotGuardHint =>
      'इस डिवाइस पर स्क्रीनशॉट और स्क्रीन रिकॉर्डिंग रोकता है।';

  @override
  String get screenshotGuardEnabled => 'स्क्रीनशॉट गार्ड सक्षम।';

  @override
  String get screenshotGuardDisabled => 'स्क्रीनशॉट गार्ड अक्षम।';

  @override
  String get certificatePinning => 'प्रमाणपत्र पिनिंग';

  @override
  String offlineSyncPending(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count आइटम सिंक की प्रतीक्षा',
      one: '1 आइटम सिंक की प्रतीक्षा',
    );
    return '$_temp0';
  }

  @override
  String get offlineSyncing => 'ऑफ़लाइन डेटा सिंक हो रहा है…';

  @override
  String get offlineMode => 'आप ऑफ़लाइन हैं — कनेक्ट होने पर बदलाव सिंक होंगे।';

  @override
  String get coachMarkHomeTitle => 'आपका वन डैशबोर्ड';

  @override
  String get coachMarkHomeBody =>
      'स्वास्थ्य स्कोर, अलर्ट और त्वरित कार्य यहाँ हैं।';

  @override
  String get coachMarkTreesTitle => 'पेड़ पंजीकृत और ट्रैक करें';

  @override
  String get coachMarkTreesBody =>
      'फील्ड में पेड़ जोड़ें — ऑनलाइन होने पर सिंक होगा।';

  @override
  String get coachMarkMapTitle => 'अपनी वृक्षारोपण साइट मैप करें';

  @override
  String get coachMarkMapBody =>
      'साइट, कॉरिडोर और NDVI संदर्भ मानचित्र पर देखें।';

  @override
  String get coachMarkDone => 'समझ गया';

  @override
  String get pushNotifications => 'पुश सूचनाएँ';

  @override
  String get pushNotificationsHint =>
      'उपग्रह स्वास्थ्य, अनुपालन और सर्वाइवल सर्वे के अलर्ट।';

  @override
  String get deepLinkTreeNotFound =>
      'पेड़ नहीं मिला या आपके पास पहुँच नहीं है।';

  @override
  String get analyticsEnabled => 'उपयोग विश्लेषण';

  @override
  String get analyticsHint => 'ऐप सुधारने में मदद (कोई व्यक्तिगत फ़ोटो नहीं)।';

  @override
  String get navDashboard => 'डैशबोर्ड';

  @override
  String get navSectionPlantation => 'सेटअप और रोपण';

  @override
  String get navSectionPlantationDesc =>
      'कार्यक्रम, पेड़ पंजी, मानचित्र और फील्ड कार्य';

  @override
  String get navSectionIntelligence => 'निगरानी और विश्लेषण';

  @override
  String get navSectionIntelligenceDesc => 'उपग्रह, जैव विविधता और अलर्ट';

  @override
  String get navSectionReports => 'रिपोर्ट और प्रमाण';

  @override
  String get navSectionReportsDesc => 'निर्यात, कार्बन और AI सहायक';

  @override
  String get navSectionAccount => 'खाता';

  @override
  String get navBioacoustic => 'जैव ध्वनि';

  @override
  String get navAlerts => 'अलर्ट';

  @override
  String get navReports => 'रिपोर्ट';

  @override
  String get navAssistant => 'AI सहायक';

  @override
  String get navCarbon => 'कार्बन';

  @override
  String get navCredits => 'क्रेडिट';

  @override
  String get registerTreePrimary => 'पेड़ पंजीकृत करें';

  @override
  String get registerTreePrimarySub => 'GPS, फ़ोटो और फील्ड में ऑफ़लाइन सिंक';

  @override
  String get bioacousticActionSub =>
      'प्रजाति पहचान के लिए 60–180 सेकंड ध्वनि रिकॉर्ड करें';

  @override
  String get bioacousticTileSub => 'ध्वनि-दृश्य रिकॉर्ड';

  @override
  String get projectsTileSub => 'पैकेज और कार्य क्षेत्र';

  @override
  String get addActionFab => 'जोड़ें';

  @override
  String get addActionSheetTitle => 'फील्ड कार्य';

  @override
  String get addActionSheetSubtitle =>
      'पंजीकरण और जैव विविधता निगरानी के मुख्य उपकरण';

  @override
  String get addActionSheetEmpty =>
      'आपकी भूमिका के लिए कोई फील्ड कार्य उपलब्ध नहीं।';

  @override
  String get menuOpen => 'मेनू खोलें';

  @override
  String get drawerLoadError =>
      'नेविगेशन के लिए प्रोफ़ाइल लोड नहीं हो सकी। कनेक्शन जाँचें और पुनः प्रयास करें।';

  @override
  String get drawerSignInRequired => 'नेविगेशन देखने के लिए साइन इन करें।';

  @override
  String get drawerNoNavItems => 'आपके खाते के लिए कोई मेनू आइटम उपलब्ध नहीं।';

  @override
  String get todayWork => 'आज का कार्य';

  @override
  String get fieldWorkspace => 'फील्ड कार्यक्षेत्र';

  @override
  String get viewFullDashboard => 'पूरा डैशबोर्ड देखें';

  @override
  String get addTreeTitle => 'पेड़ जोड़ें';

  @override
  String get addTreeTitleProject => 'परियोजना पेड़ पंजीकृत करें';

  @override
  String get addTreeStepContext => 'संदर्भ';

  @override
  String get addTreeStepSpecies => 'प्रजाति और विवरण';

  @override
  String get addTreeStepLocation => 'स्थान';

  @override
  String get addTreeStepPhotos => 'फ़ोटो';

  @override
  String get addTreeStepReview => 'समीक्षा और सहेजें';

  @override
  String addTreeStepOf(int current, int total) {
    return 'चरण $current / $total';
  }

  @override
  String get addTreeBack => 'पीछे';

  @override
  String get addTreeNext => 'आगे';

  @override
  String get addTreeSaving => 'सहेजा जा रहा है…';

  @override
  String get addTreeSaveAndNext => 'सहेजें और अगला पंजीकृत करें';

  @override
  String get addTreeSaveAndExit => 'सहेजें और बाहर निकलें';

  @override
  String get addTreeProjectHint =>
      'केवल GPS, फ़ोटो और प्रजाति — गड्ढा, दूरी और गार्ड परियोजना से मिलते हैं।';

  @override
  String get addTreeSetupBlockedTitle => 'पहले परियोजना सेटअप पूरा करें';

  @override
  String get addTreeSetupBlockedBody =>
      'यहाँ पेड़ पंजीकृत करने से पहले वेब पर पंजीकरण डिफ़ॉल्ट (परमिट, साइट ज़ोन, एजेंसी) पूरे करें।';

  @override
  String get addTreeOpenProject => 'परियोजना खोलें';

  @override
  String get addTreeWorkArea => 'कार्य क्षेत्र *';

  @override
  String get addTreeProgram => 'पंजीकरण कार्यक्रम';

  @override
  String get addTreeProgramHint =>
      'BYOT नागरिक रोपण या NHAI राजमार्ग जैसा सरकारी कार्यक्रम चुनें।';

  @override
  String get addTreeValidationProgram =>
      'आगे बढ़ने से पहले पंजीकरण कार्यक्रम चुनें।';

  @override
  String get addTreeValidationWorkArea =>
      'आगे बढ़ने से पहले कार्य क्षेत्र चुनें।';

  @override
  String get addTreeApprovedSpecies => 'अनुमोदित प्रजाति';

  @override
  String get addTreeSpecies => 'प्रजाति';

  @override
  String get addTreeRoadSide => 'सड़क की ओर *';

  @override
  String get addTreeRoadSideNhai => 'सड़क की ओर (LHS/RHS) *';

  @override
  String get addTreeGuard => 'ट्री गार्ड *';

  @override
  String get addTreePitSize => 'गड्ढे का आकार (LxWxD cm)';

  @override
  String get addTreeMeasurementsTitle => 'फील्ड माप (वैकल्पिक)';

  @override
  String get addTreeMeasurementsHint =>
      'DBH 1.3 m ऊपर मापें। अभी न मापा हो तो खाली छोड़ें।';

  @override
  String get addTreeMeasurementMethod => 'माप विधि';

  @override
  String get addTreeDbh => 'DBH (cm)';

  @override
  String get addTreeHeight => 'ऊँचाई (m)';

  @override
  String get addTreeLocationHint =>
      'रोपण बिंदु पर GPS लें। परियोजना पेड़ों के लिए अनुपालन स्वचालित जाँच होती है।';

  @override
  String get addTreeGetGps => 'GPS स्थान लें';

  @override
  String get addTreePhotosHint =>
      'पेड़ और गड्ढे की स्पष्ट फ़ोटो जोड़ें। ऑफ़लाइन काम करता है — कनेक्ट होने पर अपलोड।';

  @override
  String addTreeAddPhoto(int count, int target) {
    return 'फ़ोटो जोड़ें ($count/$target)';
  }

  @override
  String addTreeOfflinePhotos(int count) {
    return '$count फ़ोटो ऑफ़लाइन सहेजी';
  }

  @override
  String get addTreeReviewTitle => 'पंजीकरण समीक्षा';

  @override
  String addTreeSessionCount(int count) {
    return 'इस सत्र में $count';
  }

  @override
  String addTreeMinPhotosWarning(int min) {
    return 'कार्यक्रम कम से कम $min फ़ोटो की सिफ़ारिश करता है।';
  }

  @override
  String get addTreeValidationContext =>
      'आगे बढ़ने से पहले परियोजना सेटअप पूरा करें या कार्य क्षेत्र चुनें।';

  @override
  String get addTreeValidationSpecies => 'आगे बढ़ने से पहले प्रजाति दर्ज करें।';

  @override
  String get addTreeValidationLocation => 'आगे बढ़ने से पहले GPS लें।';

  @override
  String get addTreeValidationCompliance =>
      'अनुपालन जाँच विफल — सख्त मोड में सहेजने से पहले ठीक करें।';

  @override
  String get bioTabRecord => 'रिकॉर्ड';

  @override
  String get bioTabHistory => 'इतिहास';

  @override
  String get bioRecordingLive => 'लाइव रिकॉर्डिंग';

  @override
  String bioRecordingTarget(int min, int max) {
    return 'लक्ष्य: $min–$max s · 48 kHz mono WAV';
  }

  @override
  String get bioStopAndSave => 'रोकें और सहेजें';

  @override
  String bioStopMin(int seconds) {
    return 'रोकें (${seconds}s न्यूनतम)';
  }

  @override
  String get bioSiteOptional => 'वृक्षारोपण साइट (वैकल्पिक)';

  @override
  String get bioSiteGpsOnly => 'कोई साइट नहीं — केवल GPS';

  @override
  String get bioTapToRecord => 'रिकॉर्ड शुरू करने के लिए टैप करें';

  @override
  String get bioStartRecording => 'परिवेश ध्वनि रिकॉर्ड शुरू करें';

  @override
  String bioSplLevel(String level) {
    return 'परिवेश SPL ≈ $level dB';
  }

  @override
  String get bioNoiseWarning =>
      'उच्च पृष्ठभूमि शोर — यातायात, हवा या मशीनरी सटीकता कम कर सकती है।';

  @override
  String get bioFieldTips =>
      'परिवेश ध्वनि रिकॉर्ड करें (आवाज़ नहीं)। फ़ोन 1–1.5 m ऊपर, स्थिर रखें। सूर्योदय/सूर्यास्त सर्वोत्तम। ऑफ़लाइन काम करता है।';

  @override
  String get bioSyncTooltip => 'ऑफ़लाइन रिकॉर्डिंग सिंक करें';

  @override
  String get bioMicDenied => 'माइक्रोफ़ोन अनुमति अस्वीकृत';

  @override
  String get bioRecordingStatus =>
      'परिवेश ध्वनि-दृश्य रिकॉर्ड… फ़ोन 1–1.5 m ऊपर, स्थिर रखें।';

  @override
  String bioTooShort(int min, int elapsed) {
    return 'कम से कम $min सेकंड रिकॉर्ड करें (अभी $elapsed s)।';
  }

  @override
  String get bioSaving => 'रिकॉर्डिंग सहेजी जा रही है…';

  @override
  String bioSavedOfflineGps(String note) {
    return 'ऑफ़लाइन सहेजा। $note';
  }

  @override
  String get bioSavedOffline =>
      'ऑफ़लाइन सहेजा। सिग्नल मिलने पर स्वचालित अपलोड और विश्लेषण।';

  @override
  String get bioUploading => 'अपलोड और विश्लेषण…';

  @override
  String get bioAnalysisComplete => 'विश्लेषण पूर्ण। नीचे परिणाम देखें।';

  @override
  String get bioUploadFailedOffline =>
      'अपलोड विफल — ऑफ़लाइन सहेजा। कनेक्शन स्थिर होने पर सिंक करें।';

  @override
  String get bioSyncing => 'ऑफ़लाइन रिकॉर्डिंग सिंक…';

  @override
  String bioSyncedCount(int count) {
    return '$count रिकॉर्डिंग सिंक हुई।';
  }

  @override
  String get bioNothingToSync => 'सिंक के लिए कोई लंबित रिकॉर्डिंग नहीं।';

  @override
  String get bioQueuePending => 'सिंक की प्रतीक्षा';

  @override
  String get bioQueueSyncing => 'सिंक हो रहा है…';

  @override
  String get bioQueueFailed => 'सिंक विफल';

  @override
  String get bioOfflineQueue => 'ऑफ़लाइन कतार';

  @override
  String get bioSyncNow => 'अभी सिंक करें';

  @override
  String get bioSyncedRecordings => 'सिंक की गई रिकॉर्डिंग';

  @override
  String get bioNoRecordingsYet => 'अभी कोई सिंक रिकॉर्डिंग नहीं।';

  @override
  String get retry => 'पुनः प्रयास';

  @override
  String get monitoringStaleSatellite => 'पुराने उपग्रह स्कैन';

  @override
  String get monitoringStaleSatelliteHint =>
      'हाल NDVI पास के बिना कार्य क्षेत्र';

  @override
  String get monitoringOpenSarVerifications => 'खुले SAR फील्ड सत्यापन';

  @override
  String get monitoringSarAlerts30d => 'SAR अलर्ट (30 दिन)';

  @override
  String get monitoringUnreadAlertsByKind => 'अपठित अलर्ट (प्रकार)';

  @override
  String get monitoringNoUnreadAlerts => 'कोई अपठित अलर्ट नहीं।';

  @override
  String get monitoringWorkAreaSarStatus => 'कार्य क्षेत्र SAR स्थिति';

  @override
  String get monitoringWorkAreaFallback => 'कार्य क्षेत्र';

  @override
  String monitoringNoWorkAreas(String violations, String survival) {
    return 'अभी कोई कार्य क्षेत्र निगरानी पंक्ति नहीं। खुले उल्लंघन: $violations, अस्तित्व बकाया: $survival।';
  }

  @override
  String monitoringDaysSinceNdvi(String days) {
    return 'NDVI से $days दिन';
  }

  @override
  String get homeWelcomeBack => 'वापसी पर स्वागत';

  @override
  String homeHello(String name) {
    return 'नमस्ते, $name';
  }

  @override
  String get homeForestHealth => 'वन स्वास्थ्य';

  @override
  String get homeInsights => 'अंतर्दृष्टि';

  @override
  String get homeCarbonGrowth => 'कार्बन वृद्धि';

  @override
  String get homeCarbonGrowthHint => 'अनुमानित अवशोषण प्रवृत्ति';

  @override
  String get homeTreeHealth => 'पेड़ स्वास्थ्य';

  @override
  String get homeTreeHealthHint => 'आपके पोर्टफोलियो में वितरण';

  @override
  String get homeSpeciesMix => 'प्रजाति मिश्रण';

  @override
  String get homeSpeciesMixHint => 'शीर्ष पंजीकृत प्रजातियाँ';

  @override
  String get homeMonitoringChip => 'निगरानी';

  @override
  String get homeFieldOpsChip => 'फील्ड कार्य';

  @override
  String get homeReportsChip => 'रिपोर्ट';

  @override
  String get homeFieldProjects => 'फील्ड परियोजनाएँ';

  @override
  String get homeAllSites => 'सभी साइटें';

  @override
  String get homeQuickSnapshot => 'त्वरित सार';

  @override
  String get homeAskAranyix => 'Aranyix से पूछें';

  @override
  String get save => 'सहेजें';

  @override
  String get cancel => 'रद्द करें';

  @override
  String get saving => 'सहेजा जा रहा है…';

  @override
  String get noAlerts => 'कोई अलर्ट नहीं।';

  @override
  String get noTreesYet => 'अभी कोई पेड़ नहीं।';

  @override
  String get addFirstTree => 'अपना पहला पेड़ जोड़ें';

  @override
  String get noProjectsYet => 'अभी कोई रोपण परियोजना नहीं सौंपी गई।';

  @override
  String get preferences => 'प्राथमिकताएँ';

  @override
  String get alertPreferences => 'अलर्ट प्राथमिकताएँ';

  @override
  String get preferencesSaved => 'प्राथमिकताएँ सहेजी गईं';

  @override
  String get satelliteHealth => 'उपग्रह स्वास्थ्य';

  @override
  String get survivalSurvey => 'अस्तित्व सर्वे';

  @override
  String get threatWatch => 'खतरा निगरानी';

  @override
  String get complianceLabel => 'अनुपालन';

  @override
  String get viewDetails => 'विवरण देखें';

  @override
  String get reviewActions => 'कार्य समीक्षा';

  @override
  String get takeAction => 'कार्रवाई करें';

  @override
  String homeTrend(String trend) {
    return 'प्रवृत्ति: $trend';
  }

  @override
  String get signOut => 'साइन आउट';

  @override
  String get editProfile => 'व्यक्तिगत प्रोफ़ाइल संपादित करें';

  @override
  String get editProfileSub => 'नाम, फ़ोन, जन्म तिथि, शहर, राज्य';

  @override
  String get appVersion => 'ऐप संस्करण';

  @override
  String get workAreas => 'कार्य क्षेत्र';

  @override
  String get noWorkAreasYet => 'वेब पर अभी कोई कार्य क्षेत्र परिभाषित नहीं।';

  @override
  String get registerTreeBtn => 'पेड़ पंजीकृत करें';

  @override
  String get createReport => 'रिपोर्ट बनाएँ';

  @override
  String get yourReports => 'आपकी रिपोर्ट';

  @override
  String get noReportsYet => 'अभी कोई रिपोर्ट नहीं।';

  @override
  String get reportCreated => 'रिपोर्ट बनाई गई';

  @override
  String get reportNeedsArea =>
      'इस रिपोर्ट प्रकार के लिए plantation / कार्य क्षेत्र चाहिए।';

  @override
  String get byStatus => 'स्थिति के अनुसार';

  @override
  String get resolve => 'सुलझाएँ';

  @override
  String get violationResolved => 'उल्लंघन सुलझाया';

  @override
  String get recentViolations => 'हाल के उल्लंघन';

  @override
  String get noOpenViolations => 'कोई खुला उल्लंघन नहीं।';

  @override
  String get survivalDueByProject => 'परियोजना के अनुसार अस्तित्व बकाया';

  @override
  String get noSurvivalDue => 'कोई अस्तित्व सर्वे बकाया नहीं।';

  @override
  String get drawPolygon => 'बहुभुज बनाएँ';

  @override
  String get drawCorridor => 'कॉरिडोर बनाएँ';

  @override
  String get undoPoint => 'बिंदु पूर्ववत';

  @override
  String get cancelDraw => 'रेखांकन रद्द';

  @override
  String get workAreaSaved => 'कार्य क्षेत्र सहेजा';

  @override
  String get needTwoPoints => 'मानचित्र पर कम से कम 2 बिंदु जोड़ें';

  @override
  String get polygonNeedsThree => 'बहुभुज के लिए कम से कम 3 बिंदु चाहिए';

  @override
  String get createProjectFirst => 'पहले रोपण परियोजना बनाएँ या जुड़ें';

  @override
  String get noTreesOnMap =>
      'GPS वाला कोई पेड़ नहीं। मानचित्र पर देखने के लिए पेड़ जोड़ें।';

  @override
  String get quickActions => 'त्वरित कार्य';

  @override
  String get liveMap => 'लाइव मानचित्र';

  @override
  String get openFullMap => 'पूरा मानचित्र खोलें';

  @override
  String get expand => 'विस्तार';

  @override
  String get noTreesOnMapPreview => 'मानचित्र पर अभी कोई पेड़ नहीं';

  @override
  String get registerFirstTree => 'पहला पेड़ पंजीकृत करें';

  @override
  String get pendingTreeRegistrations => 'लंबित पेड़ पंजीकरण';

  @override
  String get captureGpsBeforeRegister => 'पंजीकरण से पहले GPS लें।';

  @override
  String get selectWorkAreaForProject =>
      'इस परियोजना के लिए कार्य क्षेत्र चुनें।';

  @override
  String get complianceStrictBlock =>
      'अनुपालन जाँच विफल — सख्त मोड में सहेजने से पहले ठीक करें।';

  @override
  String get offlineQueuedSync => 'ऑफ़लाइन — सिंक के लिए कतार में।';

  @override
  String get profileSaved => 'प्रोफ़ाइल सहेजी';

  @override
  String get dateOfBirth => 'जन्म तिथि';

  @override
  String get age => 'आयु';

  @override
  String get dateOfMarriage => 'विवाह तिथि';

  @override
  String get survivalRegeotag => 'अस्तित्व / पुनः जियो-टैग';

  @override
  String get currentGps => 'वर्तमान GPS';

  @override
  String get noGpsFix => 'अभी कोई स्थान नहीं';

  @override
  String get refreshGps => 'GPS रीफ़्रेश';

  @override
  String get survivalSurveySaved => 'अस्तित्व सर्वे माप रिकॉर्ड के साथ सहेजा';

  @override
  String get continueWithGoogle => 'Google से जारी रखें';

  @override
  String get createAccount => 'खाता बनाएँ';

  @override
  String get forgotPassword => 'पासवर्ड भूल गए?';

  @override
  String get alreadyHaveAccountSignIn => 'पहले से खाता है? साइन इन करें';

  @override
  String get createFreeAccount => 'मुफ़्त खाता बनाएँ';

  @override
  String get alreadyHaveAccountBtn => 'मेरे पास पहले से खाता है';

  @override
  String get completingSignIn => 'साइन-इन पूरा हो रहा है…';

  @override
  String get backToSignIn => 'साइन-इन पर वापस';

  @override
  String get useEmailInstead => 'इसके बजाय ईमेल उपयोग करें';

  @override
  String get retrySecurityCheck => 'सुरक्षा जाँच पुनः प्रयास';

  @override
  String get signInWithGoogle => 'Google से साइन इन';

  @override
  String get homeFieldProjectsSub => 'NHAI पैकेज, खदान बेल्ट, सोसायटी ब्लॉक';

  @override
  String get estimate => 'अनुमान';

  @override
  String carbonKg(String kg) {
    return 'कार्बन: $kg kg';
  }

  @override
  String inputCompleteness(String value) {
    return 'इनपुट पूर्णता: $value';
  }

  @override
  String methodologyLabel(String value) {
    return 'कार्यप्रणाली: $value';
  }

  @override
  String chainageKm(String km) {
    return 'चेनेज: $km km';
  }

  @override
  String get exploreByot => 'BYOT सुविधाएँ देखें';

  @override
  String get visitWebsite => 'aranyix.tech पर जाएँ';

  @override
  String get whatHappensNext => 'आगे क्या होगा';

  @override
  String get orgTypeGovernment => 'सरकार / सार्वजनिक एजेंसी';

  @override
  String get orgTypeCorporate => 'कॉर्पोरेट / उद्योग';

  @override
  String get orgTypeNgo => 'NGO / समुदाय';

  @override
  String get askAnythingForest => 'अपने वन के बारे में कुछ भी पूछें…';

  @override
  String get alertFallback => 'अलर्ट';

  @override
  String get noHealthDataYet => 'अभी स्वास्थ्य डेटा नहीं';

  @override
  String get siteFallback => 'साइट';

  @override
  String get plantationFallback => 'वृक्षारोपण';

  @override
  String get orDivider => 'या';

  @override
  String get rememberMe => 'मुझे याद रखें';

  @override
  String get signingIn => 'साइन इन हो रहा है…';

  @override
  String get welcomeBackTitle => 'वापसी पर स्वागत';

  @override
  String get welcomeBackSub =>
      'पेड़, जैव विविधता और अनुपालन प्रमाण मैप करने के लिए साइन इन करें।';

  @override
  String get phoneOtpTab => 'फ़ोन OTP';

  @override
  String get emailTab => 'ईमेल';

  @override
  String get emailLabel => 'ईमेल';

  @override
  String get passwordLabel => 'पासवर्ड';

  @override
  String get gpsVerified => 'GPS-सत्यापित';

  @override
  String get offlineSyncLabel => 'ऑफ़लाइन सिंक';

  @override
  String get assistantTitle => 'AI सहायक';

  @override
  String get assistantHint =>
      'पेड़, अनुपालन, उपग्रह स्वास्थ्य के बारे में पूछें…';

  @override
  String get assistantSend => 'भेजें';

  @override
  String get assistantEmpty => 'शुरू करने के लिए प्रश्न पूछें।';

  @override
  String get creditsTitle => 'क्रेडिट';

  @override
  String get carbonTitle => 'कार्बन अनुमानक';

  @override
  String get speciesLabel => 'प्रजाति';

  @override
  String get dbhLabel => 'DBH (cm)';

  @override
  String get heightLabel => 'ऊँचाई (m)';

  @override
  String get ageYearsLabel => 'आयु (वर्ष)';

  @override
  String integrityScore(String score) {
    return 'अखंडता $score';
  }

  @override
  String get forestIntegrityTitle => 'वन अखंडता';

  @override
  String get sarProviderLabel => 'Axentis SAR';

  @override
  String get portfolioAvg => '/ 100 पोर्टफोलियो औसत';

  @override
  String atRiskCount(int count) {
    return '$count जोखिम पर';
  }

  @override
  String divergentCount(int count) {
    return '$count असमान';
  }

  @override
  String alignedCount(int count) {
    return '$count संरेखित';
  }

  @override
  String get sarBaselineHint =>
      'Forest Integrity आधार बनाने के लिए वेब उपग्रह पृष्ठ पर SAR स्कैन चलाएँ।';

  @override
  String get selectSite => 'साइट चुनें';

  @override
  String devHint(String hint) {
    return 'Dev संकेत: $hint';
  }

  @override
  String get registrationPrograms => 'पंजीकरण कार्यक्रम';

  @override
  String get registrationProgramsUpdated => 'पंजीकरण कार्यक्रम अपडेट हुए।';

  @override
  String get saveProgramPreferences => 'कार्यक्रम प्राथमिकताएँ सहेजें';

  @override
  String get biometricConfirmReason =>
      'बायोमेट्रिक अनलॉक सक्षम करने की पुष्टि करें';

  @override
  String get defaultUserName => 'Aranyix उपयोगकर्ता';

  @override
  String get fullNameLabel => 'पूरा नाम *';

  @override
  String get fullNameValidation => 'अपना पूरा नाम दर्ज करें';

  @override
  String get loginEmailLabel => 'लॉगिन ईमेल';

  @override
  String get loginEmailHint => 'साइन इन के लिए उपयोग। यहाँ बदला नहीं जा सकता।';

  @override
  String get phoneLabel => 'फ़ोन';

  @override
  String get cityLabel => 'शहर';

  @override
  String get stateLabel => 'राज्य';

  @override
  String get notSet => 'सेट नहीं';

  @override
  String get setDateOfBirth => 'जन्म तिथि सेट करें';

  @override
  String ageYearsCount(int count) {
    return '$count वर्ष';
  }

  @override
  String get saveProfile => 'प्रोफ़ाइल सहेजें';

  @override
  String get treeFallback => 'पेड़';

  @override
  String get healthLabel => 'स्वास्थ्य';

  @override
  String get carbonLabel => 'कार्बन';

  @override
  String get dbhCmLabel => 'DBH';

  @override
  String get heightMLabel => 'ऊँचाई';

  @override
  String get satelliteLabel => 'उपग्रह';

  @override
  String get riskLabel => 'जोखिम';

  @override
  String get statusLabel => 'स्थिति';

  @override
  String get ndviLabel => 'NDVI';

  @override
  String get analyzing => 'विश्लेषण…';

  @override
  String get runAiAnalysis => 'AI विश्लेषण चलाएँ';

  @override
  String get checkingSatellite => 'उपग्रह जाँच…';

  @override
  String get runSatelliteHealth => 'उपग्रह स्वास्थ्य चलाएँ';

  @override
  String get saveCorridor => 'कॉरिडोर सहेजें';

  @override
  String get savePolygonWorkArea => 'बहुभुज कार्य क्षेत्र सहेजें';

  @override
  String get nameLabel => 'नाम';

  @override
  String get projectLabel => 'परियोजना';

  @override
  String get projectFallback => 'परियोजना';

  @override
  String get bufferMLabel => 'बफ़र (m)';

  @override
  String get saveWorkArea => 'कार्य क्षेत्र सहेजें';

  @override
  String get addTreeTooltip => 'पेड़ जोड़ें';

  @override
  String get polygonModeTooltip => 'बहुभुज मोड';

  @override
  String get corridorModeTooltip => 'कॉरिडोर / रेखीय मोड';

  @override
  String get creditsSummaryHint =>
      'संगठन क्रेडिट खाता सार (tCO₂e)। सत्यापित/जारी होने तक अनुमानित।';

  @override
  String get grossCredits => 'सकल क्रेडिट';

  @override
  String get bufferWithheld => 'बफ़र रोक';

  @override
  String get netCredits => 'शुद्ध क्रेडिट';

  @override
  String get issuedCredits => 'जारी क्रेडिट';

  @override
  String get homeAiBriefTitle => 'आज का AI सार';

  @override
  String get securityCheck => 'सुरक्षा जाँच';

  @override
  String get unknownSpecies => 'अज्ञात';

  @override
  String get workAreaFallback => 'कार्य क्षेत्र';

  @override
  String get areaFallback => 'क्षेत्र';

  @override
  String get violationFallback => 'उल्लंघन';

  @override
  String get modeLabel => 'मोड';

  @override
  String get treesCountLabel => 'पेड़';

  @override
  String get violationsLabel => 'उल्लंघन';

  @override
  String get compliancePassed => 'अनुपालन जाँच पास';

  @override
  String get complianceIssuesFound => 'अनुपालन समस्याएँ मिलीं';

  @override
  String get treeSaved => 'पेड़ सहेजा';

  @override
  String get submitting => 'जमा हो रहा है…';

  @override
  String get submitForReview => 'समीक्षा के लिए जमा करें';

  @override
  String get orgDetailsTitle => 'संगठन विवरण';

  @override
  String get workEmailLabel => 'कार्य ईमेल';

  @override
  String get contactPhoneLabel => 'संपर्क फ़ोन';

  @override
  String get updatePassword => 'पासवर्ड अपडेट करें';

  @override
  String get sendResetCode => 'रीसेट कोड भेजें';

  @override
  String get sendSmsCode => 'SMS कोड भेजें';

  @override
  String get applicationReceivedTitle => 'आवेदन प्राप्त';

  @override
  String get verifyPhone => 'फ़ोन सत्यापित करें';

  @override
  String get verifyEmail => 'ईमेल सत्यापित करें';

  @override
  String get creating => 'बनाया जा रहा है…';

  @override
  String get continueBtn => 'जारी रखें';

  @override
  String get verifying => 'सत्यापन…';

  @override
  String get finishing => 'पूरा हो रहा है…';

  @override
  String get finish => 'समाप्त';

  @override
  String get joiningAs => 'मैं इस रूप में जुड़ रहा/रही हूँ';

  @override
  String get mobileLabel => 'मोबाइल';

  @override
  String get yourJourney => 'आपकी यात्रा';

  @override
  String get reportTypeTree => 'पेड़ पोर्टफोलियो';

  @override
  String get reportTypePlantation => 'वृक्षारोपण';

  @override
  String get reportTypeCarbon => 'कार्बन';

  @override
  String get reportTypeBiodiversity => 'जैव विविधता';

  @override
  String get typeLabel => 'प्रकार';

  @override
  String get formatLabel => 'प्रारूप';

  @override
  String get survivalStatusLabel => 'अस्तित्व स्थिति';

  @override
  String get measurementMethodLabel => 'माप विधि';

  @override
  String get optionalRemeasure => 'वैकल्पिक पुनः माप';

  @override
  String get optionalHint => 'वैकल्पिक';

  @override
  String get remarksLabel => 'टिप्पणी';

  @override
  String get submitSurvivalSurvey => 'अस्तित्व सर्वे जमा करें';

  @override
  String get survivalLive => 'जीवित';

  @override
  String get survivalStressed => 'तनावग्रस्त';

  @override
  String get survivalDead => 'मृत';

  @override
  String get survivalReplaced => 'प्रतिस्थापित';

  @override
  String get visualEstimate => 'दृश्य अनुमान';

  @override
  String get caliper => 'कैलिपर';

  @override
  String get photogrammetry => 'फोटोग्रामmetry';

  @override
  String get medianSide => 'मध्य';

  @override
  String get generalCategory => 'सामान्य';

  @override
  String get apiServerLabel => 'API सर्वर';

  @override
  String get securityCheckUnavailable => 'सुरक्षा जाँच उपलब्ध नहीं।';

  @override
  String get welcomeJourneySub => 'फील्ड कैप्चर से कार्यकारी स्पष्टता तक।';

  @override
  String get indiaFirstMrv => 'India-first MRV';

  @override
  String get treeSavedReadyNext => 'पेड़ सहेजा। अगले अंतराल के लिए तैयार।';
}
