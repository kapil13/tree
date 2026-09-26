import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:byot_mobile/l10n/app_localizations.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:image_picker/image_picker.dart';
import 'package:qr_flutter/qr_flutter.dart';
import 'package:share_plus/share_plus.dart';

import '../api/api_errors.dart';
import '../api/auth_redirect.dart';
import '../offline/offline_tree_cache.dart';
import '../nav_access.dart';
import '../providers.dart';
import '../services/analytics_service.dart';
import '../session.dart';
import '../widgets/stack_route_scaffold.dart';
import '../integrity_remediation.dart';
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
  bool _showingCache = false;
  bool analyzing = false;
  bool satelliteBusy = false;
  bool photoBusy = false;
  bool adoptBusy = false;

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
      _showingCache = false;
    });
    try {
      final api = await ref.read(apiClientProvider.future);
      final t = await api.getTree(widget.id);
      await OfflineTreeCache.saveDetail(widget.id, t);
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
      if (maybeRedirectUnauthorized(ref, context, e)) return;
      final cached = await OfflineTreeCache.loadDetail(widget.id);
      if (mounted) {
        if (cached != null) {
          setState(() {
            tree = cached.tree;
            _loading = false;
            _showingCache = true;
            _error = null;
          });
        } else {
          setState(() {
            _error = apiErrorMessage(e);
            _loading = false;
          });
        }
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
      if (maybeRedirectUnauthorized(ref, context, e)) return;
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
      if (maybeRedirectUnauthorized(ref, context, e)) return;
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(apiErrorMessage(e))),
        );
      }
    } finally {
      if (mounted) setState(() => satelliteBusy = false);
    }
  }

  Future<void> _adoptTree() async {
    setState(() => adoptBusy = true);
    try {
      final api = await ref.read(apiClientProvider.future);
      await api.citizenAdoptTree(widget.id);
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(AppLocalizations.of(context)!.citizenAdoptSuccess)),
      );
    } catch (e) {
      if (maybeRedirectUnauthorized(ref, context, e)) return;
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(apiErrorMessage(e))),
        );
      }
    } finally {
      if (mounted) setState(() => adoptBusy = false);
    }
  }

  String _str(dynamic v) => v?.toString() ?? '—';

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
          SnackBar(content: Text(AppLocalizations.of(context)!.treeDetailFollowUpPhotoAdded)),
        );
      }
    } catch (e) {
      if (maybeRedirectUnauthorized(ref, context, e)) return;
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
                    _hero(l10n, t!),
                    Material(
                      color: PrototypeColors.bgSurface,
                      child: TabBar(
                        controller: _tabs,
                        labelColor: PrototypeColors.brandForest,
                        unselectedLabelColor: PrototypeColors.textSecondary,
                        indicatorColor: PrototypeColors.brandCanopy,
                        tabs: [
                          Tab(text: l10n.treeDetailOverview),
                          Tab(text: l10n.treeDetailField),
                          Tab(text: l10n.treeDetailIntelligence),
                        ],
                      ),
                    ),
                    if (_showingCache)
                      MaterialBanner(
                        content: Text(l10n.treeDetailCachedDetail),
                        actions: [
                          TextButton(onPressed: _load, child: Text(l10n.retry)),
                        ],
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
        _stateSummary(l10n, t, risk, satellite),
        const SizedBox(height: 14),
        PrototypeActionRail(
          actions: [
            (label: l10n.treeDetailMap, onTap: () => context.go('/map'), primary: true),
            (label: l10n.treeDetailInspect, onTap: () => context.push('/trees/${widget.id}/survival'), primary: false),
            (label: l10n.treeDetailEvidence, onTap: () => context.push(evidenceRoute), primary: false),
            (label: l10n.treeDetailMonitor, onTap: () => context.go('/monitoring'), primary: false),
          ],
        ),
        if (isCitizenByotUser(sessionController.user) && t['project_id'] == null) ...[
          const SizedBox(height: 12),
          OutlinedButton.icon(
            onPressed: adoptBusy ? null : _adoptTree,
            icon: adoptBusy
                ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2))
                : const Icon(Icons.favorite_border),
            label: Text(l10n.citizenAdoptAction),
          ),
        ],
        const SizedBox(height: 12),
        _locationChip(l10n, t),
        if (blockers.isNotEmpty) ...[
          const SizedBox(height: 16),
          _auditBlockersCard(l10n, blockers),
        ],
        if (satellite != null) ...[
          const SizedBox(height: 16),
          _satelliteCard(l10n, satellite!),
        ],
        const SizedBox(height: 16),
        _timelineSection(l10n, t, satellite),
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
            label: Text(photoBusy ? l10n.treeDetailUploadingPhoto : l10n.treeDetailAddFollowUpPhoto),
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
        Text(l10n.treeDetailPhotoGallery, style: GoogleFonts.dmSans(fontSize: 14, fontWeight: FontWeight.w600)),
        const SizedBox(height: 8),
        if (images.isEmpty)
          PrototypeEmptyState(
            icon: '📷',
            title: l10n.treeDetailNoPhotos,
            subtitle: l10n.treeDetailNoPhotosSub,
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
        Text(l10n.treeDetailMeasurementHistory, style: GoogleFonts.dmSans(fontSize: 14, fontWeight: FontWeight.w600)),
        const SizedBox(height: 8),
        if (measurements.isEmpty)
          PrototypeEmptyState(
            icon: '📏',
            title: l10n.treeDetailNoMeasurements,
            subtitle: l10n.treeDetailNoMeasurementsSub,
          )
        else
          for (final raw in measurements)
            _measurementTile(l10n, raw as Map<String, dynamic>),
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

  Widget _measurementTile(AppLocalizations l10n, Map<String, dynamic> m) {
    final measuredAt = m['measured_at'] as String?;
    final parts = <String>[];
    if (m['dbh_cm'] != null) parts.add('DBH ${m['dbh_cm']} cm');
    if (m['height_m'] != null) parts.add('H ${m['height_m']} m');
    if (m['canopy_m'] != null) parts.add('Canopy ${m['canopy_m']} m');
    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: ListTile(
        title: Text(m['source'] as String? ?? l10n.treeDetailMeasurement),
        subtitle: Text(
          '${parts.join(' · ')}\n${m['method'] ?? ''}${measuredAt != null ? ' · ${_shortDate(l10n, measuredAt)}' : ''}',
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
          _sarFusionCard(l10n, sarFusion!),
          const SizedBox(height: 16),
        ],
        if (satellite != null) ...[
          _satelliteCard(l10n, satellite!),
          const SizedBox(height: 16),
        ],
        Text(l10n.treeDetailAiHistory, style: GoogleFonts.dmSans(fontSize: 14, fontWeight: FontWeight.w600)),
        const SizedBox(height: 8),
        if (analyses.isEmpty)
          PrototypeEmptyState(
            icon: '🤖',
            title: l10n.treeDetailNoAiAnalyses,
            subtitle: l10n.treeDetailNoAiAnalysesSub,
          )
        else
          for (final raw in analyses)
            _analysisTile(l10n, raw as Map<String, dynamic>),
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

  Widget _sarFusionCard(AppLocalizations l10n, Map<String, dynamic> sar) {
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
          Text(l10n.treeDetailSarFusion, style: GoogleFonts.dmSans(fontSize: 14, fontWeight: FontWeight.w600)),
          const SizedBox(height: 8),
          if (sar['ground_status'] != null) _row(l10n.treeDetailGroundStatus, _str(sar['ground_status'])),
          if (sar['integrity_score'] != null) _row(l10n.treeDetailIntegrityScoreLabel, _str(sar['integrity_score'])),
          if (sar['summary'] != null)
            Padding(
              padding: const EdgeInsets.only(top: 8),
              child: Text(_str(sar['summary']), style: GoogleFonts.dmSans(fontSize: 13, color: PrototypeColors.textSecondary)),
            ),
        ],
      ),
    );
  }

  Widget _analysisTile(AppLocalizations l10n, Map<String, dynamic> a) {
    final created = a['created_at'] as String?;
    final species = List<dynamic>.from(a['species_topk'] ?? []);
    final topSpecies = species.isNotEmpty ? (species.first as Map)['scientific'] as String? : null;
    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: ListTile(
        title: Text(topSpecies ?? a['health'] as String? ?? l10n.treeDetailAnalysis),
        subtitle: Text(
          '${l10n.treeDetailHealthLine('${a['health'] ?? '—'}')}'
          '${a['estimated_dbh_cm'] != null ? ' · DBH ${a['estimated_dbh_cm']} cm' : ''}'
          '${created != null ? '\n${_shortDate(l10n, created)}' : ''}',
        ),
        isThreeLine: created != null,
        trailing: a['overall_confidence'] != null
            ? Text('${((a['overall_confidence'] as num) * 100).round()}%')
            : null,
      ),
    );
  }

  Widget _hero(AppLocalizations l10n, Map<String, dynamic> t) {
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
                  t['species_text'] as String? ?? l10n.treeFallback,
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

  Widget _stateSummary(AppLocalizations l10n, Map<String, dynamic> t, Map<String, dynamic>? risk, Map<String, dynamic>? sat) {
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
                PrototypeStatusBadge(label: l10n.treeDetailVerified, variant: 'ok')
              else
                PrototypeStatusBadge(label: l10n.statusUnverified, variant: 'warn'),
              if (t['verification_status'] != null)
                PrototypeStatusBadge(label: _str(t['verification_status']).replaceAll('_', ' '), variant: 'info'),
            ],
          ),
          const SizedBox(height: 8),
          Text(
            summary ??
                '${l10n.treeDetailCarbonSummary('${t['current_carbon_kg']}', '${t['current_dbh_cm'] ?? '—'}')}'
                    '${ndvi != null ? ' · NDVI $ndvi' : ''}',
            style: GoogleFonts.dmSans(fontSize: 12, color: PrototypeColors.textSecondary),
          ),
          if (risk?['fusion_score'] != null)
            Padding(
              padding: const EdgeInsets.only(top: 4),
              child: Text(
                l10n.treeDetailFusionScore('${risk!['fusion_score']}'),
                style: GoogleFonts.dmSans(fontSize: 12, color: PrototypeColors.textSecondary),
              ),
            ),
        ],
      ),
    );
  }

  Widget _locationChip(AppLocalizations l10n, Map<String, dynamic> t) {
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
                  t['work_area_name'] as String? ?? l10n.treeDetailFieldLocation,
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

  Widget _auditBlockersCard(AppLocalizations l10n, List<String> blockers) {
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
          Text(l10n.treeDetailAuditBlockers, style: GoogleFonts.dmSans(fontSize: 14, fontWeight: FontWeight.w600)),
          const SizedBox(height: 8),
          for (final b in blockers)
            Padding(
              padding: const EdgeInsets.symmetric(vertical: 2),
              child: Text('• ${integrityBlockerLabel(l10n, b)}', style: GoogleFonts.dmSans(fontSize: 13)),
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

  Widget _timelineSection(AppLocalizations l10n, Map<String, dynamic> t, Map<String, dynamic>? sat) {
    final created = t['created_at'] as String?;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(l10n.treeDetailTimeline, style: GoogleFonts.dmSans(fontSize: 13, fontWeight: FontWeight.w700)),
        const SizedBox(height: 8),
        if (created != null)
          PrototypeTimelineItem(
            title: l10n.treeDetailRegistered(_shortDate(l10n, created)),
            subtitle: l10n.treeDetailFieldCapture,
          ),
        if (t['satellite_verified'] == true)
          PrototypeTimelineItem(title: l10n.treeDetailSatelliteVerified, subtitle: l10n.treeDetailRemoteSensingPassed),
        if (sat?['risk_level'] != null && sat!['risk_level'] != 'low')
          PrototypeTimelineItem(
            title: l10n.treeDetailNdviSignal('${sat['risk_level']}'),
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

  String _shortDate(AppLocalizations l10n, String iso) {
    try {
      final dt = DateTime.parse(iso);
      return '${dt.day} ${_month(l10n, dt.month)}';
    } catch (_) {
      return iso.length > 10 ? iso.substring(0, 10) : iso;
    }
  }

  String _month(AppLocalizations l10n, int m) => [
    l10n.monthJan, l10n.monthFeb, l10n.monthMar, l10n.monthApr, l10n.monthMay, l10n.monthJun,
    l10n.monthJul, l10n.monthAug, l10n.monthSep, l10n.monthOct, l10n.monthNov, l10n.monthDec,
  ][m - 1];

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
