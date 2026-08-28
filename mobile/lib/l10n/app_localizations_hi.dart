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
  String get todayWork => 'आज का कार्य';

  @override
  String get fieldWorkspace => 'फील्ड कार्यक्षेत्र';

  @override
  String get viewFullDashboard => 'पूरा डैशबोर्ड देखें';
}
