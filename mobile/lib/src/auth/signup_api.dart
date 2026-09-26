import 'dart:convert';

/// Parsed signup/start payload from the auth API.
class SignupStartResult {
  const SignupStartResult({
    required this.signupToken,
    this.devHint,
    this.smsEnabled = false,
  });

  final String signupToken;
  final String? devHint;
  final bool smsEnabled;
}

/// Parsed token pair from signup/complete, login, etc.
class AuthTokenResult {
  const AuthTokenResult({
    required this.accessToken,
    this.refreshToken,
  });

  final String accessToken;
  final String? refreshToken;
}

/// Thrown when a 2xx auth response body is missing required fields.
class SignupResponseException implements Exception {
  SignupResponseException(this.message);

  final String message;

  @override
  String toString() => message;
}

Map<String, dynamic> decodeApiJsonMap(dynamic data, {required String context}) {
  if (data is Map) {
    return Map<String, dynamic>.from(data);
  }
  if (data is String) {
    final trimmed = data.trim();
    if (trimmed.isEmpty) {
      throw SignupResponseException('$context returned an empty response.');
    }
    try {
      final decoded = jsonDecode(trimmed);
      if (decoded is Map) {
        return Map<String, dynamic>.from(decoded);
      }
    } catch (_) {
      throw SignupResponseException('$context returned an unreadable response.');
    }
    throw SignupResponseException('$context returned an unexpected response shape.');
  }
  throw SignupResponseException('$context returned an unexpected response type.');
}

String? _optionalString(dynamic value) {
  if (value == null) return null;
  final text = value.toString().trim();
  return text.isEmpty ? null : text;
}

String _requiredString(Map<String, dynamic> map, String key, {required String context}) {
  final raw = map[key];
  final text = raw?.toString().trim();
  if (text == null || text.isEmpty) {
    throw SignupResponseException('$context response is missing "$key".');
  }
  return text;
}

SignupStartResult parseSignupStartResponse(dynamic data) {
  final map = decodeApiJsonMap(data, context: 'Signup start');
  return SignupStartResult(
    signupToken: _requiredString(map, 'signup_token', context: 'Signup start'),
    devHint: _optionalString(map['dev_hint']),
    smsEnabled: map['sms_enabled'] == true,
  );
}

AuthTokenResult parseTokenResponse(dynamic data) {
  final map = decodeApiJsonMap(data, context: 'Auth token');
  return AuthTokenResult(
    accessToken: _requiredString(map, 'access_token', context: 'Auth token'),
    refreshToken: _optionalString(map['refresh_token']),
  );
}

/// Email OTP step only needs dev hint + enabled flag from SignupStepOut.
class SignupEmailOtpResult {
  const SignupEmailOtpResult({
    this.devHint,
    this.emailEnabled = false,
  });

  final String? devHint;
  final bool emailEnabled;
}

SignupEmailOtpResult parseSignupEmailOtpResponse(dynamic data) {
  final map = decodeApiJsonMap(data, context: 'Signup email OTP');
  return SignupEmailOtpResult(
    devHint: _optionalString(map['dev_hint']),
    emailEnabled: map['email_enabled'] == true,
  );
}
