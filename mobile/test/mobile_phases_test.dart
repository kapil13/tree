import 'package:flutter_test/flutter_test.dart';

import 'package:byot_mobile/src/api/openapi_paths.dart';
import 'package:byot_mobile/src/services/deep_link_service.dart';

void main() {
  test('OpenAPI paths include mobile-critical endpoints', () {
    expect(OpenApiPaths.devicesRegister, '/devices/register');
    expect(OpenApiPaths.treeByCode, '/trees/by-code');
    expect(OpenApiPaths.analyticsEvents, '/devices/analytics/events');
  });

  test('DeepLinkService parses tree public codes', () {
    final uri = Uri.parse('https://aranyix.tech/p/BYOT-ABCD-EFGH');
    expect(DeepLinkService.treePublicCodeFromUri(uri), 'BYOT-ABCD-EFGH');
  });

  test('DeepLinkService parses invite tokens', () {
    final uri = Uri.parse('https://aranyix.tech/login?invite=abc123');
    expect(DeepLinkService.inviteTokenFromUri(uri), 'abc123');
  });
}
