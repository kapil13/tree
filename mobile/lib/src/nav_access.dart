/// Role-based navigation helpers mirroring frontend/lib/nav-access.ts
library;

import 'package:flutter/material.dart';

import 'rbac_policy.dart' show fieldWorkerRoles, professionalRoles;

typedef UserMap = Map<String, dynamic>;

/// Sentinel path for the bottom-nav "More" tab (opens drawer).
const kMoreNavPath = '__more__';

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

bool canSeeStewardship(UserMap? user) => canSeeNavItem(user, 'byot');

bool canSeePortfolioHealth(UserMap? user) {
  if (user == null) return false;
  if (user['role'] == 'admin') return true;
  return userHasProfessionalAccess(user) || isSupervisor(user);
}

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

/// Bottom-nav destinations — max 5 tabs including More.
List<NavDestinationDesc> navDestinationsFor(UserMap? user) {
  if (isFieldWorkerHome(user)) {
    return const [
      NavDestinationDesc('/home', 'Home'),
      NavDestinationDesc('/trees', 'Trees'),
      NavDestinationDesc('/map', 'Map'),
      NavDestinationDesc('/notifications', 'Alerts'),
      NavDestinationDesc(kMoreNavPath, 'More'),
    ];
  }
  if (isSupervisor(user)) {
    return const [
      NavDestinationDesc('/home', 'Home'),
      NavDestinationDesc('/map', 'Map'),
      NavDestinationDesc('/notifications', 'Alerts'),
      NavDestinationDesc('/trees', 'Trees'),
      NavDestinationDesc(kMoreNavPath, 'More'),
    ];
  }
  if (canSeeBioacoustic(user)) {
    return const [
      NavDestinationDesc('/home', 'Home'),
      NavDestinationDesc('/bioacoustic', 'Bio'),
      NavDestinationDesc('/map', 'Map'),
      NavDestinationDesc('/notifications', 'Alerts'),
      NavDestinationDesc(kMoreNavPath, 'More'),
    ];
  }
  return const [
    NavDestinationDesc('/home', 'Home'),
    NavDestinationDesc('/trees', 'Trees'),
    NavDestinationDesc('/map', 'Map'),
    NavDestinationDesc('/notifications', 'Alerts'),
    NavDestinationDesc(kMoreNavPath, 'More'),
  ];
}

/// Routes that should highlight the More tab when active.
bool isMoreTabRoute(String path) {
  if (path == '/profile' || path == '/stewardship' || path == '/portfolio-health') {
    return true;
  }
  if (path == '/monitoring' || path == '/projects') return true;
  if (path == '/field-ops' ||
      path == '/carbon' ||
      path == '/reports' ||
      path == '/credits' ||
      path == '/assistant') {
    return true;
  }
  return false;
}

int footerSelectedIndex(String location, UserMap? user) {
  final destinations = navDestinationsFor(user);
  for (var i = 0; i < destinations.length; i++) {
    final path = destinations[i].path;
    if (path == kMoreNavPath) continue;
    if (location == path || location.startsWith('$path/')) return i;
  }
  if (isMoreTabRoute(location)) {
    final moreIndex = destinations.indexWhere((d) => d.path == kMoreNavPath);
    if (moreIndex >= 0) return moreIndex;
  }
  return 0;
}

class NavDestinationDesc {
  const NavDestinationDesc(this.path, this.label);

  final String path;
  final String label;
}

class NavDrawerItem {
  const NavDrawerItem({
    required this.path,
    required this.label,
    required this.icon,
    required this.audience,
    this.excludeViewers = false,
    this.pushRoute = false,
  });

  final String path;
  final String label;
  final IconData icon;
  final Object audience;
  final bool excludeViewers;
  /// Full-screen routes outside the tab shell (e.g. register tree).
  final bool pushRoute;
}

class NavDrawerSection {
  const NavDrawerSection({
    required this.id,
    required this.label,
    required this.items,
  });

  final String id;
  final String label;
  final List<NavDrawerItem> items;
}

