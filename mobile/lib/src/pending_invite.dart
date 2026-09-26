import 'package:shared_preferences/shared_preferences.dart';

const _pendingInviteKey = 'aranyix_pending_invite';

Future<void> storePendingInviteToken(String token) async {
  final prefs = await SharedPreferences.getInstance();
  await prefs.setString(_pendingInviteKey, token);
}

Future<String?> consumePendingInviteToken() async {
  final prefs = await SharedPreferences.getInstance();
  final token = prefs.getString(_pendingInviteKey);
  if (token != null) {
    await prefs.remove(_pendingInviteKey);
  }
  return token;
}

Future<String?> peekPendingInviteToken() async {
  final prefs = await SharedPreferences.getInstance();
  return prefs.getString(_pendingInviteKey);
}
