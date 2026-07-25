import 'package:flutter/foundation.dart';

/// Tracks whether the user has a valid session (used by GoRouter redirects).
class SessionController extends ChangeNotifier {
  bool authenticated = false;
  Map<String, dynamic>? user;

  void setAuthenticated(bool value) {
    if (authenticated == value) return;
    authenticated = value;
    notifyListeners();
  }

  void setUser(Map<String, dynamic>? profile) {
    user = profile == null ? null : Map<String, dynamic>.from(profile);
    notifyListeners();
  }

  void signOut() {
    authenticated = false;
    user = null;
    notifyListeners();
  }
}

final sessionController = SessionController();
