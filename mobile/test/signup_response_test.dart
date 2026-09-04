import 'package:flutter_test/flutter_test.dart';

import 'package:byot_mobile/src/api/api_errors.dart';
import 'package:byot_mobile/src/auth/signup_api.dart';

void main() {
  group('parseSignupStartResponse', () {
    test('reads signup_token from map body', () {
      final parsed = parseSignupStartResponse({
        'signup_token': 'abc-123',
        'dev_hint': null,
        'sms_enabled': true,
      });
      expect(parsed.signupToken, 'abc-123');
      expect(parsed.smsEnabled, isTrue);
    });

    test('parses JSON string body', () {
      final parsed = parseSignupStartResponse(
        '{"signup_token":"tok-1","dev_hint":null,"sms_enabled":true}',
      );
      expect(parsed.signupToken, 'tok-1');
    });

    test('throws SignupResponseException when token missing', () {
      expect(
        () => parseSignupStartResponse({'sms_enabled': true}),
        throwsA(isA<SignupResponseException>()),
      );
    });
  });

  group('parseSignupEmailOtpResponse', () {
    test('reads email OTP step fields', () {
      final parsed = parseSignupEmailOtpResponse({
        'status': 'email_otp_sent',
        'dev_hint': null,
        'email_enabled': true,
      });
      expect(parsed.emailEnabled, isTrue);
      expect(parsed.devHint, isNull);
    });

    test('parses JSON string body', () {
      final parsed = parseSignupEmailOtpResponse(
        '{"status":"email_otp_sent","email_enabled":true}',
      );
      expect(parsed.emailEnabled, isTrue);
    });
  });

  group('parseTokenResponse', () {
    test('reads access and refresh tokens', () {
      final parsed = parseTokenResponse({
        'access_token': 'access',
        'refresh_token': 'refresh',
        'token_type': 'Bearer',
        'expires_in': 3600,
      });
      expect(parsed.accessToken, 'access');
      expect(parsed.refreshToken, 'refresh');
    });
  });

  group('apiErrorMessage signup parsing', () {
    test('maps SignupResponseException to friendly copy', () {
      expect(
        apiErrorMessage(
          SignupResponseException('Signup start response is missing "signup_token".'),
        ),
        'Signup start response is missing "signup_token".',
      );
    });
  });
}
