import 'package:flutter/material.dart';

/// Exposes shell actions (drawer) to nested scaffolds.
class AppShellScope extends InheritedWidget {
  const AppShellScope({
    super.key,
    required this.openDrawer,
    required super.child,
  });

  final VoidCallback openDrawer;

  static AppShellScope? maybeOf(BuildContext context) {
    return context.dependOnInheritedWidgetOfExactType<AppShellScope>();
  }

  static void openDrawerOf(BuildContext context) {
    maybeOf(context)?.openDrawer();
  }

  @override
  bool updateShouldNotify(AppShellScope oldWidget) =>
      openDrawer != oldWidget.openDrawer;
}
