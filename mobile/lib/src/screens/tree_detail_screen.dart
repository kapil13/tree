import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:byot_mobile/l10n/app_localizations.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:image_picker/image_picker.dart';
import 'package:qr_flutter/qr_flutter.dart';
import 'package:share_plus/share_plus.dart';

import '../api/api_errors.dart';
import '../nav_access.dart';
import '../providers.dart';
import '../services/analytics_service.dart';
import '../session.dart';
import '../widgets/stack_route_scaffold.dart';
import '../widgets/prototype/prototype_ui.dart';

class TreeDetailScreen extends ConsumerStatefulWidget {
  const TreeDetailScreen({super.key, required this.id});
  final String id;
  @override
  ConsumerState<TreeDetailScreen> createState() => _TreeDetailScreenState();
}

class _TreeDetailScreenState extends ConsumerState<TreeDetailScreen>
    with SingleTickerProviderStateMixin {
  final _picker = ImagePicker();
  late final TabController _tabs;
  Map<String, dynamic>? tree;
  Map<String, dynamic>? satellite;
  List<dynamic> measurements = [];
  List<dynamic> analyses = [];
  Map<String, dynamic>? sarFusion;
  String? _error;
  bool _loading = true;
  bool analyzing = false;
  bool satelliteBusy = false;
  bool photoBusy = false;

  @override
  void initState() {
    super.initState();
    _tabs = TabController(length: 3, vsync: this);
    _load();
  }

  @override
  void dispose() {
    _tabs.dispose();
    super.dispose();
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
      List<dynamic> meas = [];
      List<dynamic> ai = [];
      Map<String, dynamic>? sar;
      try {
        sat = await api.getSatelliteHealthLatest(widget.id);
      } catch (_) {}
      try {
        final page = await api.listTreeMeasurements(widget.id);
        meas = List<dynamic>.from(page['items'] ?? []);
      } catch (_) {}
      try {
        ai = await api.listTreeAnalyses(widget.id);
      } catch (_) {}
      try {
        sar = await api.getSarTreeFusion(widget.id);
      } catch (_) {}
      if (mounted) {
        setState(() {
          tree = t;
          satellite = sat;
          measurements = meas;
          analyses = ai;
          sarFusion = sar;
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

  String? _projectId(Map<String, dynamic> t) => t['project_id'] as String?;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final t = tree;
    final risk = t?['risk_score'] as Map<String, dynamic>?;
    final blockers = _auditBlockers(risk);
    final projectId = t != null ? _projectId(t) : null;
    final evidenceRoute = projectId != null ? '/evidence?project=$projectId' : '/evidence';

    return stackRouteScaffold(
      location: '/trees/${widget.id}',
      extendBodyBehindAppBar: true,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        leading: IconButton(
          icon: Container(
            padding: const EdgeInsets.all(6),
            decoration: BoxDecoration(color: Colors.black.withValues(alpha: 0.4), shape: BoxShape.circle),
            child: const Icon(Icons.arrow_back, color: Colors.white, size: 20),
          ),
          onPressed: () => context.pop(),
        ),
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator(color: PrototypeColors.brandCanopy))
          : _error != null
              ? Center(
                  child: Padding(
                    padding: const EdgeInsets.all(24),
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text(_error!, textAlign: TextAlign.center),
                        const SizedBox(height: 12),
                        FilledButton(
                          onPressed: _load,
                          style: FilledButton.styleFrom(backgroundColor: PrototypeColors.brandForest),
                          child: Text(l10n.retry),
                        ),
                      ],
                    ),
                  ),
                )
              : Column(
                  children: [
                    _hero(t!),
                    Material(
                      color: PrototypeColors.bgSurface,
                      child: TabBar(
                        controller: _tabs,
                        labelColor: PrototypeColors.brandForest,
                        unselectedLabelColor: PrototypeColors.textSecondary,
                        indicatorColor: PrototypeColors.brandCanopy,
                        tabs: const [
                          Tab(text: 'Overview'),
                          Tab(text: 'Field'),
                          Tab(text: 'Intelligence'),
                        ],
                      ),
                    ),
                    Expanded(
                      child: TabBarView(
                        controller: _tabs,
                        children: [
                          _overviewTab(l10n, t, risk, blockers, evidenceRoute),
                          _fieldTab(l10n, t),
                          _intelligenceTab(l10n, t),
                        ],
                      ),
                    ),
                  ],
                ),
    );
  }

  Widget _overviewTab(
    AppLocalizations l10n,
    Map<String, dynamic> t,
    Map<String, dynamic>? risk,
    List<String> blockers,
    String evidenceRoute,
  ) {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        _stateSummary(t, risk, satellite),
        const SizedBox(height: 14),
        PrototypeActionRail(
          actions: [
            (label: 'Map', onTap: () => context.go('/map'), primary: true),
            (label: 'Inspect', onTap: () => context.push('/trees/${widget.id}/survival'), primary: false),
            (label: 'Evidence', onTap: () => context.push(evidenceRoute), primary: false),
            (label: 'Monitor', onTap: () => context.go('/monitoring'), primary: false),
          ],
        ),
        const SizedBox(height: 12),
        _locationChip(t),
        if (blockers.isNotEmpty) ...[
          const SizedBox(height: 16),
          _auditBlockersCard(blockers),
        ],
        if (satellite != null) ...[
          const SizedBox(height: 16),
          _satelliteCard(l10n, satellite!),
        ],
        const SizedBox(height: 16),
        _timelineSection(t, satellite),
        const SizedBox(height: 16),
        _qrSection(t),
        const SizedBox(height: 16),
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
          style: FilledButton.styleFrom(backgroundColor: PrototypeColors.brandForest, minimumSize: const Size.fromHeight(48)),
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
    );
  }

  Widget _fieldTab(AppLocalizations l10n, Map<String, dynamic> t) {
    final images = List<dynamic>.from(t['images'] ?? []);
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        Text('Photo gallery', style: GoogleFonts.dmSans(fontSize: 14, fontWeight: FontWeight.w600)),
        const SizedBox(height: 8),
        if (images.isEmpty)
          const PrototypeEmptyState(
            icon: '📷',
            title: 'No photos yet',
            subtitle: 'Add a follow-up photo from Overview or during survival survey',
          )
        else
          GridView.builder(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
              crossAxisCount: 3,
              crossAxisSpacing: 8,
              mainAxisSpacing: 8,
            ),
            itemCount: images.length,
            itemBuilder: (_, i) {
              final img = images[i] as Map;
              final url = img['url'] as String?;
              return ClipRRect(
                borderRadius: BorderRadius.circular(PrototypeRadii.md),
                child: url != null
                    ? Image.network(url, fit: BoxFit.cover, errorBuilder: (_, __, ___) => _heroPlaceholder())
                    : _heroPlaceholder(),
              );
            },
          ),
        const SizedBox(height: 20),
        Text('Measurement history', style: GoogleFonts.dmSans(fontSize: 14, fontWeight: FontWeight.w600)),
        const SizedBox(height: 8),
        if (measurements.isEmpty)
          const PrototypeEmptyState(
            icon: '📏',
            title: 'No measurements recorded',
            subtitle: 'Survival surveys and field captures appear here',
          )
        else
          for (final raw in measurements)
            _measurementTile(raw as Map<String, dynamic>),
        if (canWriteInApp(sessionController.user)) ...[
          const SizedBox(height: 16),
          FilledButton.icon(
            onPressed: () => context.push('/trees/${widget.id}/survival'),
            icon: const Icon(Icons.my_location),
            label: Text(l10n.survivalRegeotag),
          ),
        ],
      ],
    );
  }

  Widget _measurementTile(Map<String, dynamic> m) {
    final measuredAt = m['measured_at'] as String?;
    final parts = <String>[];
    if (m['dbh_cm'] != null) parts.add('DBH ${m['dbh_cm']} cm');
    if (m['height_m'] != null) parts.add('H ${m['height_m']} m');
    if (m['canopy_m'] != null) parts.add('Canopy ${m['canopy_m']} m');
    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: ListTile(
        title: Text(m['source'] as String? ?? 'Measurement'),
        subtitle: Text(
          '${parts.join(' · ')}\n${m['method'] ?? ''}${measuredAt != null ? ' · ${_shortDate(measuredAt)}' : ''}',
        ),
        isThreeLine: true,
      ),
    );
  }

  Widget _intelligenceTab(AppLocalizations l10n, Map<String, dynamic> t) {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        if (sarFusion != null) ...[
          _sarFusionCard(sarFusion!),
          const SizedBox(height: 16),
        ],
        if (satellite != null) ...[
          _satelliteCard(l10n, satellite!),
          const SizedBox(height: 16),
        ],
        Text('AI analysis history', style: GoogleFonts.dmSans(fontSize: 14, fontWeight: FontWeight.w600)),
        const SizedBox(height: 8),
        if (analyses.isEmpty)
          const PrototypeEmptyState(
            icon: '🤖',
            title: 'No AI analyses yet',
            subtitle: 'Run AI analysis from the Overview tab',
          )
        else
          for (final raw in analyses)
            _analysisTile(raw as Map<String, dynamic>),
        const SizedBox(height: 16),
        FilledButton.icon(
          onPressed: analyzing ? null : _analyze,
          style: FilledButton.styleFrom(backgroundColor: PrototypeColors.brandForest),
          icon: const Icon(Icons.auto_awesome),
          label: Text(analyzing ? l10n.analyzing : l10n.runAiAnalysis),
        ),
      ],
    );
  }

  Widget _sarFusionCard(Map<String, dynamic> sar) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: PrototypeColors.bgSurface,
        borderRadius: BorderRadius.circular(PrototypeRadii.lg),
        border: Border.all(color: PrototypeColors.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('SAR integrity fusion', style: GoogleFonts.dmSans(fontSize: 14, fontWeight: FontWeight.w600)),
          const SizedBox(height: 8),
          if (sar['ground_status'] != null) _row('Ground status', _str(sar['ground_status'])),
          if (sar['integrity_score'] != null) _row('Integrity score', _str(sar['integrity_score'])),
          if (sar['summary'] != null)
            Padding(
              padding: const EdgeInsets.only(top: 8),
              child: Text(_str(sar['summary']), style: GoogleFonts.dmSans(fontSize: 13, color: PrototypeColors.textSecondary)),
            ),
        ],
      ),
    );
  }

  Widget _analysisTile(Map<String, dynamic> a) {
    final created = a['created_at'] as String?;
    final species = List<dynamic>.from(a['species_topk'] ?? []);
    final topSpecies = species.isNotEmpty ? (species.first as Map)['scientific'] as String? : null;
    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: ListTile(
        title: Text(topSpecies ?? a['health'] as String? ?? 'Analysis'),
        subtitle: Text(
          'Health ${a['health'] ?? '—'}'
          '${a['estimated_dbh_cm'] != null ? ' · DBH ${a['estimated_dbh_cm']} cm' : ''}'
          '${created != null ? '\n${_shortDate(created)}' : ''}',
        ),
        isThreeLine: created != null,
        trailing: a['overall_confidence'] != null
            ? Text('${((a['overall_confidence'] as num) * 100).round()}%')
            : null,
      ),
    );
  }

  Widget _hero(Map<String, dynamic> t) {
    final images = (t['images'] as List?) ?? [];
    final firstImage = images.isNotEmpty ? (images.first as Map)['url'] as String? : null;
    return SizedBox(
      height: 200,
      child: Stack(
        fit: StackFit.expand,
        children: [
          if (firstImage != null)
            Image.network(firstImage, fit: BoxFit.cover, errorBuilder: (_, __, ___) => _heroPlaceholder())
          else
            _heroPlaceholder(),
          Container(
            decoration: BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.topCenter,
                end: Alignment.bottomCenter,
                colors: [Colors.transparent, Colors.black.withValues(alpha: 0.65)],
              ),
            ),
          ),
          Positioned(
            left: 16,
            right: 16,
            bottom: 16,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  t['public_code'] as String? ?? '—',
                  style: GoogleFonts.ibmPlexMono(fontSize: 14, fontWeight: FontWeight.w600, color: Colors.white),
                ),
                Text(
                  t['species_text'] as String? ?? 'Tree',
                  style: GoogleFonts.dmSans(fontSize: 22, fontWeight: FontWeight.w600, color: Colors.white),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _heroPlaceholder() {
    return Container(
      color: PrototypeColors.bgSubtle,
      alignment: Alignment.center,
      child: const Text('🌳', style: TextStyle(fontSize: 64)),
    );
  }

  Widget _stateSummary(Map<String, dynamic> t, Map<String, dynamic>? risk, Map<String, dynamic>? sat) {
    final ndvi = sat?['ndvi_current'];
    final summary = sat?['summary'] as String?;
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: PrototypeColors.bgSurface,
        borderRadius: BorderRadius.circular(PrototypeRadii.lg),
        border: Border.all(color: PrototypeColors.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Wrap(
            spacing: 6,
            runSpacing: 6,
            children: [
              PrototypeHealthBadge(health: t['current_health'] as String?),
              if (t['satellite_verified'] == true)
                const PrototypeStatusBadge(label: 'Verified', variant: 'ok')
              else
                const PrototypeStatusBadge(label: 'Unverified', variant: 'warn'),
              if (t['verification_status'] != null)
                PrototypeStatusBadge(label: _str(t['verification_status']).replaceAll('_', ' '), variant: 'info'),
            ],
          ),
          const SizedBox(height: 8),
          Text(
            summary ?? 'Carbon ${t['current_carbon_kg']} kg · DBH ${t['current_dbh_cm'] ?? '—'} cm'
            '${ndvi != null ? ' · NDVI $ndvi' : ''}',
            style: GoogleFonts.dmSans(fontSize: 12, color: PrototypeColors.textSecondary),
          ),
          if (risk?['fusion_score'] != null)
            Padding(
              padding: const EdgeInsets.only(top: 4),
              child: Text(
                'Fusion score ${risk!['fusion_score']}',
                style: GoogleFonts.dmSans(fontSize: 12, color: PrototypeColors.textSecondary),
              ),
            ),
        ],
      ),
    );
  }

  Widget _locationChip(Map<String, dynamic> t) {
    final lat = (t['latitude'] as num?)?.toDouble();
    final lon = (t['longitude'] as num?)?.toDouble();
    return Material(
      color: PrototypeColors.bgSurface,
      borderRadius: BorderRadius.circular(PrototypeRadii.md),
      child: InkWell(
        onTap: () => context.go('/map'),
        borderRadius: BorderRadius.circular(PrototypeRadii.md),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(PrototypeRadii.md),
            border: Border.all(color: PrototypeColors.border),
          ),
          child: Row(
            children: [
              const Text('📍', style: TextStyle(fontSize: 14)),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  t['work_area_name'] as String? ?? 'Field location',
                  style: GoogleFonts.dmSans(fontSize: 13, fontWeight: FontWeight.w500),
                ),
              ),
              if (lat != null && lon != null)
                Text(
                  '${lat.toStringAsFixed(4)}, ${lon.toStringAsFixed(4)}',
                  style: GoogleFonts.ibmPlexMono(fontSize: 10, color: PrototypeColors.textTertiary),
                ),
              const Icon(Icons.chevron_right, size: 16, color: PrototypeColors.textTertiary),
            ],
          ),
        ),
      ),
    );
  }

  Widget _auditBlockersCard(List<String> blockers) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: const Color(0xFFFFF5F5),
        borderRadius: BorderRadius.circular(PrototypeRadii.lg),
        border: Border.all(color: const Color(0xFFFCA5A5)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('Audit-ready blockers', style: GoogleFonts.dmSans(fontSize: 14, fontWeight: FontWeight.w600)),
          const SizedBox(height: 8),
          for (final b in blockers)
            Padding(
              padding: const EdgeInsets.symmetric(vertical: 2),
              child: Text('• ${_auditBlockerLabel(b)}', style: GoogleFonts.dmSans(fontSize: 13)),
            ),
        ],
      ),
    );
  }

  Widget _satelliteCard(AppLocalizations l10n, Map<String, dynamic> sat) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: PrototypeColors.bgSurface,
        borderRadius: BorderRadius.circular(PrototypeRadii.lg),
        border: Border.all(color: PrototypeColors.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(l10n.satelliteHealth, style: GoogleFonts.dmSans(fontSize: 14, fontWeight: FontWeight.w600)),
          const SizedBox(height: 8),
          _row(l10n.riskLabel, _str(sat['risk_level'])),
          _row(l10n.statusLabel, _str(sat['health_status'])),
          if (sat['ndvi_current'] != null) _row(l10n.ndviLabel, _str(sat['ndvi_current'])),
          const SizedBox(height: 8),
          Text(_str(sat['summary']), style: GoogleFonts.dmSans(fontSize: 13, color: PrototypeColors.textSecondary)),
        ],
      ),
    );
  }

  Widget _timelineSection(Map<String, dynamic> t, Map<String, dynamic>? sat) {
    final created = t['created_at'] as String?;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('Timeline', style: GoogleFonts.dmSans(fontSize: 13, fontWeight: FontWeight.w700)),
        const SizedBox(height: 8),
        if (created != null)
          PrototypeTimelineItem(
            title: 'Registered · ${_shortDate(created)}',
            subtitle: 'Field capture',
          ),
        if (t['satellite_verified'] == true)
          const PrototypeTimelineItem(title: 'Satellite verified', subtitle: 'Remote sensing check passed'),
        if (sat?['risk_level'] != null && sat!['risk_level'] != 'low')
          PrototypeTimelineItem(
            title: 'NDVI signal · ${sat['risk_level']}',
            subtitle: _str(sat['summary']),
            warn: true,
          ),
      ],
    );
  }

  Widget _qrSection(Map<String, dynamic> t) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: PrototypeColors.bgSurface,
        borderRadius: BorderRadius.circular(PrototypeRadii.lg),
        border: Border.all(color: PrototypeColors.border),
      ),
      child: FutureBuilder(
        future: ref.read(apiClientProvider.future),
        builder: (context, snap) {
          final code = t['public_code'] as String;
          final url = snap.hasData ? snap.data!.publicTreeUrl(code) : 'https://aranyix.tech/p/$code';
          final shareL10n = AppLocalizations.of(context)!;
          return Column(
            children: [
              QrImageView(data: url, size: 160),
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
    );
  }

  String _shortDate(String iso) {
    try {
      final dt = DateTime.parse(iso);
      return '${dt.day} ${_month(dt.month)}';
    } catch (_) {
      return iso.length > 10 ? iso.substring(0, 10) : iso;
    }
  }

  String _month(int m) => const ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][m - 1];

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
