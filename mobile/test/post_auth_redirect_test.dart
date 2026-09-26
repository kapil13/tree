import 'package:byot_mobile/src/api/api_base_url.dart';
import 'package:byot_mobile/src/auth/post_auth_redirect.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('sanitizePostAuthPath allows internal paths only', () {
    expect(sanitizePostAuthPath('/trees/abc'), '/trees/abc');
    expect(sanitizePostAuthPath('/p/TREE01'), '/p/TREE01');
    expect(sanitizePostAuthPath('https://evil.com'), isNull);
    expect(sanitizePostAuthPath('//evil.com'), isNull);
  });

  test('webAppOriginFromApiBase strips api subdomain', () {
    expect(
      webAppOriginFromApiBase('https://api.aranyix.tech'),
      'https://aranyix.tech',
    );
  });
}
