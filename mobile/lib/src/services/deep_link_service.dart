import 'dart:async';

import 'package:app_links/app_links.dart';
import 'package:flutter/foundation.dart';

typedef DeepLinkHandler = Future<void> Function(Uri uri);

/// Handles https deep links: /auth/callback, /p/{code}, /alerts/{id}, invite query params.
class DeepLinkService {
  DeepLinkService._();

  static final DeepLinkService instance = DeepLinkService._();

  final AppLinks _appLinks = AppLinks();
  StreamSubscription<Uri>? _sub;
  DeepLinkHandler? _handler;

  Future<void> init(DeepLinkHandler handler) async {
    _handler = handler;
    final initial = await _appLinks.getInitialLink();
    if (initial != null) {
      await handler(initial);
    }
    await _sub?.cancel();
    _sub = _appLinks.uriLinkStream.listen((uri) {
      unawaited(handler(uri));
    }, onError: (Object e) {
      if (kDebugMode) {
        debugPrint('Deep link error: $e');
      }
    });
  }

  void dispose() {
    unawaited(_sub?.cancel());
    _sub = null;
    _handler = null;
  }

  /// Parse tree public code from https://aranyix.tech/p/{code}
  static String? treePublicCodeFromUri(Uri uri) {
    final segments = uri.pathSegments;
    if (segments.length >= 2 && segments[0] == 'p') {
      return Uri.decodeComponent(segments[1]);
    }
    if (segments.length == 1 && segments.first.startsWith('BYOT-')) {
      return segments.first;
    }
    return null;
  }

  static String? inviteTokenFromUri(Uri uri) {
    return uri.queryParameters['invite'];
  }

  static String? alertIdFromUri(Uri uri) {
    final segments = uri.pathSegments;
    if (segments.length >= 2 && segments[0] == 'alerts') {
      return Uri.decodeComponent(segments[1]);
    }
    return uri.queryParameters['alert_id'];
  }

  /// Resolve an in-app route from a notification payload or universal link.
  static String? appRouteFromUri(Uri uri) {
    if (uri.scheme == 'http' || uri.scheme == 'https') {
      if (uri.path.startsWith('/auth/callback')) {
        return '${uri.path}${uri.hasQuery ? '?${uri.query}' : ''}';
      }
      final alertId = alertIdFromUri(uri);
      if (alertId != null) return '/alerts/$alertId';
      final treeCode = treePublicCodeFromUri(uri);
      if (treeCode != null) return '/p/$treeCode';
      if (uri.path == '/map' || uri.path.startsWith('/map')) {
        return '${uri.path}${uri.hasQuery ? '?${uri.query}' : ''}';
      }
      final segments = uri.pathSegments;
      if (segments.length >= 2 && segments[0] == 'trees') {
        return '/trees/${Uri.decodeComponent(segments[1])}';
      }
    }
    if (uri.scheme == 'aranyix') {
      final normalized = uri.host.isNotEmpty
          ? '/${uri.host}${uri.path}'
          : (uri.path.startsWith('/') ? uri.path : '/${uri.path}');
      if (normalized == '/') return null;
      return uri.hasQuery ? '$normalized?${uri.query}' : normalized;
    }
    return null;
  }

  static String? appRouteFromNotificationData(Map<String, dynamic> data) {
    final route = data['route'] as String?;
    if (route != null && route.startsWith('/')) return route;
    final alertId = data['alert_id'] as String?;
    if (alertId != null && alertId.isNotEmpty) return '/alerts/$alertId';
    final treeId = data['tree_id'] as String?;
    if (treeId != null && treeId.isNotEmpty) return '/trees/$treeId';
    final fenceId = data['fence_id'] as String? ?? data['work_area_id'] as String?;
    if (fenceId != null && fenceId.isNotEmpty) return '/map?fence=$fenceId';
    return null;
  }
}
