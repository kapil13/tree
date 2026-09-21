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
  String get navField => 'फील्ड';

  @override
  String get navBio => 'जैव';

  @override
  String get shareTreeQr => 'पेड़ QR साझा करें';

  @override
  String shareTreeMessage(String url) {
    return 'Aranyix पर यह पेड़ देखें: $url';
  }

  @override
  String get language => 'भाषा';

  @override
  String get appearance => 'दिखावट';

  @override
  String get themeSystem => 'सिस्टम के अनुसार';

  @override
  String get themeLight => 'लाइट';

  @override
  String get themeDark => 'डार्क';

  @override
  String addTreeChainageNext(String label) {
    return 'अगला चेनेज: $label';
  }

  @override
  String get addTreeProjectMeasurementsHint =>
      'परियोजना MRV के लिए वैकल्पिक पुनः माप — खेत में न मापा हो तो खाली छोड़ें।';

  @override
  String get citizenStewardshipTitle => 'नागरिक देखभाल';

  @override
  String citizenStewardshipTrees(int count) {
    return '$count पेड़ पंजीकृत';
  }

  @override
  String citizenStewardshipDue(int count) {
    return '$count देखभाल जांच बकाया';
  }

  @override
  String citizenStewardshipAdopted(int count) {
    return '$count पेड़ अपनाए';
  }

  @override
  String citizenStewardshipPoints(int count) {
    return '$count देखभाल अंक';
  }

  @override
  String get citizenAdoptTitle => 'पेड़ अपनाएं';

  @override
  String get citizenAdoptSubtitle => 'किसी पड़ोसी के BYOT पेड़ की देखभाल करें।';

  @override
  String get citizenAdoptCodeLabel => 'पेड़ का सार्वजनिक कोड';

  @override
  String get citizenAdoptByCode => 'कोड से अपनाएं';

  @override
  String get citizenAdoptAction => 'अपनाएं';

  @override
  String get citizenAdoptBrowseTitle => 'आपके पास के पेड़';

  @override
  String get citizenAdoptEmpty =>
      'अभी कोई पेड़ उपलब्ध नहीं। QR लिंक से कोड आज़माएं।';

  @override
  String get citizenAdoptSuccess => 'पेड़ अपनाया — देखभाल के लिए धन्यवाद!';

  @override
  String get citizenAdoptNotAvailable =>
      'पेड़ अपनाना BYOT नागरिक खातों के लिए है।';

  @override
  String get citizenStewardshipHubTitle => 'मेरी देखभाल';

  @override
  String get citizenStewardshipOwnedTab => 'मेरे पेड़';

  @override
  String get citizenStewardshipAdoptedTab => 'अपनाए';

  @override
  String get citizenStewardshipCheckIn => 'चेक-इन';

  @override
  String get citizenStewardshipDueBadge => 'जांच बकाया';

  @override
  String get citizenStewardshipEmptyOwned =>
      'अभी कोई पेड़ पंजीकृत नहीं। फील्ड टैब से पहला पेड़ जोड़ें।';

  @override
  String get citizenStewardshipEmptyAdopted =>
      'अभी कोई पेड़ अपनाया नहीं। अपनाने योग्य पेड़ देखें।';

  @override
  String get citizenRelinquishTitle => 'इस पेड़ की देखभाल बंद करें?';

  @override
  String get citizenRelinquishConfirm =>
      'इस अपनाए पेड़ के लिए आपको अब चेक-इन रिमाइंडर नहीं मिलेंगे। पेड़ का स्वामित्व मालिक के पास रहेगा।';

  @override
  String get citizenRelinquishAction => 'छोड़ें';

  @override
  String get citizenRelinquishSuccess =>
      'आप अब इस पेड़ की देखभाल नहीं कर रहे हैं।';

  @override
  String get bioAnalysisRunning => 'विश्लेषण चल रहा है…';

  @override
  String get languageEnglish => 'अंग्रेज़ी';

  @override
  String get languageHindi => 'हिंदी';

  @override
  String get security => 'सुरक्षा';

  @override
  String get biometricUnlock => 'बायोमेट्रिक से अनलॉक';

  @override
  String get biometricGateTitle => 'Aranyix अनलॉक करें';

  @override
  String get biometricUnlockHint =>
      'ऐप दोबारा खोलने पर फिंगरप्रिंट या फेस अनलॉक आवश्यक।';

  @override
  String get tryAgain => 'पुनः प्रयास करें';

  @override
  String get signInWithPassword => 'पासवर्ड से साइन इन करें';

  @override
  String get sessionExpired =>
      'आपका सत्र समाप्त हो गया। जारी रखने के लिए फिर साइन इन करें।';

  @override
  String get sessionExpiredBanner =>
      'आपका सत्र समाप्त हो गया। जहाँ छोड़ा था वहीं से जारी रखने के लिए फिर साइन इन करें।';

  @override
  String get checkForUpdates => 'Google Play पर अपडेट देखें';

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
  String get offlineServerUnreachable =>
      'सर्वर उपलब्ध नहीं — API वापस आने पर बदलाव सिंक होंगे।';

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
  String get navSectionWorkspace => 'कार्यक्षेत्र';

  @override
  String get navSectionWorkspaceDesc => 'परियोजनाएँ, पेड़ पंजी और फील्ड कतार';

  @override
  String get navSectionIntelligence => 'निगरानी और विश्लेषण';

  @override
  String get navSectionIntelligenceDesc => 'उपग्रह, जैव विविधता और अलर्ट';

  @override
  String get navSectionCompliance => 'अनुपालन और MRV';

  @override
  String get navSectionComplianceDesc => 'रिपोर्ट और प्रमाण निर्यात';

  @override
  String get navSectionCarbon => 'कार्बन और क्रेडिट';

  @override
  String get navSectionTools => 'उपकरण';

  @override
  String get navSectionReports => 'रिपोर्ट और प्रमाण';

  @override
  String get navSectionReportsDesc => 'निर्यात, कार्बन और AI सहायक';

  @override
  String get navSectionAccount => 'खाता';

  @override
  String get navFieldQueue => 'फील्ड कतार और सिंक';

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
  String addTreeValidationMinPhotos(int min) {
    return 'आगे बढ़ने से पहले कम से कम $min फ़ोटो जोड़ें।';
  }

  @override
  String get addTreeValidationSchemeProject =>
      'सरकारी और ESG कार्यक्रमों के लिए रोपण परियोजना आवश्यक है। परियोजना खोलकर वहाँ से पेड़ पंजीकृत करें।';

  @override
  String get addTreeSchemeProjectTitle => 'योजना रोपण के लिए परियोजना आवश्यक';

  @override
  String get addTreeSchemeProjectBody =>
      'NHAI, CAMPA, नगर वन आदि केंद्रीय योजनाएँ रोपण परियोजना पर सेट होती हैं। पहले परियोजना बनाएँ या खोलें, फिर उसी से पेड़ पंजीकृत करें।';

  @override
  String get addTreeCreateProject => 'रोपण परियोजना बनाएँ';

  @override
  String get addTreeOpenProjects => 'परियोजनाएँ खोलें';

  @override
  String get addTreeLocatingGps => 'स्थान खोज रहे हैं…';

  @override
  String get addTreeRefreshGps => 'GPS ताज़ा करें';

  @override
  String get addTreeGpsCaptured => 'GPS सहेजा गया';

  @override
  String get addTreeGpsNextHint =>
      'GPS सहेजा गया। फ़ोटो के लिए आगे टैप करें, या नए बिंदु पर Refresh करें।';

  @override
  String addTreeGpsAccuracyWarning(int meters) {
    return 'GPS सटीकता कम है (±$meters m)। खुले आसमान में बाहर जाएँ और Refresh करें।';
  }

  @override
  String get addTreeOpenLocationSettings => 'ऐप सेटिंग खोलें';

  @override
  String addTreePhotosNextHint(int target) {
    return 'कम से कम $target फ़ोटो जोड़ें, फिर समीक्षा के लिए आगे टैप करें।';
  }

  @override
  String get setupStepSchemeRefs => 'योजना संदर्भ';

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
  String get openPlayStore => 'Google Play खोलें';

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
  String get reportTypeEsg => 'ESG प्रकटीकरण';

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

  @override
  String get setupStepTreeDefaults => 'पेड़ पंजीकरण डिफ़ॉल्ट';

  @override
  String get setupStepPlantingStandard => 'रोपण मानक';

  @override
  String get setupStepWorkAreas => 'मानचित्र पर कार्य क्षेत्र';

  @override
  String get addTreeSetupBlockedExplain =>
      'इस परियोजना के लिए वेब ऐप पर एक बार की सेटिंग चाहिए। मोबाइल पर केवल GPS, फ़ोटो और प्रजाति दर्ज करें — permit या legal फ़ील्ड दोबारा नहीं।';

  @override
  String get openProjectSetupWeb => 'वेब पर सेटअप पूरा करें';

  @override
  String get setupDefaultsSaved => 'Permit, site zone और agency सहेजे';

  @override
  String get setupStandardAttached => 'अनुपालन मानक जुड़ा';

  @override
  String get setupNoStandard => 'कोई रोपण मानक नहीं';

  @override
  String setupWorkAreasCount(int count) {
    return '$count क्षेत्र परिभाषित';
  }

  @override
  String get setupDrawWorkArea => 'कम से कम एक बहुभुज या कॉरिडोर बनाएँ';

  @override
  String setupMissingFields(String fields) {
    return 'अनुपस्थित: $fields';
  }

  @override
  String get fieldOpsQuickActions => 'त्वरित कार्य';

  @override
  String get viewAllProjects => 'सभी परियोजनाएँ देखें';

  @override
  String get viewAll => 'सभी देखें';

  @override
  String get noProjectsAssigned => 'अभी कोई परियोजना असाइन नहीं।';

  @override
  String get registerTreeInField => 'पेड़ पंजीकृत करें';

  @override
  String get navSyncQueue => 'सिंक कतार';

  @override
  String get auditWorkspaceTitle => 'एस्टेट वॉच ऑडिट';

  @override
  String get auditWorkspaceSubtitle =>
      'क्षेत्र सत्यापन, प्रमाणन और सिंक स्थिति';

  @override
  String get auditWorkspaceNoAccess =>
      'आपके पास एस्टेट वॉच ऑडिट टूल की पहुँच नहीं है।';

  @override
  String get auditEngagements => 'एंगेजमेंट';

  @override
  String get auditPlotsDue => 'प्लॉट बाकी';

  @override
  String get auditInField => 'क्षेत्र में';

  @override
  String get auditExportReady => 'निर्यात तैयार';

  @override
  String get auditAttested => 'प्रमाणित';

  @override
  String get auditNearestAction => 'निकटतम कार्य';

  @override
  String auditPlotsDueTitle(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count प्लॉट पर विज़िट बाकी',
      one: '1 प्लॉट पर विज़िट बाकी',
    );
    return '$_temp0';
  }

  @override
  String get auditPlotsDueSubtitle =>
      'निर्धारित प्लॉट पर GPS, फ़ोटो और पेड़ गिनती दर्ज करें';

  @override
  String get auditOpenPlots => 'प्लॉट खोलें';

  @override
  String get auditAttestationAction => 'प्रमाणन';

  @override
  String get auditOpenAttestation => 'समीक्षा और हस्ताक्षर';

  @override
  String get auditQuickLinks => 'त्वरित लिंक';

  @override
  String get auditPlotVisits => 'प्लॉट विज़िट';

  @override
  String get auditPlotNavigate => 'नेविगेट';

  @override
  String get auditPlotStartVisit => 'विज़िट शुरू करें';

  @override
  String auditPlotsWaiting(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count प्लॉट सत्यापन के लिए बाकी',
      one: '1 प्लॉट सत्यापन के लिए बाकी',
    );
    return '$_temp0';
  }

  @override
  String get auditPlotsAllVisitedShort =>
      'वर्तमान स्कोप के सभी निर्धारित प्लॉट देखे गए।';

  @override
  String get auditPlotsAllVisited => 'वर्तमान स्कोप के सभी प्लॉट देखे गए';

  @override
  String get auditAttestationTitle => 'प्रमाणन';

  @override
  String get auditAttestationMobileSubtitle =>
      'विसंगतियों की समीक्षा करें और निर्यात बंडल पर हस्ताक्षर करें';

  @override
  String get auditAttestationUnavailable =>
      'अभी कोई एंगेजमेंट प्रमाणन के लिए तैयार नहीं है।';

  @override
  String get auditSyncQueueHint =>
      'विफल ऑडिट विज़िट और ऑफ़लाइन अपलोड पुनः प्रयास करें';

  @override
  String get auditProjectsTitle => 'एस्टेट परियोजनाएँ';

  @override
  String get auditNoEstateProjects => 'कोई एस्टेट मॉनिटरिंग परियोजना नहीं';

  @override
  String get auditNoEstateProjectsHint =>
      'एस्टेट मॉनिटरिंग परियोजनाएँ असाइन होने पर यहाँ दिखेंगी।';

  @override
  String get auditAttestationLocked => 'प्रमाणन लॉक';

  @override
  String get auditAttestationExportRequired =>
      'मोबाइल हस्ताक्षर से पहले वेब पर निर्यात तैयारी पूरी करें।';

  @override
  String get auditAnomalyReviews => 'विसंगति समीक्षा';

  @override
  String get auditNoAnomalies => 'कोई विसंगति समीक्षा की प्रतीक्षा में नहीं।';

  @override
  String get auditReviewAnomaly => 'समीक्षा';

  @override
  String get auditReviewSaved => 'विसंगति समीक्षा सहेजी';

  @override
  String get auditReviewRationaleRequired =>
      'इस समीक्षा के लिए कारण दर्ज करें।';

  @override
  String get auditDispositionUphold => 'पुष्टि';

  @override
  String get auditDispositionOverturn => 'रद्द';

  @override
  String get auditDispositionDefer => 'स्थगित';

  @override
  String get auditLeadSignOff => 'मुख्य हस्ताक्षर';

  @override
  String get auditVerdictLabel => 'निर्णय';

  @override
  String get auditVerdictApproved => 'स्वीकृत';

  @override
  String get auditVerdictConditional => 'सशर्त';

  @override
  String get auditVerdictRejected => 'अस्वीकृत';

  @override
  String get auditSignSummaryLabel => 'प्रमाणन सार';

  @override
  String get auditSignSummaryRequired => 'प्रमाणन सार दर्ज करें।';

  @override
  String get auditSignNotesLabel => 'नोट्स (वैकल्पिक)';

  @override
  String get auditSignAttestation => 'प्रमाणन पर हस्ताक्षर';

  @override
  String get auditSignSaved => 'प्रमाणन हस्ताक्षरित';

  @override
  String get auditCosignTitle => 'सह-हस्ताक्षर';

  @override
  String get auditCosignNotesLabel => 'सह-हस्ताक्षर नोट्स (वैकल्पिक)';

  @override
  String get auditCosignAttestation => 'सह-हस्ताक्षर करें';

  @override
  String get auditCosignSaved => 'सह-हस्ताक्षर दर्ज';

  @override
  String auditSignaturesTitle(int count, int required) {
    return '$count में से $required हस्ताक्षर';
  }

  @override
  String auditPendingCosign(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count सह-हस्ताक्षर बाकी',
      one: '1 सह-हस्ताक्षर बाकी',
    );
    return '$_temp0';
  }

  @override
  String auditSignedVerdict(String verdict) {
    return 'हस्ताक्षरित: $verdict';
  }

  @override
  String get auditCreateVerifyLink => 'सार्वजनिक सत्यापन लिंक बनाएँ';

  @override
  String get auditCopyVerifyLink => 'लिंक कॉपी करें';

  @override
  String get auditOpenVerifyLink => 'खोलें';

  @override
  String get auditVerifyLinkCopied => 'सत्यापन लिंक कॉपी हुआ';

  @override
  String get auditSyncAuditVisits => 'ऑडिट प्लॉट विज़िट';

  @override
  String get auditSyncRetryFailed => 'विफल विज़िट पुनः प्रयास';

  @override
  String get auditSyncOpenWorkspace => 'एस्टेट वॉच खोलें';

  @override
  String get auditSyncEmptyHint =>
      'फ़ील्ड या एस्टेट वॉच ऑडिट से प्लॉट विज़िट कैप्चर करें';

  @override
  String get dashboardAlertsSection => 'अलर्ट';

  @override
  String get dashboardNoUrgentAlerts => 'कोई तत्काल आइटम नहीं';

  @override
  String get dashboardAlertsClear => 'फ़ील्ड अलर्ट अभी साफ़ हैं';

  @override
  String get pendingSyncBannerSyncing => 'ऑफ़लाइन डेटा सिंक हो रहा है…';

  @override
  String pendingSyncBannerWaiting(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count आइटम ऑनलाइन होने पर सिंक की प्रतीक्षा में',
      one: '1 आइटम ऑनलाइन होने पर सिंक की प्रतीक्षा में',
    );
    return '$_temp0';
  }

  @override
  String get syncNow => 'अभी सिंक करें';

  @override
  String get syncQueueAllSynced => 'सब सिंक हो गया';

  @override
  String syncQueuePendingCount(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count आइटम लंबित',
      one: '1 आइटम लंबित',
    );
    return '$_temp0';
  }

  @override
  String syncQueueBreakdown(int trees, int survival, int audit, int bio) {
    return '$trees पेड़ · $survival सर्वाइवल · $audit ऑडिट · $bio बायो';
  }

  @override
  String get fieldAlertsTitle => 'फ़ील्ड अलर्ट';

  @override
  String get addTreeWizardSiteSpecies => 'साइट और प्रजाति';

  @override
  String get addTreeWizardGpsPlacement => 'GPS और स्थान';

  @override
  String get addTreeWizardPhotosSubmit => 'फ़ोटो और सबमिट';

  @override
  String get viewSyncQueue => 'सिंक कतार देखें';

  @override
  String get monitoringBioLoadError => 'बायोअकॉस्टिक सारांश उपलब्ध नहीं';

  @override
  String get addTreeWizardContext => 'प्रोजेक्ट और कार्य क्षेत्र';

  @override
  String get addTreeWizardPhotos => 'फ़ोटो';

  @override
  String get addTreeWizardReview => 'समीक्षा और सबमिट';

  @override
  String get fieldNearbyTreesSorted =>
      'आपके वर्तमान स्थान से दूरी के अनुसार क्रमबद्ध';

  @override
  String dashboardTreesRegistered(int count) {
    return '$count पेड़ पंजीकृत';
  }

  @override
  String get segmentNutriGarden => 'न्यूट्री-गार्डन / पोषण वाटिका';

  @override
  String get schemePoshanVatika => 'अमृत पोषण वाटिका';

  @override
  String get schemeApvSiteId => 'APV साइट आईडी';

  @override
  String get schemeGramPanchayat => 'ग्राम पंचायत';

  @override
  String get schemeSiteAreaHa => 'साइट क्षेत्र (हे.)';

  @override
  String get syncQueueSyncing => 'सिंक हो रहा है…';

  @override
  String syncQueueSyncedCount(int count) {
    return '$count आइटम सिंक हुए';
  }

  @override
  String get syncQueueDeleteConfirmBody =>
      'यह ऑफ़लाइन आइटम आपके डिवाइस से हटा देगा। इसे पूर्ववत नहीं किया जा सकता।';

  @override
  String get deleteLabel => 'हटाएँ';

  @override
  String get syncQueueItemRemoved => 'आइटम हटाया गया';

  @override
  String get syncQueueTreeRegistration => 'पेड़ पंजीकरण';

  @override
  String syncQueueStatusLine(String status) {
    return 'स्थिति: $status';
  }

  @override
  String syncQueuePhotosLine(int count) {
    return 'फ़ोटो: $count';
  }

  @override
  String syncQueueGpsLine(String lat, String lon) {
    return 'GPS: $lat, $lon';
  }

  @override
  String syncQueueQueuedLine(String time) {
    return 'कतार में: $time';
  }

  @override
  String get syncQueueRetryUpload => 'अपलोड पुनः प्रयास';

  @override
  String get syncQueueDeleteFromQueue => 'कतार से हटाएँ';

  @override
  String get syncQueueDeleteTreeTitle => 'पेड़ पंजीकरण हटाएँ?';

  @override
  String get syncQueueBioRecording => 'जैव ध्वनि रिकॉर्डिंग';

  @override
  String syncQueueDurationLine(String seconds) {
    return 'अवधि: ${seconds}s';
  }

  @override
  String get syncQueueDeleteRecordingTitle => 'रिकॉर्डिंग हटाएँ?';

  @override
  String get syncQueueAuditPlotVisit => 'ऑडिट प्लॉट विज़िट';

  @override
  String syncQueuePresenceLine(String value) {
    return 'उपस्थिति: $value';
  }

  @override
  String get syncQueueDeleteAuditVisitTitle => 'ऑडिट विज़िट हटाएँ?';

  @override
  String get syncQueueSurvivalSurveyTitle => 'अस्तित्व सर्वे';

  @override
  String syncQueueTreeLine(String id) {
    return 'पेड़: $id';
  }

  @override
  String syncQueueSurvivalStatusLine(String status) {
    return 'स्थिति: $status';
  }

  @override
  String syncQueueQueueLine(String status) {
    return 'कतार: $status';
  }

  @override
  String get syncQueueDeleteSurvivalTitle => 'अस्तित्व सर्वे हटाएँ?';

  @override
  String syncQueueRecordingMeta(String seconds) {
    return '${seconds}s रिकॉर्डिंग';
  }

  @override
  String syncQueuePhotosMeta(int count, String status) {
    return '$count फ़ोटो · $status';
  }

  @override
  String get plotFallback => 'प्लॉट';

  @override
  String get surveyFallback => 'सर्वे';

  @override
  String get visitFallback => 'विज़िट';

  @override
  String get evidenceTitle => 'प्रमाण और MRV';

  @override
  String get evidenceMrvShareText => 'MRV अनुपालन निर्यात';

  @override
  String get evidenceMrvReady => 'MRV निर्यात साझा करने के लिए तैयार';

  @override
  String get evidenceBundleShareText => 'प्रमाण बंडल';

  @override
  String get evidenceBundleReady => 'प्रमाण बंडल साझा करने के लिए तैयार';

  @override
  String get evidenceProjectScope => 'परियोजना दायरा';

  @override
  String get evidenceNoProjects => 'कोई परियोजना उपलब्ध नहीं';

  @override
  String get evidenceSelectProject => 'परियोजना चुनें';

  @override
  String get evidencePortfolioAll => 'पोर्टफोलियो (सभी)';

  @override
  String get evidencePipeline => 'प्रमाण पाइपलाइन';

  @override
  String get evidenceVerified => 'सत्यापित';

  @override
  String get evidencePending => 'लंबित';

  @override
  String get evidenceGaps => 'अंतराल';

  @override
  String get evidenceGapsHeader => 'ध्यान देने योग्य अंतराल';

  @override
  String get evidenceNoGaps => 'कोई प्रमाण अंतराल नहीं';

  @override
  String get evidenceNoGapsSub => 'पोर्टफोलियो प्रमाण अद्यतन है';

  @override
  String get evidenceExports => 'निर्यात';

  @override
  String get evidenceDownloadMrvPdf => 'MRV पैक डाउनलोड (PDF)';

  @override
  String get evidenceDownloadMrvExcel => 'MRV पैक डाउनलोड (Excel)';

  @override
  String get evidenceDownloadBundle => 'प्रमाण बंडल डाउनलोड (ZIP)';

  @override
  String get evidenceReportsExports => 'रिपोर्ट और निर्यात';

  @override
  String get evidenceGapSurvivalDue => 'अस्तित्व सर्वे प्रमाण बकाया';

  @override
  String get evidenceGapViolationsOpen => 'अनुपालन उल्लंघन खुले';

  @override
  String get evidenceGapIntegrityBlocked => 'अखंडता निगरानी गेट अवरुद्ध';

  @override
  String get evidenceGapCreditTransitions => 'क्रेडिट संक्रमण';

  @override
  String get evidenceGapFieldOps => 'फील्ड कार्य';

  @override
  String evidenceGapTreesCount(String count) {
    return '$count पेड़';
  }

  @override
  String evidenceGapOpenCount(String count) {
    return '$count खुले';
  }

  @override
  String get treeRegistryTitle => 'पेड़ पंजी';

  @override
  String get filtersTitle => 'फ़िल्टर';

  @override
  String get filterAll => 'सभी';

  @override
  String get clearFilters => 'फ़िल्टर साफ़ करें';

  @override
  String get treeRegistrySearchHint => 'ID, प्रजाति, क्षेत्र खोजें…';

  @override
  String get sortRecent => 'हाल का';

  @override
  String get sortTreeId => 'पेड़ ID';

  @override
  String get treesCountSuffix => 'पेड़';

  @override
  String get registryCategoryAttention => 'ध्यान';

  @override
  String get registryCategoryMissingEvidence => 'प्रमाण अनुपस्थित';

  @override
  String get registryCategoryUnverified => 'असत्यापित';

  @override
  String get registryCategoryHealthy => 'स्वस्थ';

  @override
  String registryOnPageTotal(int onPage, int total) {
    return 'पृष्ठ पर $onPage · कुल $total';
  }

  @override
  String registryPageOf(int current, int pages) {
    return 'पृष्ठ $current / $pages';
  }

  @override
  String get registryPrev => '← पिछला';

  @override
  String get registryNext => 'अगला →';

  @override
  String get registryNoMatch => 'कोई पेड़ मेल नहीं';

  @override
  String get registryNoMatchSub => 'दूसरा फ़िल्टर या खोज शब्द आज़माएँ';

  @override
  String get registryCachedList => 'कैश की गई पेड़ सूची दिखाई जा रही है';

  @override
  String registryCachedListFrom(String time) {
    return '$time से कैश की गई पेड़ सूची';
  }

  @override
  String get statusUnverified => 'असत्यापित';

  @override
  String get projectCreditLedger => 'क्रेडिट खाता';

  @override
  String get projectSetupTitle => 'परियोजना सेटअप';

  @override
  String get completeSetup => 'सेटअप पूरा करें';

  @override
  String get openSetupOnWeb => 'वेब पर सेटअप खोलें';

  @override
  String get survivalSurveysDue => 'अस्तित्व सर्वे बकाया';

  @override
  String survivalNoSurveysDue(int total, String interval) {
    return 'कोई अस्तित्व सर्वे बकाया नहीं ($total पेड़, $interval दिन अंतराल)';
  }

  @override
  String survivalTreesNeedRegeotag(int due, int total, String interval) {
    return '$total में से $due पेड़ों को पुनः जियो-टैग चाहिए ($interval दिन अंतराल)';
  }

  @override
  String treeIdLabel(String id) {
    return 'पेड़ $id';
  }

  @override
  String moreCount(int count) {
    return '+ $count और';
  }

  @override
  String get integrityMonitoringGate => 'अखंडता निगरानी गेट';

  @override
  String get integrityGatePassed => 'क्रेडिट संक्रमण के लिए निगरानी गेट पास।';

  @override
  String get integrityGateBlocked =>
      'क्रेडिट संक्रमण के लिए निगरानी गेट अवरुद्ध।';

  @override
  String integrityEligibleAudit(
    String eligible,
    String total,
    String auditReady,
  ) {
    return 'योग्य $eligible/$total · ऑडिट तैयार $auditReady/$total';
  }

  @override
  String treesWithBlockingIssues(int count) {
    return '$count पेड़(ों) में अवरोधक समस्याएँ';
  }

  @override
  String get satelliteNoScan => 'उपग्रह: अभी कोई स्कैन नहीं';

  @override
  String get satelliteScanned => 'उपग्रह: स्कैन किया';

  @override
  String satelliteStale(int days) {
    return 'उपग्रह: पुराना ($days दिन पहले)';
  }

  @override
  String get satelliteScannedToday => 'उपग्रह: आज स्कैन किया';

  @override
  String satelliteDaysAgo(int days) {
    return 'उपग्रह: $days दिन पहले';
  }

  @override
  String treesPerHa(String count) {
    return '$count पेड़/हे.';
  }

  @override
  String workAreaBlock(String code) {
    return 'ब्लॉक $code';
  }

  @override
  String get treeDetailOverview => 'अवलोकन';

  @override
  String get treeDetailField => 'फील्ड';

  @override
  String get treeDetailIntelligence => 'बुद्धिमत्ता';

  @override
  String get treeDetailMap => 'मानचित्र';

  @override
  String get treeDetailInspect => 'निरीक्षण';

  @override
  String get treeDetailEvidence => 'प्रमाण';

  @override
  String get treeDetailMonitor => 'निगरानी';

  @override
  String get treeDetailVerified => 'सत्यापित';

  @override
  String get treeDetailFieldLocation => 'फील्ड स्थान';

  @override
  String get treeDetailFollowUpPhotoAdded => 'फॉलो-अप फ़ोटो जोड़ी';

  @override
  String get treeDetailCachedDetail =>
      'कैश किया पेड़ विवरण — रीफ़्रेश के लिए कनेक्ट करें';

  @override
  String get treeDetailUploadingPhoto => 'फ़ोटो अपलोड…';

  @override
  String get treeDetailAddFollowUpPhoto => 'फॉलो-अप फ़ोटो जोड़ें';

  @override
  String get treeDetailPhotoGallery => 'फ़ोटो गैलरी';

  @override
  String get treeDetailNoPhotos => 'अभी कोई फ़ोटो नहीं';

  @override
  String get treeDetailNoPhotosSub =>
      'अवलोकन या अस्तित्व सर्वे से फॉलो-अप फ़ोटो जोड़ें';

  @override
  String get treeDetailMeasurementHistory => 'माप इतिहास';

  @override
  String get treeDetailNoMeasurements => 'कोई माप दर्ज नहीं';

  @override
  String get treeDetailNoMeasurementsSub =>
      'अस्तित्व सर्वे और फील्ड कैप्चर यहाँ दिखेंगे';

  @override
  String get treeDetailAiHistory => 'AI विश्लेषण इतिहास';

  @override
  String get treeDetailNoAiAnalyses => 'अभी कोई AI विश्लेषण नहीं';

  @override
  String get treeDetailNoAiAnalysesSub => 'अवलोकन टैब से AI विश्लेषण चलाएँ';

  @override
  String get treeDetailSarFusion => 'SAR अखंडता फ्यूजन';

  @override
  String get treeDetailGroundStatus => 'भूमि स्थिति';

  @override
  String get treeDetailIntegrityScoreLabel => 'अखंडता स्कोर';

  @override
  String get treeDetailAuditBlockers => 'ऑडिट-तैयार अवरोधक';

  @override
  String get treeDetailTimeline => 'समयरेखा';

  @override
  String treeDetailRegistered(String date) {
    return 'पंजीकृत · $date';
  }

  @override
  String get treeDetailFieldCapture => 'फील्ड कैप्चर';

  @override
  String get treeDetailSatelliteVerified => 'उपग्रह सत्यापित';

  @override
  String get treeDetailRemoteSensingPassed => 'रिमोट सेंसिंग जाँच पास';

  @override
  String treeDetailNdviSignal(String level) {
    return 'NDVI संकेत · $level';
  }

  @override
  String get treeDetailMeasurement => 'माप';

  @override
  String get treeDetailCanopy => 'छत्र';

  @override
  String get treeDetailAnalysis => 'विश्लेषण';

  @override
  String treeDetailFusionScore(String score) {
    return 'फ्यूजन स्कोर $score';
  }

  @override
  String treeDetailCarbonSummary(String kg, String dbh) {
    return 'कार्बन $kg kg · DBH $dbh cm';
  }

  @override
  String treeDetailHealthLine(String health) {
    return 'स्वास्थ्य $health';
  }

  @override
  String get auditVisitQueued => 'ऑनलाइन होने पर सिंक के लिए विज़िट कतार में';

  @override
  String get auditVisitSaved => 'ऑडिट प्लॉट विज़िट सहेजी';

  @override
  String auditVisitTitle(String code) {
    return 'विज़िट $code';
  }

  @override
  String get auditCapturingGps => 'GPS लिया जा रहा है…';

  @override
  String get auditTreePresence => 'पेड़ उपस्थिति';

  @override
  String get auditTreesPresent => 'पेड़ मौजूद';

  @override
  String get auditTreesAbsent => 'कोई पेड़ नहीं / खुली ज़मीन';

  @override
  String get auditTreesSparse => 'विरल / बिखरे';

  @override
  String get auditCannotAssess => 'मूल्यांकन नहीं हो सका';

  @override
  String get auditTreesObserved => 'देखे गए पेड़';

  @override
  String get auditTreesAlive => 'जीवित पेड़';

  @override
  String get auditOutcome => 'परिणाम';

  @override
  String get auditOutcomeInconclusive => 'अनिर्णायक';

  @override
  String get auditOutcomeSupported => 'समर्थित';

  @override
  String get auditOutcomeUnsupported => 'असमर्थित';

  @override
  String get auditFieldNotes => 'फील्ड नोट्स';

  @override
  String get auditUploadingPhoto => 'फ़ोटो अपलोड…';

  @override
  String auditAddFieldPhoto(int current) {
    return 'फील्ड फ़ोटो जोड़ें ($current/5)';
  }

  @override
  String get auditSaveVisit => 'विज़िट सहेजें';

  @override
  String get auditGpsRequired => 'विज़िट सहेजने से पहले GPS लें।';

  @override
  String get auditPhotoRequired => 'कम से कम एक फील्ड फ़ोटो जोड़ें।';

  @override
  String auditRiskSuffix(String risk) {
    return '$risk जोखिम';
  }

  @override
  String get bioSessionDetailTitle => 'सत्र विवरण';

  @override
  String get bioDetectionTierAccepted => 'स्वीकृत';

  @override
  String get bioDetectionTierProbable => 'संभावित';

  @override
  String get bioDetectionTierReview => 'समीक्षा आवश्यक';

  @override
  String get bioFieldSite => 'फील्ड साइट';

  @override
  String get bioDetectedSpecies => 'पहचानी गई प्रजातियाँ';

  @override
  String get bioDetectionsPending =>
      'विश्लेषण पूरा होने पर प्रजाति पहचान दिखेगी।';

  @override
  String get bioNoDetections => 'अभी कोई प्रजाति पहचान नहीं।';

  @override
  String get bioViewBiodiversityFusion => 'जैव विविधता फ्यूजन देखें';

  @override
  String get bioAddToEvidence => 'प्रमाण बंडल में जोड़ें';

  @override
  String get viewOnMap => 'मानचित्र पर देखें';

  @override
  String bioConfidenceScore(String score) {
    return 'विश्वास $score/100';
  }

  @override
  String bioAcceptedCount(String count) {
    return 'स्वीकृत $count';
  }

  @override
  String bioShannonLine(String value) {
    return 'शैनन $value';
  }

  @override
  String bioCallsCount(String count) {
    return '$count कॉल';
  }

  @override
  String get biodiversityTitle => 'जैव विविधता';

  @override
  String get bioTaxa => 'टैक्सा';

  @override
  String get bioShannonLabel => 'शैनन';

  @override
  String get bioConfidenceLabel => 'विश्वास';

  @override
  String bioConfidenceHint(int count) {
    return '$count विश्लेषित रिकॉर्डिंग से जैव विविधता विश्वास (प्रमाण गुणवत्ता, आवास स्वास्थ्य नहीं)';
  }

  @override
  String bioRegionalSpeciesNear(String lat, String lon) {
    return '$lat, $lon के पास क्षेत्रीय प्रजातियाँ';
  }

  @override
  String get bioRegionalSpeciesGbif => 'क्षेत्रीय प्रजातियाँ (GBIF)';

  @override
  String get bioHotspotsByWorkArea => 'कार्य क्षेत्र के हॉटस्पॉट';

  @override
  String get bioNoWorkAreas => 'कोई कार्य क्षेत्र नहीं';

  @override
  String get bioNoWorkAreasMapped => 'कोई कार्य क्षेत्र मैप नहीं';

  @override
  String bioConfidenceMeta(int score) {
    return 'विश्वास $score/100';
  }

  @override
  String get bioStrong => 'मजबूत';

  @override
  String get bioWatch => 'निगरानी';

  @override
  String get bioAcousticDetail => 'जैव ध्वनि विवरण';

  @override
  String get bioRunSurvey => 'जैव ध्वनि सर्वे चलाएँ';

  @override
  String get bioNoLocationSpecies => 'प्रजाति सूची के लिए स्थान नहीं';

  @override
  String get bioNoLocationSpeciesSub =>
      'क्षेत्रीय जीवों के लिए कार्य क्षेत्र सीमा या GPS वाला पेड़ जोड़ें।';

  @override
  String get bioNoRegionalSpecies => 'कोई क्षेत्रीय प्रजाति नहीं मिली';

  @override
  String get bioNoRegionalSpeciesSub =>
      'GBIF ने इस साइट के पास कोई घटना नहीं लौटाई।';

  @override
  String get bioViewOnMapMeta => 'मानचित्र पर देखें';

  @override
  String get bioOpen => 'खोलें';

  @override
  String get carbonPortfolioTco2e => 'tCO₂e अनुमानित (पोर्टफोलियो)';

  @override
  String carbonAnnualPace(int pct) {
    return 'वार्षिक अवशोषण गति का $pct%';
  }

  @override
  String carbonTreesInPortfolio(int count) {
    return 'पोर्टफोलियो में $count पेड़';
  }

  @override
  String get carbonByProject => 'परियोजना के अनुसार';

  @override
  String get carbonEnterSpecies => 'प्रजाति का नाम दर्ज करें।';

  @override
  String get carbonEstimateDisclaimer =>
      'प्रजाति और वैकल्पिक माप से CO₂e अनुमान। यह अनुमान है — लाइव फील्ड माप या रजिस्ट्री जारी क्रेडिट नहीं।';

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
    return '±$pct% माप + मॉडल अनिश्चितता';
  }

  @override
  String get carbonHonestyLabel =>
      'ईमानदारी लेबल: अनुमान (मॉडल)। लाइव सेंसर डेटा नहीं।';

  @override
  String get reportReadyToShare => 'रिपोर्ट साझा करने के लिए तैयार';

  @override
  String get reportMisTitle => 'वृक्षारोपण MIS रिपोर्ट';

  @override
  String get reportMisSubtitle =>
      'सरकारी वृक्षारोपण कार्यक्रमों के परिचालन निर्यात';

  @override
  String get reportTypeLabel => 'रिपोर्ट प्रकार';

  @override
  String get reportDownloading => 'डाउनलोड…';

  @override
  String get reportDownloadMis => 'MIS रिपोर्ट डाउनलोड';

  @override
  String reportReadyShareNamed(String name) {
    return '$name साझा करने के लिए तैयार';
  }

  @override
  String get downloadLabel => 'डाउनलोड';

  @override
  String get creditIntegrityFusion => 'अखंडता फ्यूजन';

  @override
  String get creditAuditReady => 'ऑडिट तैयार';

  @override
  String get creditEligible => 'क्रेडिट योग्य';

  @override
  String get creditStatusHistory => 'स्थिति इतिहास';

  @override
  String get creditSerials => 'क्रेडिट सीरियल';

  @override
  String get creditSerialFallback => 'सीरियल';

  @override
  String get viewProject => 'परियोजना देखें';

  @override
  String get projectLedgers => 'परियोजना खाते';

  @override
  String get alertRecommendedAction => 'अनुशंसित कार्रवाई';

  @override
  String get alertMarkReviewed => 'समीक्षित चिह्नित करें';

  @override
  String get alertViewAffectedTree => 'प्रभावित पेड़ देखें →';

  @override
  String get createProjectTitle => 'परियोजना बनाएँ';

  @override
  String get createProjectSubtitle =>
      'पर्यवेक्षक रोपण परियोजना शुरू कर सकते हैं और वेब पर सेटअप पूरा करें।';

  @override
  String get createProjectNameLabel => 'परियोजना नाम';

  @override
  String get createProjectDescriptionLabel => 'विवरण (वैकल्पिक)';

  @override
  String get createProjectSegmentLabel => 'खंड';

  @override
  String get createProjectNameRequired => 'परियोजना नाम आवश्यक है';

  @override
  String get newProject => 'नई परियोजना';

  @override
  String get survivalMissingUprooted => 'अनुपस्थित / उखाड़ा';

  @override
  String get survivalTapeMeasure => 'टेप माप (1.3 m पर DBH)';

  @override
  String get survivalClinometer => 'क्लिनोमीटर (ऊँचाई)';

  @override
  String get survivalPhotoAttached => 'सर्वे फ़ोटो जुड़ी';

  @override
  String get survivalCapturingPhoto => 'फ़ोटो ली जा रही है…';

  @override
  String get survivalAddPhoto => 'सर्वे फ़ोटो जोड़ें (कैमरा)';

  @override
  String get survivalRemarksHint => 'स्थिति, प्रतिस्थापन नोट्स…';

  @override
  String get openInMaps => 'मानचित्र में खोलें';

  @override
  String get myLocation => 'मेरा स्थान';

  @override
  String get closeLabel => 'बंद करें';

  @override
  String get prepareLabel => 'तैयारी';

  @override
  String get schemeProgramme => 'योजना कार्यक्रम';

  @override
  String get governmentReferences => 'सरकारी संदर्भ';

  @override
  String get schemeFallback => 'योजना';

  @override
  String get onboardingVerifyOrg =>
      '• हमारी टीम आपके संगठन विवरण सत्यापित करती है';

  @override
  String get onboardingApprovalEmail => '• आपको स्वीकृति ईमेल मिलेगा';

  @override
  String get onboardingSignInDashboard =>
      '• ऐप खोलें और डैशबोर्ड के लिए साइन इन करें';

  @override
  String get onboardingPendingSubtitle =>
      'आपकी संगठन प्रोफ़ाइल समीक्षा में है। स्वीकृति पर ईमेल करेंगे — आमतौर पर 1–2 कार्य दिवस।';

  @override
  String get blockerInsufficientPhotos => 'कम से कम 2 फ़ोटो चाहिए';

  @override
  String get blockerPhotoSpanTooShort => 'फ़ोटो 30+ दिनों में होनी चाहिए';

  @override
  String get blockerSatelliteScanStale => 'उपग्रह स्कैन 90 दिन से पुराना';

  @override
  String get blockerFusionBelowAudit => 'फ्यूजन स्कोर 75 से कम';

  @override
  String get blockerMissingExif => 'कैमरा EXIF अनुपस्थित';

  @override
  String get blockerMissingPhotoGps => 'फ़ोटो में GPS नहीं';

  @override
  String get blockerMissingPhotoTimestamp => 'फ़ोटो में समय मुहर नहीं';

  @override
  String get blockerPhotoTimestampStale => 'फ़ोटो 7 दिन से पुरानी';

  @override
  String get blockerRegeotagMismatch => 'पुनः जियो-टैग असमान';

  @override
  String get blockerDuplicatePhoto => 'डुप्लिकेट फ़ोटो';

  @override
  String get blockerDuplicateCoordinate => 'डुप्लिकेट निर्देशांक';

  @override
  String get blockerAiConfidenceLow => 'कम AI विश्वास';

  @override
  String get blockerSarIntegrityBelow => 'SAR वन अखंडता न्यूनतम से कम';

  @override
  String get blockerOpticalScanStale => 'कार्य क्षेत्र ऑप्टिकल स्कैन पुराना';

  @override
  String get blockerFusionBelowMinimum => 'फ्यूजन स्कोर न्यूनतम से कम';

  @override
  String get blockerNotCreditEligible => 'क्रेडिट के लिए योग्य नहीं';

  @override
  String get remediationAddFollowUpPhoto =>
      'पेड़ विवरण पृष्ठ से फॉलो-अप फील्ड फ़ोटो जोड़ें।';

  @override
  String get remediationRunSurvivalSurvey =>
      'GPS और वैकल्पिक सर्वे फ़ोटो के साथ अस्तित्व सर्वे चलाएँ।';

  @override
  String get remediationTriggerSatellite =>
      'पेड़ विवरण से उपग्रह स्वास्थ्य स्कैन ट्रिगर करें।';

  @override
  String get remediationReviewMonitoring =>
      'इस परियोजना के लिए निगरानी कवरेज समीक्षा करें।';

  @override
  String get monitoringNeedsDecision => 'निर्णय चाहिए';

  @override
  String get monitoringNoUrgentAlerts => 'कोई तत्काल अलर्ट नहीं';

  @override
  String get monitoringSignalsStable => 'निगरानी संकेत स्थिर';

  @override
  String get monitoringSitePulse => 'साइट पल्स';

  @override
  String get alertCategoryFire => 'आग';

  @override
  String get alertCategoryFlood => 'बाढ़';

  @override
  String get alertCategoryWeather => 'मौसम';

  @override
  String get alertCategoryPest => 'कीट';

  @override
  String get alertCategorySatellite => 'उपग्रह';

  @override
  String get alertUrgencyActNow => 'अभी कार्रवाई';

  @override
  String get alertUrgencyPrepare => 'तैयारी';

  @override
  String get alertUrgencyMonitor => 'निगरानी';

  @override
  String get healthFilterHealthy => 'स्वस्थ';

  @override
  String get healthFilterStressed => 'तनावग्रस्त';

  @override
  String get healthFilterDead => 'मृत';

  @override
  String get monthJan => 'जन';

  @override
  String get monthFeb => 'फ़र';

  @override
  String get monthMar => 'मार्च';

  @override
  String get monthApr => 'अप्रै';

  @override
  String get monthMay => 'मई';

  @override
  String get monthJun => 'जून';

  @override
  String get monthJul => 'जुल';

  @override
  String get monthAug => 'अग';

  @override
  String get monthSep => 'सित';

  @override
  String get monthOct => 'अक्टू';

  @override
  String get monthNov => 'नव';

  @override
  String get monthDec => 'दिस';

  @override
  String get methodologyTitle => 'कार्यप्रणाली';

  @override
  String get alertUrgencyActToday => 'आज कार्रवाई';

  @override
  String get alertUrgencyThisWeek => 'इस सप्ताह';
}
