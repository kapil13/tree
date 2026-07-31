import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:latlong2/latlong.dart';

import '../api/api_errors.dart';
import '../providers.dart';

/// Trees visible in the current map viewport (bbox-loaded, max 100 per request).
final mapTreesProvider = FutureProvider.autoDispose.family<List<dynamic>, String>((ref, bboxKey) async {
  final api = await ref.watch(apiClientProvider.future);
  if (bboxKey.isEmpty) {
    return api.listTrees(pageSize: 100);
  }
  return api.listTrees(bbox: bboxKey, pageSize: 100);
});

class MapScreen extends ConsumerStatefulWidget {
  const MapScreen({super.key});

  @override
  ConsumerState<MapScreen> createState() => _MapScreenState();
}

class _MapScreenState extends ConsumerState<MapScreen> {
  final MapController _mapController = MapController();
  String _bboxKey = '';

  String _bboxFromBounds(LatLngBounds bounds) {
    final sw = bounds.southWest;
    final ne = bounds.northEast;
    return '${sw.longitude},${sw.latitude},${ne.longitude},${ne.latitude}';
  }

  void _onMapReady() {
    final bounds = _mapController.camera.visibleBounds;
    setState(() => _bboxKey = _bboxFromBounds(bounds));
  }

  void _onMapMoved(MapEvent event) {
    if (event is! MapEventMoveEnd) return;
    final bounds = _mapController.camera.visibleBounds;
    final next = _bboxFromBounds(bounds);
    if (next != _bboxKey) {
      setState(() => _bboxKey = next);
    }
  }

  @override
  Widget build(BuildContext context) {
    final treesAsync = ref.watch(mapTreesProvider(_bboxKey));

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
                  onPressed: () => ref.invalidate(mapTreesProvider(_bboxKey)),
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
              : const LatLng(17.385, 78.4867);
          return Stack(
            children: [
              FlutterMap(
                mapController: _mapController,
                options: MapOptions(
                  initialCenter: center,
                  initialZoom: points.length == 1 ? 14 : 11,
                  onMapReady: _onMapReady,
                  onMapEvent: _onMapMoved,
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
                        child: Text('No trees in this map area. Pan/zoom or add a tree.'),
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
