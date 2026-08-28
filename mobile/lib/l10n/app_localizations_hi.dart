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
  String get biometricEnableFailed => 'बायोमेट्रिक अनलॉक सक्षम नहीं — पुष्टि विफल।';

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
  String get navSectionIntelligenceDesc =>
      'उपग्रह, जैव विविधता और अलर्ट';

  @override
  String get navSectionReports => 'रिपोर्ट और प्रमाण';

  @override
  String get navSectionReportsDesc =>
      'निर्यात, कार्बन और AI सहायक';

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
  String get registerTreePrimarySub =>
      'GPS, फ़ोटो और फील्ड में ऑफ़लाइन सिंक';

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
  String addTreeStepOf(int current, int total) => 'चरण $current / $total';

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
  String get addTreeValidationProgram => 'आगे बढ़ने से पहले पंजीकरण कार्यक्रम चुनें।';

  @override
  String get addTreeValidationWorkArea => 'आगे बढ़ने से पहले कार्य क्षेत्र चुनें।';

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
  String addTreeAddPhoto(int count, int target) => 'फ़ोटो जोड़ें ($count/$target)';

  @override
  String addTreeOfflinePhotos(int count) => '$count फ़ोटो ऑफ़लाइन सहेजी';

  @override
  String get addTreeReviewTitle => 'पंजीकरण समीक्षा';

  @override
  String addTreeSessionCount(int count) => 'इस सत्र में $count';

  @override
  String addTreeMinPhotosWarning(int min) => 'कार्यक्रम कम से कम $min फ़ोटो की सिफ़ारिश करता है।';

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
  String bioRecordingTarget(int min, int max) => 'लक्ष्य: $min–$max s · 48 kHz mono WAV';

  @override
  String get bioStopAndSave => 'रोकें और सहेजें';

  @override
  String bioStopMin(int seconds) => 'रोकें (${seconds}s न्यूनतम)';

  @override
  String get bioSiteOptional => 'वृक्षारोपण साइट (वैकल्पिक)';

  @override
  String get bioSiteGpsOnly => 'कोई साइट नहीं — केवल GPS';

  @override
  String get bioTapToRecord => 'रिकॉर्ड शुरू करने के लिए टैप करें';

  @override
  String get bioStartRecording => 'परिवेश ध्वनि रिकॉर्ड शुरू करें';

  @override
  String bioSplLevel(String level) => 'परिवेश SPL ≈ $level dB';

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
  String bioTooShort(int min, int elapsed) =>
      'कम से कम $min सेकंड रिकॉर्ड करें (अभी $elapsed s)।';

  @override
  String get bioSaving => 'रिकॉर्डिंग सहेजी जा रही है…';

  @override
  String bioSavedOfflineGps(String note) => 'ऑफ़लाइन सहेजा। $note';

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
  String bioSyncedCount(int count) => '$count रिकॉर्डिंग सिंक हुई।';

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
}
