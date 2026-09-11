import 'package:byot_mobile/l10n/app_localizations.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:image_picker/image_picker.dart';
import 'package:url_launcher/url_launcher.dart';

import '../api/api_errors.dart';
import '../location_helper.dart';
import '../providers.dart';
import '../theme.dart';
import '../widgets/stack_route_scaffold.dart';

class AuditPlotVisitScreen extends ConsumerStatefulWidget {
  const AuditPlotVisitScreen({super.key, this.plot});

  final Map<String, dynamic>? plot;

  @override
  ConsumerState<AuditPlotVisitScreen> createState() => _AuditPlotVisitScreenState();
}

class _AuditPlotVisitScreenState extends ConsumerState<AuditPlotVisitScreen> {
  Map<String, dynamic>? _activePlot;
  final _treesObservedController = TextEditingController();
  final _treesAliveController = TextEditingController();
  final _notesController = TextEditingController();
  String _treePresence = 'present';
  String _outcome = 'inconclusive';
  final List<String> _photoKeys = [];
  LocationCaptureResult? _gps;
  bool _saving = false;
  bool _gpsBusy = false;
  bool _photoBusy = false;
  String? _error;
  final _picker = ImagePicker();

  @override
  void initState() {
    super.initState();
    _activePlot = widget.plot;
  }

  @override
  void dispose() {
    _treesObservedController.dispose();
    _treesAliveController.dispose();
    _notesController.dispose();
    super.dispose();
  }

  Future<void> _captureGps() async {
    setState(() {
      _gpsBusy = true;
      _error = null;
    });
    try {
      final pos = await captureLocation();
      if (!mounted) return;
      setState(() => _gps = pos);
    } catch (e) {
      if (!mounted) return;
      setState(() => _error = e.toString());
    } finally {
      if (mounted) setState(() => _gpsBusy = false);
    }
  }

  Future<void> _addPhoto() async {
    final image = await _picker.pickImage(source: ImageSource.camera, imageQuality: 85);
    if (image == null) return;
    setState(() {
      _photoBusy = true;
      _error = null;
    });
    try {
      final api = await ref.read(apiClientProvider.future);
      final key = await api.uploadImageFile(image.path, filename: image.name);
      if (!mounted) return;
      setState(() => _photoKeys.add(key));
    } catch (e) {
      if (!mounted) return;
      setState(() => _error = apiErrorMessage(e));
    } finally {
      if (mounted) setState(() => _photoBusy = false);
    }
  }

  Future<void> _openMaps(Map<String, dynamic> plot) async {
    final center = plot['center'] as Map<String, dynamic>?;
    final coords = center?['coordinates'] as List?;
    if (coords == null || coords.length < 2) return;
    final lng = (coords[0] as num).toDouble();
    final lat = (coords[1] as num).toDouble();
    final uri = Uri.parse(
      'https://www.google.com/maps/dir/?api=1&destination=$lat,$lng',
    );
    await launchUrl(uri, mode: LaunchMode.externalApplication);
  }

