import 'package:byot_mobile/l10n/app_localizations.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../api/api_errors.dart';
import '../nav_access.dart';
import '../providers.dart';
import '../session.dart';
import '../theme.dart';
import '../widgets/shell_scaffold.dart';

enum _DrawMode { none, polygon, corridor }

class MapScreen extends ConsumerStatefulWidget {
  const MapScreen({super.key});

  @override
  ConsumerState<MapScreen> createState() => _MapScreenState();
}

class _MapScreenState extends ConsumerState<MapScreen> {
  final _mapController = MapController();
  _DrawMode _mode = _DrawMode.none;
  final List<LatLng> _drawPoints = [];
  bool _saving = false;
  /// Initial Hyderabad viewport until the map reports visible bounds.
  String _viewportBbox = '77.2,17.2,78.6,17.6';

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _syncViewportBbox());
  }

  void _syncViewportBbox() {
    if (!mounted) return;
    final bounds = _mapController.camera.visibleBounds;
    final bbox =
        '${bounds.west},${bounds.south},${bounds.east},${bounds.north}';
    if (bbox != _viewportBbox) {
      setState(() => _viewportBbox = bbox);
    }
  }

  @override
  void dispose() {
    _mapController.dispose();
    super.dispose();
  }

  List<Polygon> _fencePolygons(List<dynamic> fences) {
    final polygons = <Polygon>[];
    for (final raw in fences) {
      final fence = raw as Map<String, dynamic>;
      final boundary = fence['boundary'] as Map<String, dynamic>?;
      final rings = boundary?['coordinates'] as List?;
      if (rings == null || rings.isEmpty) continue;
      final ring = rings.first as List;
      final points = <LatLng>[];
      for (final c in ring) {
        if (c is List && c.length >= 2) {
          points.add(LatLng((c[1] as num).toDouble(), (c[0] as num).toDouble()));
        }
      }
      if (points.length >= 3) {
        polygons.add(
          Polygon(
            points: points,
            color: AranyixColors.forest.withValues(alpha: 0.12),
            borderColor: AranyixColors.forest,
            borderStrokeWidth: 2,
          ),
        );
      }
    }
    return polygons;
  }

  List<Polyline> _fencePolylines(List<dynamic> fences) {
    final lines = <Polyline>[];
    for (final raw in fences) {
      final fence = raw as Map<String, dynamic>;
      final centerline = fence['centerline'] as Map<String, dynamic>?;
      final coords = centerline?['coordinates'] as List?;
      if (coords == null || coords.length < 2) continue;
      final points = <LatLng>[];
      for (final c in coords) {
        if (c is List && c.length >= 2) {
          points.add(LatLng((c[1] as num).toDouble(), (c[0] as num).toDouble()));
        }
      }
      if (points.length >= 2) {
        lines.add(
          Polyline(
            points: points,
            color: AranyixColors.forestDark,
            strokeWidth: 3,
          ),
        );
      }
    }
    return lines;
  }

  Future<void> _openSaveSheet() async {
    if (_drawPoints.length < 2) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Add at least 2 points on the map')),
      );
      return;
    }
    if (_mode == _DrawMode.polygon && _drawPoints.length < 3) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Polygon needs at least 3 points')),
      );
      return;
    }

    final projects = await ref.read(plantingProjectsProvider.future);
    if (!mounted) return;
    if (projects.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Create or join a planting project first')),
      );
      return;
    }

    final nameCtrl = TextEditingController();
    final bufferCtrl = TextEditingController(text: '8');
    String? projectId = (projects.first as Map)['id'] as String?;

    final saved = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      backgroundColor: AranyixColors.surfaceContainer,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(AranyixRadii.card)),
      ),
      builder: (ctx) {
        return Padding(
          padding: EdgeInsets.only(
            left: 20,
            right: 20,
            top: 20,
            bottom: MediaQuery.of(ctx).viewInsets.bottom + 20,
          ),
          child: StatefulBuilder(
            builder: (ctx, setSheet) {
              return Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Text(
                    _mode == _DrawMode.corridor ? 'Save corridor' : 'Save polygon work area',
                    style: Theme.of(ctx).textTheme.titleLarge,
                  ),
                  const SizedBox(height: 12),
                  TextField(
                    controller: nameCtrl,
                    decoration: const InputDecoration(labelText: 'Name'),
                  ),
                  const SizedBox(height: 12),
                  DropdownButtonFormField<String>(
                    value: projectId,
                    decoration: const InputDecoration(labelText: 'Project'),
                    items: [
                      for (final raw in projects)
                        DropdownMenuItem(
                          value: (raw as Map)['id'] as String,
                          child: Text(raw['name'] as String? ?? 'Project'),
                        ),
                    ],
                    onChanged: (v) => setSheet(() => projectId = v),
                  ),
                  if (_mode == _DrawMode.corridor) ...[
                    const SizedBox(height: 12),
                    TextField(
                      controller: bufferCtrl,
                      decoration: const InputDecoration(labelText: 'Buffer (m)'),
                      keyboardType: const TextInputType.numberWithOptions(decimal: true),
                    ),
                  ],
                  const SizedBox(height: 16),
                  FilledButton(
                    onPressed: _saving
                        ? null
                        : () async {
                            final name = nameCtrl.text.trim();
                            if (name.isEmpty || projectId == null) return;
                            Navigator.of(ctx).pop(true);
                            await _saveWorkArea(
                              projectId: projectId!,
                              name: name,
                              bufferM: double.tryParse(bufferCtrl.text.trim()) ?? 8,
                            );
                          },
                    child: Text(_saving ? 'Saving…' : 'Save work area'),
                  ),
                ],
              );
            },
          ),
        );
      },
    );

    nameCtrl.dispose();
    bufferCtrl.dispose();
    if (saved != true) return;
  }

  Future<void> _saveWorkArea({
    required String projectId,
    required String name,
    required double bufferM,
  }) async {
    setState(() => _saving = true);
    try {
      final api = await ref.read(apiClientProvider.future);
      final coords = _drawPoints.map((p) => [p.longitude, p.latitude]).toList();
      if (_mode == _DrawMode.polygon) {
        final ring = [...coords, coords.first];
        await api.createWorkArea(
          projectId,
          name: name,
          geometryType: 'polygon',
          boundary: {'type': 'Polygon', 'coordinates': [ring]},
        );
      } else {
        await api.createWorkArea(
          projectId,
          name: name,
          geometryType: 'corridor',
          centerline: {'type': 'LineString', 'coordinates': coords},
          bufferM: bufferM,
        );
      }
      if (mounted) {
        setState(() {
          _mode = _DrawMode.none;
          _drawPoints.clear();
        });
        ref.invalidate(plantationFencesProvider);
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Work area saved')),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(apiErrorMessage(e))),
        );
      }
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final user = sessionController.user;
    final bbox = _viewportBbox;
    final treesAsync = ref.watch(mapTreesProvider(bbox));
    final fencesAsync = ref.watch(plantationFencesProvider);
    final canDraw = canDrawOnMap(user);
    final showFieldOps = canSeeFieldOps(user) && (isSupervisor(user) || canSeeExecutiveHome(user));

    final l10n = AppLocalizations.of(context)!;

    return Scaffold(
      appBar: ShellTopBar(
        title: _mode == _DrawMode.none
            ? l10n.map
            : _mode == _DrawMode.polygon
                ? 'Draw polygon'
                : 'Draw corridor',
        actions: [
          if (showFieldOps)
            IconButton(
              tooltip: 'Field ops',
              onPressed: () => context.push('/field-ops'),
              icon: const Icon(Icons.construction_outlined),
            ),
          if (_mode != _DrawMode.none) ...[
            IconButton(
              tooltip: 'Undo point',
              onPressed: _drawPoints.isEmpty
                  ? null
                  : () => setState(() => _drawPoints.removeLast()),
              icon: const Icon(Icons.undo),
            ),
            IconButton(
              tooltip: 'Cancel draw',
              onPressed: () => setState(() {
                _mode = _DrawMode.none;
                _drawPoints.clear();
              }),
              icon: const Icon(Icons.close),
            ),
            IconButton(
              tooltip: 'Save',
              onPressed: _saving ? null : _openSaveSheet,
              icon: const Icon(Icons.check),
            ),
          ],
        ],
      ),
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
                  onPressed: () => ref.invalidate(mapTreesProvider(bbox)),
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
                  onTap: _mode != _DrawMode.none ? null : () => context.push('/trees/${t['id']}'),
                  child: const Icon(Icons.park, color: Color(0xFF15803D), size: 32),
                ),
              ),
            );
          }

          final fences = fencesAsync.maybeWhen(data: (d) => d, orElse: () => <dynamic>[]);
          final fencePolygons = _fencePolygons(fences);
          final fenceLines = _fencePolylines(fences);

          final drawPolygons = <Polygon>[];
          final drawLines = <Polyline>[];
          if (_mode == _DrawMode.polygon && _drawPoints.length >= 2) {
            drawPolygons.add(
              Polygon(
                points: _drawPoints,
                color: Colors.orange.withValues(alpha: 0.2),
                borderColor: Colors.orange.shade800,
                borderStrokeWidth: 2,
              ),
            );
          }
          if (_mode == _DrawMode.corridor && _drawPoints.length >= 2) {
            drawLines.add(
              Polyline(
                points: _drawPoints,
                color: Colors.orange.shade800,
                strokeWidth: 3,
              ),
            );
          }
          for (final p in _drawPoints) {
            markers.add(
              Marker(
                point: p,
                width: 16,
                height: 16,
                child: Container(
                  decoration: BoxDecoration(
                    color: Colors.orange.shade800,
                    shape: BoxShape.circle,
                    border: Border.all(color: Colors.white, width: 2),
                  ),
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
                  onMapEvent: (event) {
                    if (event is MapEventMoveEnd) {
                      _syncViewportBbox();
                    }
                  },
                  onTap: (tap, latLng) {
                    if (_mode == _DrawMode.none) return;
                    setState(() => _drawPoints.add(latLng));
                  },
                ),
                children: [
                  TileLayer(
                    urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
                    userAgentPackageName: 'earth.byot.mobile',
                  ),
                  if (fencePolygons.isNotEmpty) PolygonLayer(polygons: fencePolygons),
                  if (fenceLines.isNotEmpty) PolylineLayer(polylines: fenceLines),
                  if (drawPolygons.isNotEmpty) PolygonLayer(polygons: drawPolygons),
                  if (drawLines.isNotEmpty) PolylineLayer(polylines: drawLines),
                  MarkerLayer(markers: markers),
                ],
              ),
              if (points.isEmpty && _mode == _DrawMode.none)
                const Align(
                  alignment: Alignment.bottomCenter,
                  child: Padding(
                    padding: EdgeInsets.fromLTRB(16, 16, 16, 88),
                    child: Card(
                      child: Padding(
                        padding: EdgeInsets.all(12),
                        child: Text('No trees with GPS yet. Add a tree to see it on the map.'),
                      ),
                    ),
                  ),
                ),
              Positioned(
                right: 16,
                bottom: 24,
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    if (canAddTrees(user))
                      FloatingActionButton.small(
                        heroTag: 'map_add_tree',
                        tooltip: 'Add tree',
                        onPressed: () => context.push('/trees/new'),
                        child: const Icon(Icons.add),
                      ),
                    if (canDraw) ...[
                      const SizedBox(height: 10),
                      FloatingActionButton.small(
                        heroTag: 'map_polygon',
                        backgroundColor: _mode == _DrawMode.polygon ? AranyixColors.forest : null,
                        foregroundColor: _mode == _DrawMode.polygon ? Colors.white : null,
                        tooltip: 'Polygon mode',
                        onPressed: () => setState(() {
                          _mode = _mode == _DrawMode.polygon ? _DrawMode.none : _DrawMode.polygon;
                          _drawPoints.clear();
                        }),
                        child: const Icon(Icons.pentagon_outlined),
                      ),
                      const SizedBox(height: 10),
                      FloatingActionButton.small(
                        heroTag: 'map_corridor',
                        backgroundColor: _mode == _DrawMode.corridor ? AranyixColors.forest : null,
                        foregroundColor: _mode == _DrawMode.corridor ? Colors.white : null,
                        tooltip: 'Corridor / linear mode',
                        onPressed: () => setState(() {
                          _mode = _mode == _DrawMode.corridor ? _DrawMode.none : _DrawMode.corridor;
                          _drawPoints.clear();
                        }),
                        child: const Icon(Icons.route),
                      ),
                    ],
                  ],
                ),
              ),
            ],
          );
        },
      ),
    );
  }
}
