/// Role-based navigation helpers mirroring frontend/lib/nav-access.ts
library;

import 'rbac_policy.dart' show fieldWorkerRoles, professionalRoles;

typedef UserMap = Map<String, dynamic>;

bool userHasProfessionalAccess(UserMap? user) {
  if (user == null) return false;
  if (user['has_professional_program'] == true) return true;
  final role = user['role'] as String?;
  return role != null && professionalRoles.contains(role);
}

bool isOrgAdmin(UserMap? user) {
  return user?['is_org_admin'] == true && user?['organization_id'] != null;
}

bool isOrgViewer(UserMap? user) {
  return user?['org_role'] == 'viewer';
}

bool canWriteInApp(UserMap? user) {
  if (user == null) return false;
  if (user['role'] == 'admin') return true;
  return !isOrgViewer(user);
}

bool canGenerateReports(UserMap? user) {
  return canWriteInApp(user) &&
      (userHasProfessionalAccess(user) || user?['role'] == 'field_supervisor');
}

bool isFieldWorkerHome(UserMap? user) {
  if (user == null) return false;
  if (user['role'] == 'field_worker') return true;
  if (user['org_role'] == 'worker') return true;
  return false;
}

bool isSupervisor(UserMap? user) {
  if (user == null) return false;
  return user['role'] == 'field_supervisor' || user['org_role'] == 'supervisor';
}

bool canSeeNavItem(
  UserMap? user,
  Object audience, {
  bool excludeViewers = false,
}) {
  if (user == null) return false;
  final audiences = audience is List ? audience : [audience];
  if (audiences.contains('all')) return true;
  if (excludeViewers && isOrgViewer(user)) return false;

  final professional = userHasProfessionalAccess(user);
  final fieldWorker = fieldWorkerRoles.contains(user['role']);
  final supervisor = isSupervisor(user);
  final orgAdmin = isOrgAdmin(user);

  // Match frontend canSeeNavItem: any matching audience grants access (no fall-through).
  for (final a in audiences) {
    final matched = switch (a) {
      'byot' => !professional,
      'professional' => professional,
      'field_worker' => fieldWorker || supervisor || professional,
      'field_supervisor' => supervisor || professional,
      'org_admin' => orgAdmin || user['role'] == 'admin',
      'can_write' => canWriteInApp(user),
      _ => true,
    };
    if (matched) return true;
  }
  return false;
}

bool canSeeProjects(UserMap? user) {
  return canSeeNavItem(user, ['professional', 'field_supervisor', 'field_worker']);
}

bool canSeeFieldProjectsCard(UserMap? user) => canSeeProjects(user);

bool canAddTrees(UserMap? user) => canWriteInApp(user);

bool canSeeBioacoustic(UserMap? user) => canSeeNavItem(user, 'professional');

bool canSeeExecutiveHome(UserMap? user) {
  if (user == null) return false;
  if (isFieldWorkerHome(user)) return false;
  return userHasProfessionalAccess(user) || user['role'] == 'admin';
}

bool canSeeMap(UserMap? user) => user != null;

bool canSeeMonitoring(UserMap? user) {
  if (user == null) return false;
  if (user['role'] == 'admin') return true;
  return userHasProfessionalAccess(user) || isSupervisor(user);
}

bool canSeeFieldOps(UserMap? user) {
  if (user == null || isOrgViewer(user)) return false;
  if (user['role'] == 'admin') return true;
  if (isFieldWorkerHome(user) || isSupervisor(user)) return true;
  return userHasProfessionalAccess(user);
}

bool canDrawOnMap(UserMap? user) => canWriteInApp(user);

bool canSeeCredits(UserMap? user) {
  return canSeeNavItem(user, ['professional', 'field_supervisor']);
}

bool canSeeReports(UserMap? user) {
  return canSeeNavItem(user, ['professional', 'field_supervisor']);
}

bool canSeeCarbon(UserMap? user) => user != null;

bool canSeeAssistant(UserMap? user) => user != null;

/// Bottom-nav path+label descriptors by role shell.
/// Icons are applied in [AppShell].
///
/// Role shells:
/// - Field worker: Home, Trees, Map, Alerts (`/notifications`)
/// - Supervisor: Home, Map, Alerts, Trees
/// - Exec/professional: Home, Monitoring (`/monitoring`), Projects, Alerts
/// - Default/citizen: Home, Trees, Map, Profile
List<NavDestinationDesc> navDestinationsFor(UserMap? user) {
  if (isFieldWorkerHome(user)) {
    return const [
      NavDestinationDesc('/home', 'Home'),
      NavDestinationDesc('/trees', 'Trees'),
      NavDestinationDesc('/map', 'Map'),
      NavDestinationDesc('/notifications', 'Alerts'),
    ];
  }
  if (isSupervisor(user)) {
    return const [
      NavDestinationDesc('/home', 'Home'),
      NavDestinationDesc('/map', 'Map'),
      NavDestinationDesc('/notifications', 'Alerts'),
      NavDestinationDesc('/trees', 'Trees'),
    ];
  }
  if (canSeeExecutiveHome(user) || userHasProfessionalAccess(user)) {
    return const [
      NavDestinationDesc('/home', 'Home'),
      NavDestinationDesc('/monitoring', 'Monitoring'),
      NavDestinationDesc('/projects', 'Projects'),
      NavDestinationDesc('/notifications', 'Alerts'),
    ];
  }
  return const [
    NavDestinationDesc('/home', 'Home'),
    NavDestinationDesc('/trees', 'Trees'),
    NavDestinationDesc('/map', 'Map'),
    NavDestinationDesc('/profile', 'Profile'),
  ];
}

class NavDestinationDesc {
  const NavDestinationDesc(this.path, this.label);

  final String path;
  final String label;
}
