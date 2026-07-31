import 'dart:async';

import 'package:app_links/app_links.dart';
import 'package:flutter/foundation.dart';

typedef DeepLinkHandler = Future<void> Function(Uri uri);

/// Handles https deep links: /auth/callback, /p/{code}, invite query params.
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
}
