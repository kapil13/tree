import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:byot_mobile/l10n/app_localizations.dart';
import 'package:go_router/go_router.dart';
import 'package:image_picker/image_picker.dart';
import 'package:qr_flutter/qr_flutter.dart';
import 'package:share_plus/share_plus.dart';

import '../api/api_errors.dart';
import '../nav_access.dart';
import '../providers.dart';
import '../services/analytics_service.dart';
import '../session.dart';
import '../widgets/shell_scaffold.dart';
import '../widgets/stack_route_scaffold.dart';

class TreeDetailScreen extends ConsumerStatefulWidget {
  const TreeDetailScreen({super.key, required this.id});
  final String id;
  @override
  ConsumerState<TreeDetailScreen> createState() => _TreeDetailScreenState();
}

class _TreeDetailScreenState extends ConsumerState<TreeDetailScreen> {
  final _picker = ImagePicker();
  Map<String, dynamic>? tree;
  Map<String, dynamic>? satellite;
  String? _error;
  bool _loading = true;
  bool analyzing = false;
  bool satelliteBusy = false;
  bool photoBusy = false;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final api = await ref.read(apiClientProvider.future);
      final t = await api.getTree(widget.id);
      Map<String, dynamic>? sat;
      try {
        sat = await api.getSatelliteHealthLatest(widget.id);
      } catch (_) {
        // satellite health is optional
      }
      if (mounted) {
        setState(() {
          tree = t;
          satellite = sat;
          _loading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _error = apiErrorMessage(e);
          _loading = false;
        });
      }
    }
  }

  Future<void> _analyze() async {
    setState(() => analyzing = true);
    try {
      final api = await ref.read(apiClientProvider.future);
      await api.runAnalysis(widget.id);
      await _load();
      ref.invalidate(treesProvider);
      ref.invalidate(dashboardProvider);
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(apiErrorMessage(e))),
        );
      }
    } finally {
      if (mounted) setState(() => analyzing = false);
    }
  }

  Future<void> _satelliteHealth() async {
    setState(() => satelliteBusy = true);
    try {
      final api = await ref.read(apiClientProvider.future);
      final sat = await api.runSatelliteHealth(widget.id);
      if (mounted) setState(() => satellite = sat);
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(apiErrorMessage(e))),
        );
      }
    } finally {
      if (mounted) setState(() => satelliteBusy = false);
    }
  }

  String _str(dynamic v) => v?.toString() ?? '—';

  String _auditBlockerLabel(String code) {
    const labels = {
      'insufficient_photos': 'Need at least 2 photos',
      'photo_span_too_short': 'Photos must span 30+ days',
      'satellite_scan_stale': 'Satellite scan older than 90 days',
      'fusion_below_audit_minimum': 'Fusion score below 75',
      'missing_exif': 'Missing camera EXIF',
      'missing_photo_gps': 'Photo missing GPS',
      'missing_photo_timestamp': 'Photo missing timestamp',
      'photo_timestamp_stale': 'Photo older than 7 days',
      'regeotag_mismatch': 'Re-geotag mismatch',
      'duplicate_photo': 'Duplicate photo',
      'duplicate_coordinate': 'Duplicate coordinate',
      'ai_confidence_low': 'Low AI confidence',
    };
    return labels[code] ?? code.replaceAll('_', ' ');
  }

  List<String> _auditBlockers(Map<String, dynamic>? risk) {
    if (risk == null) return const [];
    final details = risk['fusion_details'];
    if (details is! Map) return const [];
    final blockers = details['audit_ready_blockers'];
    if (blockers is! List) return const [];
    return blockers.whereType<String>().toList();
  }

  Future<void> _addFollowUpPhoto() async {
    setState(() => photoBusy = true);
    try {
      final image = await _picker.pickImage(source: ImageSource.camera, imageQuality: 85);
      if (image == null) return;
      final api = await ref.read(apiClientProvider.future);
      final key = await api.uploadImageFile(image.path, filename: image.name);
      await api.addTreeImage(widget.id, key);
      await _load();
      ref.invalidate(treesProvider);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Follow-up photo added')),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(apiErrorMessage(e))),
        );
      }
    } finally {
      if (mounted) setState(() => photoBusy = false);
    }
  }

  Future<void> _shareTree(String url) async {
    final l10n = AppLocalizations.of(context);
    final message = l10n?.shareTreeMessage(url) ?? 'View this tree on Aranyix: $url';
    await Share.share(message);
    await AnalyticsService.instance.track('tree_qr_shared');
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final t = tree;
    final risk = t?['risk_score'] as Map<String, dynamic>?;
    final blockers = _auditBlockers(risk);
    return stackRouteScaffold(
      location: '/trees/${widget.id}',
      appBar: ShellTopBar(title: t?['species_text'] ?? l10n.treeFallback, menuWithBack: true),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
              ? Center(
                  child: Padding(
                    padding: const EdgeInsets.all(24),
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text(_error!, textAlign: TextAlign.center),
                        const SizedBox(height: 12),
                        FilledButton(onPressed: _load, child: Text(l10n.retry)),
                      ],
                    ),
                  ),
                )
              : ListView(
                  padding: const EdgeInsets.all(16),
                  children: [
                    Card(
                      child: Padding(
                        padding: const EdgeInsets.all(16),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(t!['public_code'], style: const TextStyle(fontFamily: 'monospace')),
                            const SizedBox(height: 8),
                            _row(l10n.healthLabel, _str(t['current_health'])),
                            _row(l10n.carbonLabel, '${t['current_carbon_kg']} kg'),
                            _row(l10n.dbhCmLabel, '${t['current_dbh_cm'] ?? '—'} cm'),
                            _row(l10n.heightMLabel, '${t['current_height_m'] ?? '—'} m'),
                            _row(l10n.satelliteLabel, t['satellite_verified'] == true ? '✓' : '—'),
                            if (t['verification_status'] != null)
                              _row('Verification', _str(t['verification_status']).replaceAll('_', ' ')),
                            if (risk?['fusion_score'] != null)
                              _row('Fusion score', '${risk!['fusion_score']}'),
                            if (risk?['credit_eligible'] != null)
                              _row(
                                'Credit eligible',
                                risk!['credit_eligible'] == true ? 'Yes' : 'No',
                              ),
                            if (risk?['regeotag_mismatch'] == true)
                              _row('Integrity flag', 'Re-geotag mismatch'),
                          ],
                        ),
                      ),
                    ),
                    if (blockers.isNotEmpty) ...[
                      const SizedBox(height: 12),
                      Card(
                        child: Padding(
                          padding: const EdgeInsets.all(16),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                'Audit-ready blockers',
                                style: Theme.of(context).textTheme.titleMedium,
                              ),
                              const SizedBox(height: 8),
                              ...blockers.map(
                                (b) => Padding(
                                  padding: const EdgeInsets.symmetric(vertical: 2),
                                  child: Row(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      const Text('• '),
                                      Expanded(child: Text(_auditBlockerLabel(b))),
                                    ],
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ],
                    if (satellite != null) ...[
                      const SizedBox(height: 12),
                      Card(
                        child: Padding(
                          padding: const EdgeInsets.all(16),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                l10n.satelliteHealth,
                                style: Theme.of(context).textTheme.titleMedium,
                              ),
                              const SizedBox(height: 8),
                              _row(l10n.riskLabel, _str(satellite!['risk_level'])),
                              _row(l10n.statusLabel, _str(satellite!['health_status'])),
                              if (satellite!['ndvi_current'] != null)
                                _row(l10n.ndviLabel, _str(satellite!['ndvi_current'])),
                              const SizedBox(height: 8),
                              Text(_str(satellite!['summary'])),
                              if (satellite!['llm_narrative'] != null) ...[
                                const SizedBox(height: 8),
                                Text(
                                  satellite!['llm_narrative'] as String,
                                  style: const TextStyle(color: Colors.grey),
                                ),
                              ],
                            ],
                          ),
                        ),
                      ),
                    ],
                    const SizedBox(height: 12),
                    Card(
                      child: Padding(
                        padding: const EdgeInsets.all(16),
                        child: FutureBuilder(
                          future: ref.read(apiClientProvider.future),
                          builder: (context, snap) {
                            final code = t['public_code'] as String;
                            final url = snap.hasData
                                ? snap.data!.publicTreeUrl(code)
                                : 'https://aranyix.tech/p/$code';
                            final shareL10n = AppLocalizations.of(context)!;
                            return Column(
                              children: [
                                QrImageView(data: url, size: 180),
                                const SizedBox(height: 12),
                                OutlinedButton.icon(
                                  onPressed: () => _shareTree(url),
                                  icon: const Icon(Icons.share_outlined),
                                  label: Text(shareL10n.shareTreeQr),
                                ),
                              ],
                            );
                          },
                        ),
                      ),
                    ),
                    const SizedBox(height: 12),
                    if (canWriteInApp(sessionController.user)) ...[
                      OutlinedButton.icon(
                        onPressed: () => context.push('/trees/${widget.id}/survival'),
                        icon: const Icon(Icons.my_location),
                        label: Text(l10n.survivalRegeotag),
                      ),
                      const SizedBox(height: 8),
                      OutlinedButton.icon(
                        onPressed: photoBusy ? null : _addFollowUpPhoto,
                        icon: const Icon(Icons.add_a_photo_outlined),
                        label: Text(photoBusy ? 'Uploading photo…' : 'Add follow-up photo'),
                      ),
                      const SizedBox(height: 8),
                    ],
                    FilledButton.icon(
                      onPressed: analyzing ? null : _analyze,
                      icon: const Icon(Icons.auto_awesome),
                      label: Text(analyzing ? l10n.analyzing : l10n.runAiAnalysis),
                    ),
                    const SizedBox(height: 8),
                    OutlinedButton.icon(
                      onPressed: satelliteBusy ? null : _satelliteHealth,
                      icon: const Icon(Icons.satellite_alt),
                      label: Text(satelliteBusy ? l10n.checkingSatellite : l10n.runSatelliteHealth),
                    ),
                  ],
                ),
    );
  }

  Widget _row(String label, String v) => Padding(
        padding: const EdgeInsets.symmetric(vertical: 2),
        child: Row(
          children: [
            SizedBox(width: 80, child: Text(label, style: const TextStyle(color: Colors.grey))),
            Expanded(child: Text(v)),
          ],
        ),
      );
}
