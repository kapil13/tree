import 'package:flutter/material.dart';

import 'app_drawer.dart';

/// Scaffold for authenticated stack routes (no bottom tabs) with left drawer.
Scaffold stackRouteScaffold({
  required String location,
  required PreferredSizeWidget appBar,
  required Widget body,
  Widget? floatingActionButton,
  Widget? bottomNavigationBar,
}) {
  return Scaffold(
    drawer: AppDrawer(currentLocation: location),
    appBar: appBar,
    body: body,
    floatingActionButton: floatingActionButton,
    bottomNavigationBar: bottomNavigationBar,
  );
}
