import 'package:dio/dio.dart';

/// User-facing message for API and network failures (mirrors web `errorMessage`).
String apiErrorMessage(Object err) {
  if (err is DioException) {
    if (err.response == null) {
      final type = err.type;
      if (type == DioExceptionType.connectionTimeout ||
          type == DioExceptionType.receiveTimeout ||
          type == DioExceptionType.sendTimeout) {
        return 'Cannot reach the API. Check the server URL and your network connection.';
      }
      if (type == DioExceptionType.connectionError) {
        return 'Cannot connect to server. Check API URL and that the backend is running.';
      }
      return err.message ?? 'Network error';
    }
    final data = err.response?.data;
    if (data is Map) {
      final error = data['error'];
      if (error is Map && error['message'] is String) {
        return error['message'] as String;
      }
      final detail = data['detail'];
      if (detail is String) {
        if (err.response?.statusCode == 401 && detail == 'invalid_credentials') {
          return 'Invalid email or password.';
        }
        if (err.response?.statusCode == 401 && detail == 'invalid_refresh') {
          return 'Session expired. Please sign in again.';
        }
        return detail;
      }
      if (detail is List) {
        return detail
            .map((d) => d is Map ? (d['msg'] ?? d.toString()) : d.toString())
            .join('; ');
      }
    }
    if (err.response?.statusCode == 401) return 'Session expired. Please sign in again.';
    return err.message ?? 'Request failed';
  }
  return err.toString();
}
