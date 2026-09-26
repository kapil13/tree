import 'package:flutter_test/flutter_test.dart';

import 'package:byot_mobile/src/services/deep_link_service.dart';

void main() {
  test('alertIdFromUri parses /alerts/{id}', () {
    final uri = Uri.parse('https://aranyix.tech/alerts/abc-123');
    expect(DeepLinkService.alertIdFromUri(uri), 'abc-123');
  });

  test('appRouteFromUri maps alert and map links', () {
    expect(
      DeepLinkService.appRouteFromUri(Uri.parse('https://aranyix.tech/alerts/alert-1')),
      '/alerts/alert-1',
    );
    expect(
      DeepLinkService.appRouteFromUri(Uri.parse('https://aranyix.tech/map?fence=fence-1')),
      '/map?fence=fence-1',
    );
    expect(
      DeepLinkService.appRouteFromUri(Uri.parse('aranyix://alerts/alert-2')),
      '/alerts/alert-2',
    );
  });

  test('appRouteFromNotificationData prefers explicit route', () {
    expect(
      DeepLinkService.appRouteFromNotificationData({
        'route': '/monitoring?fence=abc',
      }),
      '/monitoring?fence=abc',
    );
    expect(
      DeepLinkService.appRouteFromNotificationData({'alert_id': 'x'}),
      '/alerts/x',
    );
  });
}
