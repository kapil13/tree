import 'dart:async';

import 'package:byot_mobile/l10n/app_localizations.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:image_picker/image_picker.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:uuid/uuid.dart';

import '../api/api_errors.dart';
import '../api/auth_redirect.dart';
import '../location_helper.dart';
import '../providers.dart';
import '../theme.dart';
import '../widgets/prototype/prototype_ui.dart';
import '../widgets/session_aware_error.dart';
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
  final List<String> _localPhotoPaths = [];
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
      final sync = ref.read(auditVisitSyncProvider);
      if (await sync.isOnline()) {
        final api = await ref.read(apiClientProvider.future);
        final key = await api.uploadImageFile(image.path, filename: image.name);
        if (!mounted) return;
        setState(() => _photoKeys.add(key));
      } else {
        if (!mounted) return;
        setState(() => _localPhotoPaths.add(image.path));
      }
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _localPhotoPaths.add(image.path);
        _error = null;
      });
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
    final l10n = AppLocalizations.of(context)!;
    if (_gps == null) {
      setState(() => _error = l10n.auditGpsRequired);
      return;
    }
    if (_photoKeys.isEmpty && _localPhotoPaths.isEmpty) {
      setState(() => _error = l10n.auditPhotoRequired);
      return;
    }
    setState(() {
      _saving = true;
      _error = null;
    });
    try {
      final sync = ref.read(auditVisitSyncProvider);
      final payload = {
        'engagement_id': plot['engagement_id'] as String,
        'plot_id': plot['plot_id'] as String,
        'tree_presence': _treePresence,
        'photo_keys': _photoKeys,
        'visitor_lat': _gps!.latitude,
        'visitor_lon': _gps!.longitude,
        'trees_observed': int.tryParse(_treesObservedController.text.trim()),
        'trees_alive': int.tryParse(_treesAliveController.text.trim()),
        'verification_outcome': _outcome,
        'notes': _notesController.text.trim(),
        'plot_code': plot['plot_code'],
      };

      final queuedOffline = _localPhotoPaths.isNotEmpty || !await sync.isOnline();
      if (!queuedOffline) {
        final api = await ref.read(apiClientProvider.future);
        await api.recordAuditFieldVisit(
          engagementId: payload['engagement_id'] as String,
          plotId: payload['plot_id'] as String,
          treePresence: _treePresence,
          photoKeys: _photoKeys,
          visitorLat: _gps!.latitude,
          visitorLon: _gps!.longitude,
          treesObserved: payload['trees_observed'] as int?,
          treesAlive: payload['trees_alive'] as int?,
          verificationOutcome: _outcome,
          notes: payload['notes'] as String?,
        );
      } else {
        final queue = ref.read(auditVisitQueueProvider);
        await queue.enqueue(
          id: const Uuid().v4(),
          payload: payload,
          localPhotoPaths: _localPhotoPaths,
        );
        unawaited(sync.syncAll(() => ref.read(apiClientProvider.future)));
      }
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
        _localPhotoPaths.clear();
        _gps = null;
        _saving = false;
      });
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            queuedOffline ? l10n.auditVisitQueued : l10n.auditVisitSaved,
          ),
        ),
      );
    } catch (e) {
      if (maybeRedirectUnauthorized(ref, context, e)) return;
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
      appBar: PrototypeBackBar(title: l10n.auditPlotVisits),
      body: queueAsync.when(
        loading: () => const Center(child: CircularProgressIndicator(color: PrototypeColors.brandCanopy)),
        error: (e, _) => SessionAwareErrorView(
          error: e,
          onRetry: () => ref.invalidate(auditFieldPlotQueueProvider),
        ),
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
                  l10n.auditPlotsWaiting((queue['total_due'] as num?)?.toInt() ?? items.length),
                  style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                        color: AranyixColors.onSurfaceMuted,
                      ),
                ),
                const SizedBox(height: 12),
                if (items.isEmpty)
                  Text(
                    l10n.auditPlotsAllVisitedShort,
                    style: const TextStyle(color: AranyixColors.onSurfaceMuted),
                  )
                else
                  for (final plot in items) _AuditPlotCard(
                    plot: plot,
                    l10n: l10n,
                    onNavigate: () => _openMaps(plot),
                    onStartVisit: () {
                      setState(() {
                        _activePlot = plot;
                        _gps = null;
                        _photoKeys.clear();
                        _localPhotoPaths.clear();
                      });
                      _captureGps();
                    },
                  ),
                if (_activePlot != null) ...[
                  const SizedBox(height: 16),
                  Text(
                    l10n.auditVisitTitle('${_activePlot!['plot_code']}'),
                    style: Theme.of(context).textTheme.titleMedium,
                  ),
                  const SizedBox(height: 8),
                  Row(
                    children: [
                      OutlinedButton.icon(
                        onPressed: _gpsBusy ? null : _captureGps,
                        icon: const Icon(Icons.my_location, size: 18),
                        label: Text(_gpsBusy ? l10n.auditCapturingGps : l10n.refreshGps),
                      ),
                      const SizedBox(width: 8),
                      OutlinedButton.icon(
                        onPressed: () => _openMaps(_activePlot!),
                        icon: const Icon(Icons.map_outlined, size: 18),
                        label: Text(l10n.auditPlotNavigate),
                      ),
                    ],
                  ),
                  if (_gps != null)
                    Padding(
                      padding: const EdgeInsets.only(top: 8),
                      child: Text(
                        l10n.syncQueueGpsLine(
                          _gps!.latitude.toStringAsFixed(5),
                          _gps!.longitude.toStringAsFixed(5),
                        ),
                        style: const TextStyle(color: Colors.green, fontSize: 12),
                      ),
                    ),
                  const SizedBox(height: 8),
                  DropdownButtonFormField<String>(
                    value: _treePresence,
                    decoration: InputDecoration(labelText: l10n.auditTreePresence),
                    items: [
                      DropdownMenuItem(value: 'present', child: Text(l10n.auditTreesPresent)),
                      DropdownMenuItem(value: 'absent', child: Text(l10n.auditTreesAbsent)),
                      DropdownMenuItem(value: 'sparse', child: Text(l10n.auditTreesSparse)),
                      DropdownMenuItem(value: 'not_assessable', child: Text(l10n.auditCannotAssess)),
                    ],
                    onChanged: (v) => setState(() => _treePresence = v ?? 'present'),
                  ),
                  const SizedBox(height: 8),
                  TextField(
                    controller: _treesObservedController,
                    keyboardType: TextInputType.number,
                    decoration: InputDecoration(labelText: l10n.auditTreesObserved),
                  ),
                  const SizedBox(height: 8),
                  TextField(
                    controller: _treesAliveController,
                    keyboardType: TextInputType.number,
                    decoration: InputDecoration(labelText: l10n.auditTreesAlive),
                  ),
                  const SizedBox(height: 8),
                  DropdownButtonFormField<String>(
                    value: _outcome,
                    decoration: InputDecoration(labelText: l10n.auditOutcome),
                    items: [
                      DropdownMenuItem(value: 'inconclusive', child: Text(l10n.auditOutcomeInconclusive)),
                      DropdownMenuItem(value: 'claim_supported', child: Text(l10n.auditOutcomeSupported)),
                      DropdownMenuItem(value: 'claim_unsupported', child: Text(l10n.auditOutcomeUnsupported)),
                    ],
                    onChanged: (v) => setState(() => _outcome = v ?? 'inconclusive'),
                  ),
                  const SizedBox(height: 8),
                  TextField(
                    controller: _notesController,
                    maxLines: 3,
                    decoration: InputDecoration(labelText: l10n.auditFieldNotes),
                  ),
                  const SizedBox(height: 8),
                  OutlinedButton.icon(
                    onPressed:
                        _photoBusy || (_photoKeys.length + _localPhotoPaths.length) >= 5
                            ? null
                            : _addPhoto,
                    icon: const Icon(Icons.camera_alt_outlined, size: 18),
                    label: Text(
                      _photoBusy
                          ? l10n.auditUploadingPhoto
                          : l10n.auditAddFieldPhoto(_photoKeys.length + _localPhotoPaths.length),
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
                        child: Text(_saving ? l10n.saving : l10n.auditSaveVisit),
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

class _AuditPlotCard extends StatelessWidget {
  const _AuditPlotCard({
    required this.plot,
    required this.l10n,
    required this.onNavigate,
    required this.onStartVisit,
  });

  final Map<String, dynamic> plot;
  final AppLocalizations l10n;
  final VoidCallback onNavigate;
  final VoidCallback onStartVisit;

  @override
  Widget build(BuildContext context) {
    final code = plot['plot_code'] as String? ?? l10n.plotFallback;
    final project = plot['project_name'] as String? ?? '';
    final risk = plot['risk_level'] as String? ?? '';
    return Card(
      margin: const EdgeInsets.only(bottom: 10),
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              code,
              style: Theme.of(context).textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.w700,
                    color: AranyixColors.forestDark,
                  ),
            ),
            const SizedBox(height: 4),
            Text(
              [
                if (project.isNotEmpty) project,
                if (risk.isNotEmpty) l10n.auditRiskSuffix(risk),
              ].join(' · '),
              style: Theme.of(context).textTheme.bodySmall?.copyWith(
                    color: AranyixColors.onSurfaceMuted,
                  ),
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                OutlinedButton.icon(
                  onPressed: onNavigate,
                  icon: const Icon(Icons.navigation_outlined, size: 18),
                  label: Text(l10n.auditPlotNavigate),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: FilledButton(
                    onPressed: onStartVisit,
                    child: Text(l10n.auditPlotStartVisit),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
