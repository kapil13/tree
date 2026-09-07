import 'package:byot_mobile/l10n/app_localizations.dart';
import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:latlong2/latlong.dart';

import '../api/api_errors.dart';
import '../nav_access.dart';
import '../providers.dart';
import '../session.dart';
import '../theme.dart';
import '../widgets/prototype/prototype_ui.dart';
import '../widgets/shell_scaffold.dart';

enum _DrawMode { none, polygon, corridor }

enum _MapLayer { trees, workAreas, alerts }

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
  final Set<_MapLayer> _activeLayers = {_MapLayer.trees, _MapLayer.workAreas};
  Map<String, dynamic>? _selectedTree;
  Map<String, dynamic>? _selectedAlert;

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

  void _closePinSheet() {
    setState(() {
      _selectedTree = null;
      _selectedAlert = null;
    });
  }

  void _toggleLayer(String key) {
    final layer = switch (key) {
      'Trees' => _MapLayer.trees,
      'Work areas' => _MapLayer.workAreas,
      'Alerts' => _MapLayer.alerts,
      _ => null,
    };
    if (layer == null) return;
    setState(() {
      if (_activeLayers.contains(layer)) {
        _activeLayers.remove(layer);
      } else {
        _activeLayers.add(layer);
      }
      if (layer == _MapLayer.alerts && !_activeLayers.contains(_MapLayer.alerts)) {
        _selectedAlert = null;
      }
      if (layer == _MapLayer.trees && !_activeLayers.contains(_MapLayer.trees)) {
        _selectedTree = null;
      }
    });
  }

  String _treeHealthLabel(Map<String, dynamic> tree) {
    final status = tree['health_status'] as String? ?? tree['status'] as String?;
    if (status == null || status.isEmpty) return 'Healthy';
    return status.replaceAll('_', ' ');
  }

  String _treeHealthVariant(Map<String, dynamic> tree) {
    final status = (tree['health_status'] as String? ?? tree['status'] as String? ?? '').toLowerCase();
    if (status.contains('critical') || status.contains('dead')) return 'danger';
    if (status.contains('stress') || status.contains('warn')) return 'warn';
    return 'ok';
  }

  LatLng? _alertPoint(Map<String, dynamic> alert, List<dynamic> trees) {
    final payload = alert['payload'] as Map<String, dynamic>?;
    final lat = (payload?['latitude'] as num?)?.toDouble() ?? (payload?['lat'] as num?)?.toDouble();
    final lon = (payload?['longitude'] as num?)?.toDouble() ?? (payload?['lon'] as num?)?.toDouble();
    if (lat != null && lon != null) return LatLng(lat, lon);
    final treeId = alert['tree_id'] as String?;
    if (treeId == null) return null;
    for (final raw in trees) {
      final t = raw as Map<String, dynamic>;
      if (t['id'] == treeId) {
        final tLat = (t['latitude'] as num?)?.toDouble();
        final tLon = (t['longitude'] as num?)?.toDouble();
        if (tLat != null && tLon != null) return LatLng(tLat, tLon);
      }
    }
    return null;
  }

  Color _alertColor(String? severity) {
    switch (severity) {
      case 'critical':
        return const Color(0xFFDC2626);
      case 'high':
        return const Color(0xFFEA580C);
      default:
        return const Color(0xFFD97706);
    }
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
    final l10n = AppLocalizations.of(context)!;
    if (_drawPoints.length < 2) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(l10n.needTwoPoints)),
      );
      return;
    }
    if (_mode == _DrawMode.polygon && _drawPoints.length < 3) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(l10n.polygonNeedsThree)),
      );
      return;
    }

    final projects = await ref.read(plantingProjectsProvider.future);
    if (!mounted) return;
    if (projects.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(l10n.createProjectFirst)),
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
        final sheetL10n = AppLocalizations.of(ctx)!;
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
                    _mode == _DrawMode.corridor ? sheetL10n.saveCorridor : sheetL10n.savePolygonWorkArea,
                    style: Theme.of(ctx).textTheme.titleLarge,
                  ),
                  const SizedBox(height: 12),
                  TextField(
                    controller: nameCtrl,
                    decoration: InputDecoration(labelText: sheetL10n.nameLabel),
                  ),
                  const SizedBox(height: 12),
                  DropdownButtonFormField<String>(
                    value: projectId,
                    decoration: InputDecoration(labelText: sheetL10n.projectLabel),
                    items: [
                      for (final raw in projects)
                        DropdownMenuItem(
                          value: (raw as Map)['id'] as String,
                          child: Text(raw['name'] as String? ?? sheetL10n.projectFallback),
                        ),
                    ],
                    onChanged: (v) => setSheet(() => projectId = v),
                  ),
                  if (_mode == _DrawMode.corridor) ...[
                    const SizedBox(height: 12),
                    TextField(
                      controller: bufferCtrl,
                      decoration: InputDecoration(labelText: sheetL10n.bufferMLabel),
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
                    child: Text(_saving ? sheetL10n.saving : sheetL10n.saveWorkArea),
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
    final l10n = AppLocalizations.of(context)!;
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
          SnackBar(content: Text(l10n.workAreaSaved)),
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
    final alertsAsync = ref.watch(alertsProvider);
    final canDraw = canDrawOnMap(user);
    final showFieldOps = canSeeFieldOps(user) && (isSupervisor(user) || canSeeExecutiveHome(user));

    final l10n = AppLocalizations.of(context)!;

    return Scaffold(
      appBar: ShellTopBar(
        title: _mode == _DrawMode.none
            ? l10n.map
            : _mode == _DrawMode.polygon
                ? l10n.drawPolygon
                : l10n.drawCorridor,
        actions: [
          if (showFieldOps)
            IconButton(
              tooltip: l10n.fieldOps,
              onPressed: () => context.go('/field'),
              icon: const Icon(Icons.construction_outlined),
            ),
          if (_mode != _DrawMode.none) ...[
            IconButton(
              tooltip: l10n.undoPoint,
              onPressed: _drawPoints.isEmpty
                  ? null
                  : () => setState(() => _drawPoints.removeLast()),
              icon: const Icon(Icons.undo),
            ),
            IconButton(
              tooltip: l10n.cancelDraw,
              onPressed: () => setState(() {
                _mode = _DrawMode.none;
                _drawPoints.clear();
              }),
              icon: const Icon(Icons.close),
            ),
            IconButton(
              tooltip: l10n.save,
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
                  child: Text(l10n.retry),
                ),
              ],
            ),
          ),
        ),
        data: (items) {
          final points = <LatLng>[];
          final markers = <Marker>[];
          final showTrees = _activeLayers.contains(_MapLayer.trees);
          final showWorkAreas = _activeLayers.contains(_MapLayer.workAreas);
          final showAlerts = _activeLayers.contains(_MapLayer.alerts);
          final alerts = alertsAsync.maybeWhen(data: (d) => d, orElse: () => <dynamic>[]);

          if (showTrees) {
            for (final raw in items) {
              final t = raw as Map<String, dynamic>;
              final lat = (t['latitude'] as num?)?.toDouble();
              final lon = (t['longitude'] as num?)?.toDouble();
              if (lat == null || lon == null) continue;
              final point = LatLng(lat, lon);
              points.add(point);
              final selected = _selectedTree?['id'] == t['id'];
              markers.add(
                Marker(
                  point: point,
                  width: selected ? 48 : 40,
                  height: selected ? 48 : 40,
                  child: GestureDetector(
                    onTap: _mode != _DrawMode.none
                        ? null
                        : () => setState(() {
                              _selectedAlert = null;
                              _selectedTree = t;
                            }),
                    child: Icon(
                      Icons.park,
                      color: selected ? const Color(0xFF14532D) : const Color(0xFF15803D),
                      size: selected ? 36 : 32,
                    ),
                  ),
                ),
              );
            }
          }

          if (showAlerts) {
            for (final raw in alerts) {
              final alert = raw as Map<String, dynamic>;
              final point = _alertPoint(alert, items);
              if (point == null) continue;
              final selected = _selectedAlert?['id'] == alert['id'];
              markers.add(
                Marker(
                  point: point,
                  width: selected ? 36 : 30,
                  height: selected ? 36 : 30,
                  child: GestureDetector(
                    onTap: _mode != _DrawMode.none
                        ? null
                        : () => setState(() {
                              _selectedTree = null;
                              _selectedAlert = alert;
                            }),
                    child: Container(
                      decoration: BoxDecoration(
                        color: _alertColor(alert['severity'] as String?),
                        shape: BoxShape.circle,
                        border: Border.all(color: Colors.white, width: selected ? 3 : 2),
                        boxShadow: selected
                            ? [BoxShadow(color: _alertColor(alert['severity'] as String?).withValues(alpha: 0.45), blurRadius: 10)]
                            : null,
                      ),
                      alignment: Alignment.center,
                      child: const Text('!', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w800, fontSize: 14)),
                    ),
                  ),
                ),
              );
            }
          }

          final fences = fencesAsync.maybeWhen(data: (d) => d, orElse: () => <dynamic>[]);
          final fencePolygons = showWorkAreas ? _fencePolygons(fences) : <Polygon>[];
          final fenceLines = showWorkAreas ? _fencePolylines(fences) : <Polyline>[];

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
                    if (_mode == _DrawMode.none) {
                      _closePinSheet();
                      return;
                    }
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
              if (points.isEmpty && _mode == _DrawMode.none && !showAlerts)
                Align(
                  alignment: Alignment.bottomCenter,
                  child: Padding(
                    padding: EdgeInsets.fromLTRB(16, 16, 16, (_selectedTree != null || _selectedAlert != null) ? 200 : 88),
                    child: Card(
                      child: Padding(
                        padding: const EdgeInsets.all(12),
                        child: Text(l10n.noTreesOnMap),
                      ),
                    ),
                  ),
                ),
              if (_mode == _DrawMode.none)
                Positioned(
                  left: 16,
                  right: 16,
                  top: 8,
                  child: PrototypeMapLayerChips(
                    layers: {
                      'Trees': showTrees,
                      'Work areas': showWorkAreas,
                      'Alerts': showAlerts,
                    },
                    onToggle: _toggleLayer,
                  ),
                ),
              if (_selectedTree != null && _mode == _DrawMode.none)
                Align(
                  alignment: Alignment.bottomCenter,
                  child: PrototypeMapPinSheet(
                    code: _selectedTree!['public_code'] as String? ?? _selectedTree!['code'] as String?,
                    title: _selectedTree!['species_text'] as String? ?? 'Tree',
                    subtitle: _selectedTree!['work_area_name'] as String? ??
                        _selectedTree!['project_name'] as String? ??
                        'Registered tree',
                    healthLabel: _treeHealthLabel(_selectedTree!),
                    healthVariant: _treeHealthVariant(_selectedTree!),
                    onPrimary: () => context.push('/trees/${_selectedTree!['id']}'),
                    onClose: _closePinSheet,
                  ),
                ),
              if (_selectedAlert != null && _mode == _DrawMode.none)
                Align(
                  alignment: Alignment.bottomCenter,
                  child: PrototypeMapPinSheet(
                    title: _selectedAlert!['title'] as String? ?? 'Alert',
                    subtitle: _selectedAlert!['message'] as String? ?? '',
                    accentColor: _alertColor(_selectedAlert!['severity'] as String?),
                    primaryLabel: 'View alert',
                    onPrimary: () => context.push('/alerts/${_selectedAlert!['id']}'),
                    onClose: _closePinSheet,
                  ),
                ),
              Positioned(
                right: 16,
                bottom: (_selectedTree != null || _selectedAlert != null) ? 200 : 24,
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    if (canAddTrees(user))
                      FloatingActionButton.small(
                        heroTag: 'map_add_tree',
                        tooltip: l10n.addTreeTooltip,
                        onPressed: () => context.push('/trees/new'),
                        child: const Icon(Icons.add),
                      ),
                    if (canDraw) ...[
                      const SizedBox(height: 10),
                      FloatingActionButton.small(
                        heroTag: 'map_polygon',
                        backgroundColor: _mode == _DrawMode.polygon ? AranyixColors.forest : null,
                        foregroundColor: _mode == _DrawMode.polygon ? Colors.white : null,
                        tooltip: l10n.polygonModeTooltip,
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
                        tooltip: l10n.corridorModeTooltip,
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
