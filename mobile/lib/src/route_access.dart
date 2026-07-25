import 'nav_access.dart' show UserMap, canSeeNavItem;

class _RouteRule {
  const _RouteRule(this.prefix, this.audience, {this.excludeViewers = false});

  final String prefix;
  final Object audience;
  final bool excludeViewers;
}

const _routeRules = [
  _RouteRule('/trees/new', 'can_write'),
  _RouteRule('/projects', ['professional', 'field_supervisor', 'field_worker']),
  _RouteRule('/bioacoustic', 'professional'),
];

bool canAccessPath(UserMap? user, String path) {
  if (user == null) return false;
  for (final rule in _routeRules) {
    if (path == rule.prefix || path.startsWith('${rule.prefix}/')) {
      return canSeeNavItem(
        user,
        rule.audience,
        excludeViewers: rule.excludeViewers,
      );
    }
  }
  return true;
}

String routeAccessDeniedMessage(String path) {
  if (path.startsWith('/trees/new')) {
    return 'Your viewer role is read-only. Ask your program manager for write access.';
  }
  if (path.startsWith('/projects')) {
    return 'Projects are limited to field teams and program members.';
  }
  if (path.startsWith('/bioacoustic')) {
    return 'Bioacoustic monitoring requires a professional program.';
  }
  return 'Your role does not include access to this section.';
}
