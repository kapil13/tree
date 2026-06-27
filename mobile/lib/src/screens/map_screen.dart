import 'package:flutter/material.dart';

class MapScreen extends StatelessWidget {
  const MapScreen({super.key});
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Map')),
      body: const Center(
        child: Padding(
          padding: EdgeInsets.all(24),
          child: Text(
            'Mapbox map renders here.\nConfigure MAPBOX_ACCESS_TOKEN via --dart-define.',
            textAlign: TextAlign.center,
          ),
        ),
      ),
    );
  }
}
