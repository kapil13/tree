import 'package:flutter_test/flutter_test.dart';

import 'package:byot_mobile/src/auth/google_oauth.dart';

void main() {
  test('parseOAuthCallbackUri extracts tokens from fragment', () {
    final uri = Uri.parse(
      'https://aranyix.tech/auth/callback#access_token=abc&refresh_token=def&expires_in=900',
    );
    final tokens = parseOAuthCallbackUri(uri);
    expect(tokens?['access_token'], 'abc');
    expect(tokens?['refresh_token'], 'def');
  });

  test('parseOAuthCallbackUri returns null without fragment', () {
    final uri = Uri.parse('https://aranyix.tech/auth/callback');
    expect(parseOAuthCallbackUri(uri), isNull);
  });
}