const _allDrawerItems = [
  NavDrawerItem(
    path: '/stewardship',
    label: 'Stewardship',
    icon: Icons.favorite_outline,
    audience: 'byot',
  ),
  NavDrawerItem(
    path: '/portfolio-health',
    label: 'Portfolio health',
    icon: Icons.insights_outlined,
    audience: ['professional', 'field_supervisor'],
  ),
  NavDrawerItem(
    path: '/trees/new',
    label: 'Register tree',
    icon: Icons.add_circle_outline,
    audience: 'can_write',
    pushRoute: true,
  ),
  NavDrawerItem(
    path: '/trees',
    label: 'Trees',
    icon: Icons.park_outlined,
    audience: 'all',
  ),
  NavDrawerItem(
    path: '/projects',
    label: 'Projects',
    icon: Icons.assignment_outlined,
    audience: ['professional', 'field_supervisor', 'field_worker'],
  ),
  NavDrawerItem(
    path: '/map',
    label: 'Map',
    icon: Icons.map_outlined,
    audience: 'all',
  ),
  NavDrawerItem(
    path: '/field-ops',
    label: 'Field ops',
    icon: Icons.construction_outlined,
    audience: ['professional', 'field_supervisor', 'field_worker'],
    excludeViewers: true,
    pushRoute: true,
  ),
  NavDrawerItem(
    path: '/monitoring',
    label: 'Monitoring',
    icon: Icons.monitor_heart_outlined,
    audience: ['professional', 'field_supervisor'],
  ),
  NavDrawerItem(
    path: '/bioacoustic',
    label: 'Bioacoustic',
    icon: Icons.graphic_eq,
    audience: 'professional',
  ),
  NavDrawerItem(
    path: '/notifications',
    label: 'Alerts',
    icon: Icons.notifications_outlined,
    audience: 'all',
  ),
  NavDrawerItem(
    path: '/assistant',
    label: 'AI assistant',
    icon: Icons.auto_awesome,
    audience: 'all',
    pushRoute: true,
  ),
  NavDrawerItem(
    path: '/carbon',
    label: 'Carbon calculator',
    icon: Icons.eco_outlined,
    audience: 'all',
    pushRoute: true,
  ),
  NavDrawerItem(
    path: '/reports',
    label: 'Reports',
    icon: Icons.description_outlined,
    audience: ['professional', 'field_supervisor'],
    pushRoute: true,
  ),
  NavDrawerItem(
    path: '/credits',
    label: 'Credits',
    icon: Icons.account_balance_outlined,
    audience: ['professional', 'field_supervisor'],
    pushRoute: true,
  ),
  NavDrawerItem(
    path: '/profile',
    label: 'Profile & settings',
    icon: Icons.person_outline,
    audience: 'all',
  ),
];

Set<String> _footerPathsFor(UserMap? user) {
  return navDestinationsFor(user)
      .map((d) => d.path)
      .where((p) => p != kMoreNavPath)
      .toSet();
}

List<NavDrawerSection> drawerSectionsFor(UserMap? user) {
  if (user == null) return [];

  final footerPaths = _footerPathsFor(user);
  final visible = _allDrawerItems.where((item) {
    if (!canSeeNavItem(user, item.audience, excludeViewers: item.excludeViewers)) {
      return false;
    }
    if (footerPaths.contains(item.path)) return false;
    return true;
  }).toList();

  NavDrawerSection? section(String id, String label, bool Function(NavDrawerItem) match) {
    final items = visible.where(match).toList();
    if (items.isEmpty) return null;
    return NavDrawerSection(id: id, label: label, items: items);
  }

  final sections = <NavDrawerSection>[];
  void add(NavDrawerSection? value) {
    if (value != null) sections.add(value);
  }

  add(section('home', 'Home', (i) => i.path == '/stewardship' || i.path == '/portfolio-health'));
  add(section(
    'operate',
    'Operate',
    (i) =>
        i.path == '/trees/new' ||
        i.path == '/trees' ||
        i.path == '/projects' ||
        i.path == '/map' ||
        i.path == '/field-ops',
  ));
  add(section(
    'monitor',
    'Monitor',
    (i) =>
        i.path == '/monitoring' ||
        i.path == '/bioacoustic' ||
        i.path == '/notifications',
  ));
  add(section(
    'evidence',
    'Evidence',
    (i) =>
        i.path == '/assistant' ||
        i.path == '/carbon' ||
        i.path == '/reports' ||
        i.path == '/credits',
  ));
  add(section('account', 'Account', (i) => i.path == '/profile'));

  return sections;
}
