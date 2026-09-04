import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:byot_mobile/src/api/api_errors.dart';

void main() {
  test('apiErrorMessage formats validation_error details', () {
    final err = DioException(
      requestOptions: RequestOptions(path: '/trees'),
      response: Response(
        requestOptions: RequestOptions(path: '/trees'),
        statusCode: 422,
        data: const {
          'error': {
            'code': 'validation_error',
            'message': 'Request validation failed',
            'details': {
              'errors': [
                {
                  'loc': ['body', 'planted_at'],
                  'msg': 'Input should be a valid date',
                },
              ],
            },
          },
        },
      ),
      type: DioExceptionType.badResponse,
    );

    expect(
      apiErrorMessage(err),
      'Planting date is invalid. Use YYYY-MM-DD.',
    );
  });
}
