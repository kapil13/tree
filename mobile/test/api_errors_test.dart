import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:byot_mobile/src/api/api_errors.dart';

void main() {
  group('apiErrorMessage', () {
    test('maps login invalid_credentials to friendly copy', () {
      final err = DioException(
        requestOptions: RequestOptions(path: '/auth/login'),
        response: Response(
          requestOptions: RequestOptions(path: '/auth/login'),
          statusCode: 401,
          data: const {
            'error': {
              'code': 'invalid_credentials',
              'message': 'Invalid credentials',
            },
          },
        ),
        type: DioExceptionType.badResponse,
      );

      expect(apiErrorMessage(err), 'Invalid email or password.');
    });

    test('keeps session expired for refresh failures', () {
      final err = DioException(
        requestOptions: RequestOptions(path: '/auth/me'),
        response: Response(
          requestOptions: RequestOptions(path: '/auth/me'),
          statusCode: 401,
          data: const {
            'error': {
              'code': 'invalid_refresh',
              'message': 'Refresh token invalid',
            },
          },
        ),
        type: DioExceptionType.badResponse,
        error: const SessionExpiredException(),
      );

      expect(apiErrorMessage(err), 'Session expired. Please sign in again.');
    });
  });
}
