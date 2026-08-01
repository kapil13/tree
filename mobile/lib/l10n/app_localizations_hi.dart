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
  String get welcomeSubtitle =>
      'वृक्षारोपण इंटेलिजेंस — फील्ड से ऑडिट-तैयार साक्ष्य तक।';

  @override
  String get signIn => 'साइन इन';

  @override
  String get signUp => 'साइन अप';

  @override
  String get createFreeAccount => 'मुफ़्त खाता बनाएँ';

  @override
  String get alreadyHaveAccount => 'मेरे पास पहले से खाता है';

  @override
  String get welcomeBack => 'वापसी पर स्वागत है';

  @override
  String get signInSubtitle => 'अपने अरणयिक्स खाते में साइन इन करें';

  @override
  String get createAccount => 'खाता बनाएँ';

  @override
  String get forgotPassword => 'पासवर्ड भूल गए?';

  @override
  String get rememberMe => 'मुझे याद रखें';

  @override
  String get continueWithGoogle => 'Google से जारी रखें';

  @override
  String get home => 'होम';

  @override
  String get trees => 'पेड़';

  @override
  String get map => 'मानचित्र';

  @override
  String get alerts => 'अलर्ट';

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
  String get yourJourney => 'आपकी यात्रा';

  @override
  String get journeyCapture => 'कैप्चर';

  @override
  String get journeyMonitor => 'निगरानी';

  @override
  String get journeyReport => 'रिपोर्ट';

  @override
  String get journeyCaptureLine => 'GPS · फ़ोटो · ऑफ़लाइन';

  @override
  String get journeyMonitorLine => 'NDVI · AI अलर्ट';

  @override
  String get journeyReportLine => 'कार्बन · ऑडिट पैक';

  @override
  String get registrationPrograms => 'पंजीकरण कार्यक्रम';

  @override
  String get programsHint =>
      'BYOT पब्लिक हमेशा सक्रिय रहता है। सरकारी, कॉर्पोरेट या NGO कार्यक्रमों के लिए अनुमोदन का अनुरोध करें।';

  @override
  String get programActive => 'सक्रिय';

  @override
  String get programPending => 'समीक्षाधीन';

  @override
  String get programRejected => 'अस्वीकृत';

  @override
  String get programLocked => 'अनुमोदन आवश्यक';

  @override
  String get requestAccess => 'पहुँच अनुरोध';

  @override
  String get withdrawRequest => 'वापस लें';

  @override
  String get requestSubmitted =>
      'पहुँच अनुरोध भेज दिया गया। व्यवस्थापक जल्द समीक्षा करेंगे।';

  @override
  String get requestWithdrawn => 'अनुरोध वापस ले लिया गया।';

  @override
  String get carbonCredits => 'कार्बन क्रेडिट';

  @override
  String get carbonNeedsAnalysis =>
      'कार्बन क्रेडिट अनुमान के लिए पेड़ पर AI विश्लेषण चलाएँ।';

  @override
  String get carbonZeroHint =>
      '0.00 tCO₂e — क्रेडिट जमा करने के लिए पेड़ों का विश्लेषण करें';

  @override
  String get rescanNdvi => 'NDVI पुनः स्कैन';

  @override
  String get rescanningNdvi => 'उपग्रह स्कैन हो रहा है…';

  @override
  String get runSatelliteHealth => 'स्वास्थ्य जाँच';

  @override
  String get runAiAnalysis => 'AI विश्लेषण चलाएँ';

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
  String get screenshotGuard => 'स्क्रीनशॉट रोकें';

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
}
