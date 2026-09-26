import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../api/api_errors.dart';
import '../providers.dart';
import '../widgets/prototype/prototype_ui.dart';
import '../widgets/stack_route_scaffold.dart';

/// Satellite workspace — NDVI scans, SAR, Bhoonidhi (Phase F).
class SatelliteWorkspaceScreen extends ConsumerStatefulWidget {
  const SatelliteWorkspaceScreen({super.key, this.fenceId, this.projectId});

  final String? fenceId;
  final String? projectId;

  @override
  ConsumerState<SatelliteWorkspaceScreen> createState() => _SatelliteWorkspaceScreenState();
}

class _SatelliteWorkspaceScreenState extends ConsumerState<SatelliteWorkspaceScreen> {
  String? _selectedFenceId;
  bool _scanBusy = false;
  String? _status;

  @override
  void initState() {
    super.initState();
    _selectedFenceId = widget.fenceId;
  }

  Future<void> _runNdviScan() async {
    final fenceId = _selectedFenceId;
    if (fenceId == null) return;
    setState(() {
      _scanBusy = true;
      _status = 'Queuing NDVI scan…';
    });
    try {
      final api = await ref.read(apiClientProvider.future);
      await api.scanPlantationFence(fenceId);
      ref.invalidate(plantationFencesProvider);
      setState(() => _status = 'NDVI scan queued');
    } catch (e) {
      setState(() => _status = apiErrorMessage(e));
    } finally {
      if (mounted) setState(() => _scanBusy = false);
    }
  }

  Future<void> _runSarScan() async {
    final fenceId = _selectedFenceId;
    if (fenceId == null) return;
    setState(() {
      _scanBusy = true;
      _status = 'Running SAR scan…';
    });
    try {
      final api = await ref.read(apiClientProvider.future);
      await api.scanSarFence(fenceId);
      setState(() => _status = 'SAR scan complete');
    } catch (e) {
      setState(() => _status = apiErrorMessage(e));
    } finally {
      if (mounted) setState(() => _scanBusy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final fencesAsync = ref.watch(plantationFencesProvider);
    return stackRouteScaffold(
      location: '/satellite',
      appBar: PrototypeBackBar(title: 'Satellite workspace'),
      body: fencesAsync.when(
        loading: () => const Center(child: CircularProgressIndicator(color: PrototypeColors.brandCanopy)),
        error: (e, _) => Center(child: Text(apiErrorMessage(e))),
        data: (fences) {
          if (_selectedFenceId == null && fences.isNotEmpty) {
            _selectedFenceId = (fences.first as Map)['id'] as String?;
          }
          Map? selected;
          for (final f in fences) {
            if ((f as Map)['id'] == _selectedFenceId) {
              selected = f as Map;
              break;
            }
          }
          return ListView(
            padding: const EdgeInsets.all(16),
            children: [
              DropdownButtonFormField<String>(
                value: _selectedFenceId,
                decoration: const InputDecoration(labelText: 'Work area / fence'),
                items: fences
                    .map((f) {
                      final m = f as Map;
                      return DropdownMenuItem(
                        value: m['id'] as String?,
                        child: Text(m['name'] as String? ?? m['code'] as String? ?? 'Site'),
                      );
                    })
                    .toList(),
                onChanged: (v) => setState(() => _selectedFenceId = v),
              ),
              if (selected != null) ...[
                const SizedBox(height: 12),
                _kpiRow('Latest NDVI', '${selected['latest_ndvi_mean'] ?? '—'}'),
                _kpiRow('Last scan', selected['last_satellite_at'] as String? ?? 'Never'),
                _kpiRow('SAR status', selected['sar_status'] as String? ?? '—'),
              ],
              const SizedBox(height: 16),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: [
                  FilledButton(
                    onPressed: _scanBusy ? null : _runNdviScan,
                    child: const Text('Trigger NDVI scan'),
                  ),
                  OutlinedButton(
                    onPressed: _scanBusy ? null : _runSarScan,
                    child: const Text('Trigger SAR scan'),
                  ),
                  TextButton(
                    onPressed: _selectedFenceId == null
                        ? null
                        : () => context.push('/map?fence=$_selectedFenceId'),
                    child: const Text('View on map'),
                  ),
                ],
              ),
              if (_status != null) ...[
                const SizedBox(height: 12),
                Text(_status!, style: const TextStyle(fontSize: 13)),
              ],
              const SizedBox(height: 20),
              const Text('Bhoonidhi catalog', style: TextStyle(fontWeight: FontWeight.w600)),
              const SizedBox(height: 8),
              _BhoonidhiSection(fenceId: _selectedFenceId),
            ],
          );
        },
      ),
    );
  }

  Widget _kpiRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        children: [
          SizedBox(width: 120, child: Text(label, style: const TextStyle(color: PrototypeColors.textSecondary))),
          Expanded(child: Text(value)),
        ],
      ),
    );
  }
}

class _BhoonidhiSection extends ConsumerWidget {
  const _BhoonidhiSection({this.fenceId});
  final String? fenceId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    if (fenceId == null) return const Text('Select a work area');
    return FutureBuilder(
      future: ref.read(apiClientProvider.future).then((api) async {
        final status = await api.getBhoonidhiStatus();
        final catalog = await api.getBhoonidhiCatalog(fenceId!);
        return (status: status, catalog: catalog);
      }),
      builder: (context, snap) {
        if (!snap.hasData) return const LinearProgressIndicator();
        final status = snap.data!.status;
        final catalog = snap.data!.catalog;
        if (status['configured'] != true) {
          return const Text('Bhoonidhi not configured for this environment.');
        }
        if (catalog.isEmpty) return const Text('No catalog scenes for this fence.');
        return Column(
          children: catalog.take(5).map((item) {
            final m = item as Map;
            return ListTile(
              dense: true,
              title: Text(m['scene_id'] as String? ?? m['id'] as String? ?? 'Scene'),
              subtitle: Text(m['acquired_at'] as String? ?? ''),
            );
          }).toList(),
        );
      },
    );
  }
}
