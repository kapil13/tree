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

/// True when the failure is likely transient connectivity (safe to offline-queue).
bool isOfflineOrNetworkError(Object err) {
  if (err is DioException && err.response == null) {
    final type = err.type;
    return type == DioExceptionType.connectionError ||
        type == DioExceptionType.connectionTimeout ||
        type == DioExceptionType.receiveTimeout ||
        type == DioExceptionType.sendTimeout ||
        type == DioExceptionType.unknown;
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
      return formatComplianceErrors(compliance);
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

const _complianceViolationLabels = <String, String>{
  'missing_exif': 'Photo is missing camera EXIF metadata.',
  'missing_photo_gps': 'Photo is missing GPS coordinates.',
  'missing_photo_timestamp': 'Photo is missing a capture timestamp.',
  'photo_timestamp_stale': 'Photo is older than 7 days — take a fresh camera capture.',
  'duplicate_photo': 'This photo matches an existing tree registration.',
  'photo_span_too_short': 'Follow-up photos must span at least 30 days.',
  'insufficient_photos': 'At least 2 field photos are required.',
};

String complianceViolationLabel(String violationType) {
  return _complianceViolationLabels[violationType] ??
      violationType.replaceAll('_', ' ');
}

String formatComplianceErrors(List<dynamic> compliance) {
  return compliance
      .map((item) {
        if (item is! Map) return item.toString();
        final type = item['violation_type']?.toString() ?? '';
        final message = item['message']?.toString();
        if (message != null && message.isNotEmpty) return message;
        if (type.isNotEmpty) return complianceViolationLabel(type);
        return item.toString();
      })
      .join('\n');
}

String formatComplianceSyncError(Object err) {
  final message = apiErrorMessage(err);
  if (message.contains('compliance') || message.contains('EXIF') || message.contains('photo')) {
    return message;
  }
  if (err is DioException) {
    final data = err.response?.data;
    if (data is Map) {
      final detail = data['detail'];
      if (detail is Map) {
        final compliance = detail['compliance_errors'];
        if (compliance is List && compliance.isNotEmpty) {
          return 'Strict compliance blocked sync:\n${formatComplianceErrors(compliance)}';
        }
      }
    }
  }
  return 'Offline tree sync failed: $message';
}
