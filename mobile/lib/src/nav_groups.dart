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
      MobileNavItem(
        route: '/sync-queue',
        labelKey: 'navSyncQueue',
        icon: Icons.cloud_sync_outlined,
        audience: 'can_write',
        excludeViewers: true,
      ),
      MobileNavItem(
        route: '/audit',
        labelKey: 'auditWorkspaceTitle',
        icon: Icons.verified_user_outlined,
        audience: ['professional', 'field_supervisor', 'field_worker'],
        excludeViewers: true,
      ),
      MobileNavItem(
        route: '/portfolio',
        labelKey: 'navPortfolio',
        icon: Icons.dashboard_outlined,
        audience: ['professional', 'field_supervisor'],
      ),
      MobileNavItem(
        route: '/plot-visits',
        labelKey: 'navPlotVisits',
        icon: Icons.grid_on_outlined,
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
        route: '/notifications',
        labelKey: 'navAlerts',
        icon: Icons.notifications_outlined,
      ),
      MobileNavItem(
        route: '/biodiversity',
        labelKey: 'reportTypeBiodiversity',
        icon: Icons.hive_outlined,
        audience: 'professional',
      ),
      MobileNavItem(
        route: '/satellite',
        labelKey: 'navSatellite',
        icon: Icons.satellite_alt_outlined,
        audience: ['professional', 'field_supervisor'],
      ),
      MobileNavItem(
        route: '/verification',
        labelKey: 'navVerification',
        icon: Icons.rule_outlined,
        audience: ['professional', 'field_supervisor', 'verifier'],
      ),
    ],
  ),
  MobileNavGroup(
    id: 'compliance',
    labelKey: 'navSectionCompliance',
    descKey: 'navSectionComplianceDesc',
    items: [
      MobileNavItem(
        route: '/evidence',
        labelKey: 'navEvidence',
        icon: Icons.fact_check_outlined,
        audience: ['professional', 'field_supervisor'],
      ),
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
    id: 'stewardship',
    labelKey: 'navSectionStewardship',
    items: [
      MobileNavItem(
        route: '/citizen/stewardship',
        labelKey: 'navStewardship',
        icon: Icons.forest_outlined,
        audience: 'all',
      ),
      MobileNavItem(
        route: '/citizen/adopt',
        labelKey: 'navAdoptTree',
        icon: Icons.volunteer_activism_outlined,
        audience: 'all',
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
      MobileNavItem(
        route: '/onboarding/audience',
        labelKey: 'navAudienceOnboarding',
        icon: Icons.groups_outlined,
        audience: 'all',
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
///
/// Home and Field use [PrototypeFieldCaptureBar] instead of the shell FAB — see
/// [AppShell] which excludes those routes from the floating action button.
bool showFieldFabOnRoute(String location) {
  return location == '/trees' || location == '/map' || location == '/monitoring';
}
