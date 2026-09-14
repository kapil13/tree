import 'package:flutter_test/flutter_test.dart';

import 'package:byot_mobile/src/api/api_errors.dart';
import 'package:byot_mobile/src/constants/play_store.dart';
import 'package:dio/dio.dart';

void main() {
  test('isUnauthorizedError detects Dio 401 responses', () {
    final err = DioException(
      requestOptions: RequestOptions(path: '/me'),
      response: Response(
        requestOptions: RequestOptions(path: '/me'),
        statusCode: 401,
      ),
      type: DioExceptionType.badResponse,
    );
    expect(isUnauthorizedError(err), isTrue);
  });

  test('Play Store listing uses Android application id', () {
    expect(kPlayStoreListingUrl, contains('earth.byot.byot_mobile'));
  });
}