  Future<void> _submitVisit() async {
    final plot = _activePlot;
    if (plot == null) return;
    if (_gps == null) {
      setState(() => _error = 'Capture GPS before saving the visit.');
      return;
    }
    if (_photoKeys.isEmpty) {
      setState(() => _error = 'Add at least one field photo.');
      return;
    }
    setState(() {
      _saving = true;
      _error = null;
    });
    try {
      final api = await ref.read(apiClientProvider.future);
      await api.recordAuditFieldVisit(
        engagementId: plot['engagement_id'] as String,
        plotId: plot['plot_id'] as String,
        treePresence: _treePresence,
        photoKeys: _photoKeys,
        visitorLat: _gps!.latitude,
        visitorLon: _gps!.longitude,
        treesObserved: int.tryParse(_treesObservedController.text.trim()),
        treesAlive: int.tryParse(_treesAliveController.text.trim()),
        verificationOutcome: _outcome,
        notes: _notesController.text.trim(),
      );
      ref.invalidate(auditFieldPlotQueueProvider);
      ref.invalidate(fieldOpsSummaryProvider);
      if (!mounted) return;
      setState(() {
        _activePlot = null;
        _treesObservedController.clear();
        _treesAliveController.clear();
        _notesController.clear();
        _treePresence = 'present';
        _outcome = 'inconclusive';
        _photoKeys.clear();
        _gps = null;
        _saving = false;
      });
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Audit plot visit saved')),
      );
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _saving = false;
        _error = apiErrorMessage(e);
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final queueAsync = ref.watch(auditFieldPlotQueueProvider);

    return stackRouteScaffold(
      location: '/audit-plots',
      appBar: AppBar(
        title: const Text('Estate Watch audit plots'),
        backgroundColor: AranyixColors.surface,
        foregroundColor: AranyixColors.forestDark,
      ),
      body: queueAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(child: Text(apiErrorMessage(e))),
        data: (queue) {
          final items = List<Map<String, dynamic>>.from(
            (queue['items'] as List?)?.map((e) => Map<String, dynamic>.from(e as Map)) ?? [],
          );

          return RefreshIndicator(
            color: AranyixColors.forest,
            onRefresh: () async => ref.invalidate(auditFieldPlotQueueProvider),
            child: ListView(
              padding: const EdgeInsets.all(16),
              children: [
                Text(
                  '${queue['total_due'] ?? items.length} plot(s) waiting for verifier visits',
                  style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                        color: AranyixColors.onSurfaceMuted,
                      ),
                ),
                const SizedBox(height: 12),
                if (items.isEmpty)
                  const Text(
                    'All assigned audit plots are visited for the current scope.',
                    style: TextStyle(color: AranyixColors.onSurfaceMuted),
                  )
                else
                  for (final plot in items)
                    Card(
                      margin: const EdgeInsets.only(bottom: 10),
                      child: ListTile(
                        title: Text(plot['plot_code'] as String? ?? 'Plot'),
                        subtitle: Text(
                          '${plot['project_name'] ?? ''} · ${plot['risk_level'] ?? ''} risk',
                        ),
                        trailing: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            IconButton(
                              tooltip: 'Navigate to plot',
                              icon: const Icon(Icons.navigation_outlined),
                              onPressed: () => _openMaps(plot),
                            ),
                            FilledButton(
                              onPressed: () {
                                setState(() {
                                  _activePlot = plot;
                                  _gps = null;
                                  _photoKeys.clear();
                                });
                                _captureGps();
                              },
                              child: Text(l10n.resolve),
                            ),
                          ],
                        ),
                      ),
                    ),
                if (_activePlot != null) ...[
                  const SizedBox(height: 16),
                  Text(
                    'Visit ${_activePlot!['plot_code']}',
                    style: Theme.of(context).textTheme.titleMedium,
                  ),
                  const SizedBox(height: 8),
                  Row(
                    children: [
                      OutlinedButton.icon(
                        onPressed: _gpsBusy ? null : _captureGps,
                        icon: const Icon(Icons.my_location, size: 18),
                        label: Text(_gpsBusy ? 'Capturing GPS…' : 'Refresh GPS'),
                      ),
                      const SizedBox(width: 8),
                      OutlinedButton.icon(
                        onPressed: () => _openMaps(_activePlot!),
                        icon: const Icon(Icons.map_outlined, size: 18),
                        label: const Text('Navigate'),
                      ),
                    ],
                  ),
                  if (_gps != null)
                    Padding(
                      padding: const EdgeInsets.only(top: 8),
                      child: Text(
                        'GPS: ${_gps!.latitude.toStringAsFixed(5)}, ${_gps!.longitude.toStringAsFixed(5)}',
                        style: const TextStyle(color: Colors.green, fontSize: 12),
                      ),
                    ),
                  const SizedBox(height: 8),
                  DropdownButtonFormField<String>(
                    value: _treePresence,
                    decoration: const InputDecoration(labelText: 'Tree presence'),
                    items: const [
                      DropdownMenuItem(value: 'present', child: Text('Trees present')),
                      DropdownMenuItem(value: 'absent', child: Text('No trees / bare ground')),
                      DropdownMenuItem(value: 'sparse', child: Text('Sparse / scattered')),
                      DropdownMenuItem(value: 'not_assessable', child: Text('Cannot assess')),
                    ],
                    onChanged: (v) => setState(() => _treePresence = v ?? 'present'),
                  ),
                  const SizedBox(height: 8),
                  TextField(
                    controller: _treesObservedController,
                    keyboardType: TextInputType.number,
                    decoration: const InputDecoration(labelText: 'Trees observed'),
                  ),
                  const SizedBox(height: 8),
                  TextField(
                    controller: _treesAliveController,
                    keyboardType: TextInputType.number,
                    decoration: const InputDecoration(labelText: 'Trees alive'),
                  ),
                  const SizedBox(height: 8),
                  DropdownButtonFormField<String>(
                    value: _outcome,
                    decoration: const InputDecoration(labelText: 'Outcome'),
                    items: const [
                      DropdownMenuItem(value: 'inconclusive', child: Text('Inconclusive')),
                      DropdownMenuItem(value: 'claim_supported', child: Text('Supported')),
                      DropdownMenuItem(value: 'claim_unsupported', child: Text('Unsupported')),
                    ],
                    onChanged: (v) => setState(() => _outcome = v ?? 'inconclusive'),
                  ),
                  const SizedBox(height: 8),
                  TextField(
                    controller: _notesController,
                    maxLines: 3,
                    decoration: const InputDecoration(labelText: 'Field notes'),
                  ),
                  const SizedBox(height: 8),
                  OutlinedButton.icon(
                    onPressed: _photoBusy || _photoKeys.length >= 5 ? null : _addPhoto,
                    icon: const Icon(Icons.camera_alt_outlined, size: 18),
                    label: Text(
                      _photoBusy
                          ? 'Uploading photo…'
                          : 'Add field photo (${_photoKeys.length}/5)',
                    ),
                  ),
                  if (_error != null) ...[
                    const SizedBox(height: 8),
                    Text(_error!, style: const TextStyle(color: Colors.red)),
                  ],
                  const SizedBox(height: 12),
                  Row(
                    children: [
                      FilledButton(
                        onPressed: _saving ? null : _submitVisit,
                        child: Text(_saving ? 'Saving…' : 'Save visit'),
                      ),
                      const SizedBox(width: 8),
                      TextButton(
                        onPressed: () => setState(() => _activePlot = null),
                        child: Text(l10n.cancel),
                      ),
                    ],
                  ),
                ],
              ],
            ),
          );
        },
      ),
    );
  }
}
