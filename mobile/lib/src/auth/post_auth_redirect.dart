import '../api/api_client.dart';
import '../route_access.dart';

/// Sanitize `next` query param — internal app paths only.
String? sanitizePostAuthPath(String? raw) {
  if (raw == null || raw.isEmpty) return null;
  if (!raw.startsWith('/') || raw.startsWith('//')) return null;
  if (raw.contains('://')) return null;
  final uri = Uri.tryParse(raw);
  if (uri == null) return null;
  return uri.toString().startsWith('/')
      ? '${uri.path}${uri.hasQuery ? '?${uri.query}' : ''}'
      : null;
}

/// Resolve post-login destination, including `/p/{public_code}` tree deep links.
Future<String> resolvePostAuthLanding({
  required ApiClient api,
  required Map<String, dynamic> user,
  required String defaultLanding,
  String? postAuthNext,
}) async {
  final next = sanitizePostAuthPath(postAuthNext);
  if (next == null) return defaultLanding;

  if (next.startsWith('/p/')) {
    final code = next.replaceFirst('/p/', '').split('?').first;
    if (code.isEmpty) return defaultLanding;
    try {
      final tree = await api.getTreeByPublicCode(code);
      final id = tree['id'] as String?;
      if (id != null && id.isNotEmpty) return '/trees/$id';
    } catch (_) {
      return defaultLanding;
    }
    return defaultLanding;
  }

  final pathOnly = Uri.parse(next).path;
  if (!canAccessPath(user, pathOnly)) return defaultLanding;
  return next;
}
