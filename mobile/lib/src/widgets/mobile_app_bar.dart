import 'package:flutter/material.dart';

import 'app_shell_scope.dart';

/// App bar with a menu affordance that opens the shell drawer.
class MobileAppBar extends StatelessWidget implements PreferredSizeWidget {
  const MobileAppBar({
    super.key,
    required this.title,
    this.actions,
    this.centerTitle,
    this.showMenu = true,
  });

  final String title;
  final List<Widget>? actions;
  final bool? centerTitle;
  final bool showMenu;

  @override
  Size get preferredSize => const Size.fromHeight(kToolbarHeight);

  @override
  Widget build(BuildContext context) {
    return AppBar(
      title: Text(title),
      centerTitle: centerTitle,
      leading: showMenu
          ? IconButton(
              tooltip: 'Menu',
              icon: const Icon(Icons.menu_rounded),
              onPressed: () => AppShellScope.openDrawerOf(context),
            )
          : null,
      automaticallyImplyLeading: !showMenu,
      actions: actions,
    );
  }
}
