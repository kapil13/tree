import 'package:dio/dio.dart';

import '../auth/auth_messages.dart';

/// Thrown when the session is no longer valid and the user must sign in again.
class SessionExpiredException implements Exception {
  const SessionExpiredException();
}

bool isUnauthorizedError(Object err) {
  if (err is SessionExpiredException) return true;
  if (err is DioException) {
    if (err.error is SessionExpiredException) return true;
    return err.response?.statusCode == 401;
  }
  return false;
}

/// User-facing message for API and network failures (mirrors web `errorMessage`).
String apiErrorMessage(Object err) {
  if (err is SessionExpiredException) {
    return 'Session expired. Please sign in again.';
  }
  if (err is DioException) {
    if (err.error is SessionExpiredException) {
      return 'Session expired. Please sign in again.';
    }
    final fromBody = _messageFromResponse(err.response);
    if (fromBody != null) return fromBody;
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
    if (err.response?.statusCode == 401) return 'Session expired. Please sign in again.';
    // Avoid showing Dio's long default 401 boilerplate.
    if (err.type == DioExceptionType.badResponse) {
      return 'Request failed (${err.response?.statusCode ?? 'unknown'}).';
    }
    return err.message ?? 'Request failed';
  }
  return err.toString();
}

String? _messageFromResponse(Response<dynamic>? response) {
  final data = response?.data;
  if (data is! Map) return null;

  final error = data['error'];
  if (error is Map) {
    final code = error['code'];
    if (code is String && code.isNotEmpty) {
      if (code == 'invalid_refresh') {
        return 'Session expired. Please sign in again.';
      }
      return humanizeAuthError(code);
    }
    final message = error['message'];
    if (message is String && message.isNotEmpty) {
      return message;
    }
  }

  final detail = data['detail'];
  if (detail is String) {
    if (response?.statusCode == 401 && detail == 'invalid_credentials') {
      return humanizeAuthError('invalid_credentials');
    }
    if (response?.statusCode == 401 && detail == 'invalid_refresh') {
      return 'Session expired. Please sign in again.';
    }
    return humanizeAuthError(detail);
  }
  if (detail is List) {
    return detail
        .map((d) => d is Map ? (d['msg'] ?? d.toString()) : d.toString())
        .join('; ');
  }
  if (detail is Map) {
    final compliance = detail['compliance_errors'];
    if (compliance is List) {
      return compliance
          .map((c) => c is Map ? (c['message'] ?? c['violation_type']) : c.toString())
          .join('\n');
    }
    final validation = detail['validation_errors'];
    if (validation is List && validation.isNotEmpty) {
      return _humanizeValidationErrors(validation.map((e) => e.toString()).toList());
    }
  }
  return null;
}

const _projectInheritedFields = {
  'legal_basis',
  'land_category',
  'permit_reference',
  'site_zone',
  'implementing_agency',
  'maintenance_responsible',
};

String _humanizeValidationErrors(List<String> errors) {
  final inherited = errors.where((code) {
    final parts = code.split(':');
    if (parts.length < 2) return false;
    return _projectInheritedFields.contains(parts[1]);
  }).toList();
  if (inherited.isNotEmpty) {
    return 'Project setup is incomplete. Finish tree registration defaults '
        '(permit, site zone, agency) in project setup, then try again.';
  }
  return errors
      .map((code) {
        final parts = code.split(':');
        if (parts.length == 2 && parts[0] == 'missing_required') {
          return 'Missing ${parts[1].replaceAll('_', ' ')}.';
        }
        return code.replaceAll('_', ' ');
      })
      .join('\n');
}
