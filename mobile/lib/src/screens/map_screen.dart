import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:latlong2/latlong.dart';

import '../api/api_errors.dart';
import '../providers.dart';

class MapScreen extends ConsumerWidget {
  const MapScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final treesAsync = ref.watch(treesProvider);
    return Scaffold(
      appBar: AppBar(title: const Text('Map')),
      body: treesAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(apiErrorMessage(e), textAlign: TextAlign.center),
                const SizedBox(height: 12),
                FilledButton(
                  onPressed: () => ref.invalidate(treesProvider),
                  child: const Text('Retry'),
                ),
              ],
            ),
          ),
        ),
        data: (items) {
          final points = <LatLng>[];
          final markers = <Marker>[];
          for (final raw in items) {
            final t = raw as Map<String, dynamic>;
            final lat = (t['latitude'] as num?)?.toDouble();
            final lon = (t['longitude'] as num?)?.toDouble();
            if (lat == null || lon == null) continue;
            final point = LatLng(lat, lon);
            points.add(point);
            markers.add(
              Marker(
                point: point,
                width: 40,
                height: 40,
                child: GestureDetector(
                  onTap: () => context.push('/trees/${t['id']}'),
                  child: const Icon(Icons.park, color: Color(0xFF15803D), size: 32),
                ),
              ),
            );
          }
          final center = points.isNotEmpty
              ? LatLng(
                  points.map((p) => p.latitude).reduce((a, b) => a + b) / points.length,
                  points.map((p) => p.longitude).reduce((a, b) => a + b) / points.length,
                )
              : const LatLng(17.385, 78.4867); // Hyderabad default
          return Stack(
            children: [
              FlutterMap(
                options: MapOptions(
                  initialCenter: center,
                  initialZoom: points.length == 1 ? 14 : 11,
                ),
                children: [
                  TileLayer(
                    urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
                    userAgentPackageName: 'earth.byot.mobile',
                  ),
                  MarkerLayer(markers: markers),
                ],
              ),
              if (points.isEmpty)
                const Align(
                  alignment: Alignment.bottomCenter,
                  child: Padding(
                    padding: EdgeInsets.all(16),
                    child: Card(
                      child: Padding(
                        padding: EdgeInsets.all(12),
                        child: Text('No trees with GPS yet. Add a tree to see it on the map.'),
                      ),
                    ),
                  ),
                ),
            ],
          );
        },
      ),
    );
  }
}
