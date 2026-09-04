import 'package:flutter/foundation.dart';

/// Tracks whether the user has a valid session (used by GoRouter redirects).
class SessionController extends ChangeNotifier {
  bool authenticated = false;
  Map<String, dynamic>? user;
  bool _sessionExpiredPending = false;

  bool get sessionExpiredPending => _sessionExpiredPending;

  /// Returns true once if the session ended due to token expiry (not voluntary logout).
  bool consumeSessionExpired() {
    if (!_sessionExpiredPending) return false;
    _sessionExpiredPending = false;
    return true;
  }

  void setAuthenticated(bool value) {
    if (authenticated == value) return;
    authenticated = value;
    notifyListeners();
  }

  void setUser(Map<String, dynamic>? profile) {
    user = profile == null ? null : Map<String, dynamic>.from(profile);
    notifyListeners();
  }

  void signOut({bool sessionExpired = false}) {
    authenticated = false;
    user = null;
    _sessionExpiredPending = sessionExpired;
    notifyListeners();
  }
}

final sessionController = SessionController();
