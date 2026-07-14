import 'package:flutter/foundation.dart';

/// Tracks whether the user has a valid session (used by GoRouter redirects).
class SessionController extends ChangeNotifier {
  bool authenticated = false;

  void setAuthenticated(bool value) {
    if (authenticated == value) return;
    authenticated = value;
    notifyListeners();
  }

  void signOut() => setAuthenticated(false);
}

final sessionController = SessionController();
