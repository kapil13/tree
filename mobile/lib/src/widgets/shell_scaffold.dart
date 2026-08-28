import 'package:byot_mobile/l10n/app_localizations.dart';
import 'package:flutter/material.dart';

import '../session.dart';
import '../theme.dart';
import 'add_action_sheet.dart';

/// Global key for the shell [Scaffold] so nested screens can open the drawer.
final shellScaffoldKey = GlobalKey<ScaffoldState>();

void openAppDrawer(BuildContext context) {
  shellScaffoldKey.currentState?.openDrawer();
}

/// Top bar with hamburger menu for shell screens.
class ShellTopBar extends StatelessWidget implements PreferredSizeWidget {
  const ShellTopBar({
    super.key,
    required this.title,
    this.subtitle,
    this.actions = const [],
    this.showMenu = true,
  });

  final String title;
  final String? subtitle;
  final List<Widget> actions;
  final bool showMenu;

  @override
  Size get preferredSize => Size.fromHeight(subtitle != null ? 72 : kToolbarHeight);

  @override
  Widget build(BuildContext context) {
    return AppBar(
      leading: showMenu
          ? IconButton(
              icon: const Icon(Icons.menu_rounded),
              tooltip: MaterialLocalizations.of(context).openAppDrawerTooltip,
              onPressed: () => openAppDrawer(context),
            )
          : null,
      title: subtitle != null
          ? Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w700)),
                Text(
                  subtitle!,
                  style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w500, color: AranyixColors.onSurfaceMuted),
                ),
              ],
            )
          : Text(title),
      actions: actions,
    );
  }
}

/// Extended FAB shown on primary shell routes when user can register trees.
class ShellRegisterFab extends StatelessWidget {
  const ShellRegisterFab({super.key, required this.location});

  final String location;

  @override
  Widget build(BuildContext context) {
    final user = sessionController.user;
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
