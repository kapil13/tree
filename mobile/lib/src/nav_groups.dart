import 'package:flutter/material.dart';

import 'nav_access.dart';

/// Sidebar navigation groups — v4.2 drawer (bottom tabs excluded).
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
    id: 'workspace',
    labelKey: 'navSectionWorkspace',
    descKey: 'navSectionWorkspaceDesc',
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
        route: '/field',
        labelKey: 'navFieldQueue',
        icon: Icons.sync_outlined,
        audience: 'can_write',
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
        route: '/notifications',
        labelKey: 'navAlerts',
        icon: Icons.notifications_outlined,
      ),
    ],
  ),
  MobileNavGroup(
    id: 'compliance',
    labelKey: 'navSectionCompliance',
    descKey: 'navSectionComplianceDesc',
    items: [
      MobileNavItem(
        route: '/reports',
        labelKey: 'navReports',
        icon: Icons.description_outlined,
        audience: ['professional', 'field_supervisor'],
      ),
    ],
  ),
  MobileNavGroup(
    id: 'carbon',
    labelKey: 'navSectionCarbon',
    items: [
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
    id: 'tools',
    labelKey: 'navSectionTools',
    items: [
      MobileNavItem(
        route: '/assistant',
        labelKey: 'navAssistant',
        icon: Icons.auto_awesome,
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
  if (item.route == '/field') {
    return location == '/field' || location == '/field-ops';
  }
  return location == item.route || location.startsWith('${item.route}/');
}

/// Routes where the register-tree FAB should appear.
bool showFieldFabOnRoute(String location) {
  return location == '/home' ||
      location == '/field' ||
      location == '/trees' ||
      location == '/map' ||
      location == '/monitoring';
}
