import 'package:byot_mobile/l10n/app_localizations.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../providers.dart';
import '../session.dart';
import '../theme.dart';
import 'add_action_sheet.dart';
import 'app_drawer.dart';

/// Opens the nearest scaffold drawer (tab shell or stack route).
void openAppDrawer(BuildContext context) {
  final scaffold = Scaffold.maybeOf(context);
  if (scaffold?.hasDrawer ?? false) {
    scaffold!.openDrawer();
  }
}

/// Top bar with hamburger menu for shell screens.
class ShellTopBar extends StatelessWidget implements PreferredSizeWidget {
  const ShellTopBar({
    super.key,
    required this.title,
    this.subtitle,
    this.actions = const [],
    this.showMenu = true,
    this.menuWithBack = false,
  });

  final String title;
  final String? subtitle;
  final List<Widget> actions;
  final bool showMenu;
  /// When true and [Navigator.canPop], back is leading and drawer moves to actions.
  final bool menuWithBack;

  @override
  Size get preferredSize => Size.fromHeight(subtitle != null ? 72 : kToolbarHeight);

  @override
  Widget build(BuildContext context) {
    final canPop = Navigator.of(context).canPop();
    final drawerAction = showMenu
        ? IconButton(
            icon: const Icon(Icons.menu_rounded),
            tooltip: MaterialLocalizations.of(context).openAppDrawerTooltip,
            onPressed: () => openAppDrawer(context),
          )
        : null;

    return AppBar(
      leading: showMenu && !(menuWithBack && canPop) ? drawerAction : null,
      automaticallyImplyLeading: menuWithBack && canPop,
      title: subtitle != null
          ? Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w700)),
                Text(
                  subtitle!,
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w500,
                    color: Theme.of(context).colorScheme.onSurface.withValues(alpha: 0.6),
                  ),
                ),
              ],
            )
          : Text(title),
      actions: [
        if (showMenu && menuWithBack && canPop) drawerAction!,
        ...actions,
      ],
    );
  }
}

/// Extended FAB shown on primary shell routes when user can register trees.
class ShellRegisterFab extends StatelessWidget {
  const ShellRegisterFab({super.key, required this.location});

  final String location;

  @override
  Widget build(BuildContext context) {
    final user = sessionController.user ??
        ProviderScope.containerOf(context, listen: false).read(userProvider).valueOrNull;
    final l10n = AppLocalizations.of(context)!;
    return FloatingActionButton.extended(
      onPressed: () => showAddActionSheet(context, user: user),
      icon: const Icon(Icons.add_rounded),
      label: Text(l10n.addActionFab),
      backgroundColor: AranyixColors.forest,
      foregroundColor: Colors.white,
      elevation: 4,
    );
  }
}
