import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../nav_access.dart';
import '../session.dart';
import '../theme.dart';
import 'brand_mark.dart';

class AppDrawer extends StatelessWidget {
  const AppDrawer({
    super.key,
    required this.onNavigate,
  });

  final VoidCallback onNavigate;

  @override
  Widget build(BuildContext context) {
    final user = sessionController.user;
    final sections = drawerSectionsFor(user);
    final location = GoRouterState.of(context).matchedLocation;
    final displayName = user?['full_name'] as String? ?? user?['email'] as String? ?? 'Signed in';
    final roleLabel = _roleLabel(user);

    return Drawer(
      backgroundColor: AranyixColors.surfaceElevated,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.horizontal(right: Radius.circular(AranyixRadii.sheet)),
      ),
      child: SafeArea(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 16, 20, 12),
              child: Row(
                children: [
                  const AranyixBrandMark(size: 40, radius: 12),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          'Aranyix',
                          style: TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.w800,
                            color: AranyixColors.forestDark,
                          ),
                        ),
                        Text(
                          displayName,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(
                            fontSize: 13,
                            color: AranyixColors.onSurfaceMuted,
                          ),
                        ),
                        if (roleLabel != null)
                          Text(
                            roleLabel,
                            style: const TextStyle(
                              fontSize: 11,
                              fontWeight: FontWeight.w600,
                              color: AranyixColors.forest,
                            ),
                          ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            const Divider(height: 1),
            Expanded(
              child: ListView(
                padding: const EdgeInsets.fromLTRB(8, 8, 8, 24),
                children: [
                  for (final section in sections) ...[
                    Padding(
                      padding: const EdgeInsets.fromLTRB(12, 12, 12, 6),
                      child: Text(
                        section.label.toUpperCase(),
                        style: const TextStyle(
                          fontSize: 10,
                          fontWeight: FontWeight.w700,
                          letterSpacing: 0.8,
                          color: AranyixColors.onSurfaceMuted,
                        ),
                      ),
                    ),
                    for (final item in section.items)
                      _DrawerTile(
                        item: item,
                        selected: _isSelected(location, item.path),
                        onTap: () {
                          onNavigate();
                          if (item.pushRoute) {
                            context.push(item.path);
                          } else {
                            context.go(item.path);
                          }
                        },
                      ),
                  ],
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  static bool _isSelected(String location, String path) {
    if (path == '/trees') {
      return location == '/trees' ||
          (location.startsWith('/trees/') && !location.startsWith('/trees/new'));
    }
    return location == path || location.startsWith('$path/');
  }

  static String? _roleLabel(UserMap? user) {
    if (user == null) return null;
    if (user['has_professional_program'] == true) return 'Professional program';
    if (isFieldWorkerHome(user)) return 'Field worker';
    if (isSupervisor(user)) return 'Supervisor';
    return 'Citizen steward';
  }
}

class _DrawerTile extends StatelessWidget {
  const _DrawerTile({
    required this.item,
    required this.selected,
    required this.onTap,
  });

  final NavDrawerItem item;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 2),
      child: ListTile(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
        tileColor: selected ? AranyixColors.forestLight : null,
        leading: Icon(
          item.icon,
          color: selected ? AranyixColors.forestDark : AranyixColors.onSurfaceMuted,
        ),
        title: Text(
          item.label,
          style: TextStyle(
            fontWeight: selected ? FontWeight.w700 : FontWeight.w500,
            color: selected ? AranyixColors.forestDark : AranyixColors.onSurface,
          ),
        ),
        onTap: onTap,
      ),
    );
  }
}
