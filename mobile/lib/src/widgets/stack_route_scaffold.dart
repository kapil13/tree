import 'package:flutter/material.dart';

import 'app_drawer.dart';
import 'prototype/prototype_ui.dart';
import 'shell_scaffold.dart';

/// App bar for pushed stack routes: back when possible, drawer in actions.
PreferredSizeWidget stackBackAppBar(
  BuildContext context, {
  required String title,
  List<Widget>? actions,
}) {
  if (Navigator.of(context).canPop()) {
    return PrototypeBackBar(title: title, actions: actions);
  }
  return ShellTopBar(title: title, actions: actions ?? const []);
}

/// Scaffold for authenticated stack routes (no bottom tabs) with left drawer.
Scaffold stackRouteScaffold({
  required String location,
  required PreferredSizeWidget appBar,
  required Widget body,
  Widget? floatingActionButton,
  Widget? bottomNavigationBar,
  bool resizeToAvoidBottomInset = true,
  bool extendBodyBehindAppBar = false,
}) {
  return Scaffold(
    drawer: AppDrawer(currentLocation: location),
    appBar: appBar,
    body: body,
    floatingActionButton: floatingActionButton,
    bottomNavigationBar: bottomNavigationBar,
    resizeToAvoidBottomInset: resizeToAvoidBottomInset,
    extendBodyBehindAppBar: extendBodyBehindAppBar,
  );
}
