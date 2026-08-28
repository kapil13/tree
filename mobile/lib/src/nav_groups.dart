import 'package:flutter/material.dart';

import 'nav_access.dart';

/// Sidebar navigation groups mirroring web `frontend/components/sidebar.tsx`.
class MobileNavItem {
  const MobileNavItem({
    required this.route,
    required this.labelKey,
    required this.icon,
    this.audience = 'all',
    this.excludeViewers = false,
    this.exact = false,
  });

  final String route;
  final String labelKey;
  final IconData icon;
  final Object audience;
  final bool excludeViewers;
  final bool exact;
}

class MobileNavGroup {
  const MobileNavGroup({
    required this.id,
    this.labelKey,
    this.descKey,
    this.hideHeader = false,
    required this.items,
  });

  final String id;
  final String? labelKey;
  final String? descKey;
  final bool hideHeader;
  final List<MobileNavItem> items;
}

const mobileNavGroups = [
  MobileNavGroup(
    id: 'overview',
    hideHeader: true,
    items: [
      MobileNavItem(
        route: '/home',
        labelKey: 'navDashboard',
        icon: Icons.dashboard_outlined,
        exact: true,
      ),
    ],
  ),
  MobileNavGroup(
    id: 'plantation',
    labelKey: 'navSectionPlantation',
    descKey: 'navSectionPlantationDesc',
    items: [
      MobileNavItem(
        route: '/projects',
        labelKey: 'projects',
        icon: Icons.assignment_outlined,
        audience: ['professional', 'field_supervisor', 'field_worker'],
      ),
      MobileNavItem(
        route: '/trees',
        labelKey: 'trees',
        icon: Icons.park_outlined,
        exact: true,
      ),
      MobileNavItem(
        route: '/map',
        labelKey: 'map',
        icon: Icons.map_outlined,
      ),
      MobileNavItem(
        route: '/field-ops',
        labelKey: 'fieldOps',
        icon: Icons.construction_outlined,
        audience: ['professional', 'field_supervisor', 'field_worker'],
        excludeViewers: true,
      ),
    ],
  ),
  MobileNavGroup(
    id: 'intelligence',
    labelKey: 'navSectionIntelligence',
    descKey: 'navSectionIntelligenceDesc',
    items: [
      MobileNavItem(
        route: '/monitoring',
        labelKey: 'monitoring',
        icon: Icons.monitor_heart_outlined,
        audience: ['professional', 'field_supervisor'],
      ),
      MobileNavItem(
        route: '/bioacoustic',
        labelKey: 'navBioacoustic',
        icon: Icons.graphic_eq,
        audience: 'professional',
      ),
      MobileNavItem(
        route: '/notifications',
        labelKey: 'navAlerts',
        icon: Icons.notifications_outlined,
      ),
    ],
  ),
  MobileNavGroup(
    id: 'reports',
    labelKey: 'navSectionReports',
    descKey: 'navSectionReportsDesc',
    items: [
      MobileNavItem(
        route: '/reports',
        labelKey: 'navReports',
        icon: Icons.description_outlined,
        audience: ['professional', 'field_supervisor'],
      ),
      MobileNavItem(
        route: '/assistant',
        labelKey: 'navAssistant',
        icon: Icons.auto_awesome,
      ),
      MobileNavItem(
        route: '/carbon',
        labelKey: 'navCarbon',
        icon: Icons.eco_outlined,
      ),
      MobileNavItem(
        route: '/credits',
        labelKey: 'navCredits',
        icon: Icons.account_balance_outlined,
        audience: ['professional', 'field_supervisor'],
      ),
    ],
  ),
  MobileNavGroup(
    id: 'account',
    labelKey: 'navSectionAccount',
    items: [
      MobileNavItem(
        route: '/profile',
        labelKey: 'profile',
        icon: Icons.person_outline,
        exact: true,
      ),
    ],
  ),
];

List<MobileNavGroup> mobileNavGroupsFor(UserMap? user) {
  return mobileNavGroups
      .map((group) {
        final items = group.items
            .where(
              (item) => canSeeNavItem(
                user,
                item.audience,
                excludeViewers: item.excludeViewers,
              ),
            )
            .toList();
        return MobileNavGroup(
          id: group.id,
          labelKey: group.labelKey,
          descKey: group.descKey,
          hideHeader: group.hideHeader,
          items: items,
        );
      })
      .where((group) => group.items.isNotEmpty)
      .toList();
}

bool mobileNavItemActive(String location, MobileNavItem item) {
  if (item.exact) return location == item.route;
  if (item.route == '/home') return location == '/home';
  if (item.route == '/trees') {
    return location == '/trees' ||
        (location.startsWith('/trees/') && !location.startsWith('/trees/new'));
  }
  return location == item.route || location.startsWith('${item.route}/');
}

/// Routes where the register-tree FAB should appear.
bool showFieldFabOnRoute(String location) {
  return location == '/home' ||
      location == '/trees' ||
      location == '/map' ||
      location == '/projects' ||
      location == '/monitoring' ||
      location == '/notifications' ||
      location == '/profile';
}
