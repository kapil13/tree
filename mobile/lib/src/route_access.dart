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
  _RouteRule('/field-ops', ['professional', 'field_supervisor', 'field_worker'], excludeViewers: true),
  _RouteRule('/monitoring', ['professional', 'field_supervisor']),
  _RouteRule('/map/draw', 'can_write'),
  _RouteRule('/reports', ['professional', 'field_supervisor']),
  _RouteRule('/credits', ['professional', 'field_supervisor']),
  _RouteRule('/carbon', 'all'),
];

bool canAccessPath(UserMap? user, String path) {
  if (user == null) return false;

  // Survival / re-geotag requires write access.
  if (RegExp(r'^/trees/[^/]+/survival').hasMatch(path)) {
    return canSeeNavItem(user, 'can_write');
  }

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
  if (path.startsWith('/trees/new') || RegExp(r'^/trees/[^/]+/survival').hasMatch(path)) {
    return 'Your viewer role is read-only. Ask your program manager for write access.';
  }
  if (path.startsWith('/projects')) {
    return 'Projects are limited to field teams and program members.';
  }
  if (path.startsWith('/bioacoustic')) {
    return 'Bioacoustic monitoring requires a professional program.';
  }
  if (path.startsWith('/field-ops')) {
    return 'Field operations are limited to field teams and program leads.';
  }
  if (path.startsWith('/monitoring')) {
    return 'Monitoring is limited to supervisors and program members.';
  }
  if (path.startsWith('/reports')) {
    return 'Reports are limited to supervisors and program members.';
  }
  if (path.startsWith('/credits')) {
    return 'Credit ledgers are limited to program members.';
  }
  if (path.startsWith('/map/draw')) {
    return 'Drawing work areas requires write access.';
  }
  return 'Your role does not include access to this section.';
}
