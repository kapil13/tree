import 'dart:io';

import 'package:byot_mobile/l10n/app_localizations.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import '../offline/audit_visit_queue.dart';
import '../offline/bioacoustic_queue.dart';
import '../offline/survival_survey_queue.dart';
import '../offline/tree_registration_queue.dart';
import '../api/api_errors.dart';
import '../api/auth_redirect.dart';
import '../providers.dart';
import '../widgets/prototype/prototype_ui.dart';

class SyncQueueScreen extends ConsumerStatefulWidget {
  const SyncQueueScreen({super.key});

  @override
  ConsumerState<SyncQueueScreen> createState() => _SyncQueueScreenState();
}

class _SyncQueueScreenState extends ConsumerState<SyncQueueScreen> {
  List<QueuedTreeRegistration> _treeItems = [];
  List<QueuedBioacousticRecording> _bioItems = [];
  List<QueuedAuditVisit> _auditItems = [];
  List<QueuedSurvivalSurvey> _survivalItems = [];
  bool _syncing = false;
  String? _status;

  @override
  void initState() {
    super.initState();
    Future.microtask(() async {
      await ref.read(treeRegistrationQueueProvider).init();
      await ref.read(bioacousticQueueProvider).init();
      await ref.read(auditVisitQueueProvider).init();
      await ref.read(survivalSurveyQueueProvider).init();
      _reload();
    });
    ref.read(treeRegistrationQueueProvider).addListener(_reload);
    ref.read(bioacousticQueueProvider).addListener(_reload);
    ref.read(auditVisitQueueProvider).addListener(_reload);
    ref.read(survivalSurveyQueueProvider).addListener(_reload);
  }

  @override
  void dispose() {
    ref.read(treeRegistrationQueueProvider).removeListener(_reload);
    ref.read(bioacousticQueueProvider).removeListener(_reload);
    ref.read(auditVisitQueueProvider).removeListener(_reload);
    ref.read(survivalSurveyQueueProvider).removeListener(_reload);
    super.dispose();
  }

  Future<void> _reload() async {
    final trees = await ref.read(treeRegistrationQueueProvider).listAll();
    final bio = await ref.read(bioacousticQueueProvider).listAll();
    final audit = await ref.read(auditVisitQueueProvider).listAll();
    final survival = await ref.read(survivalSurveyQueueProvider).listAll();
    if (mounted) {
      setState(() {
        _treeItems = trees;
        _bioItems = bio;
        _auditItems = audit;
        _survivalItems = survival;
      });
    }
  }

  Future<void> _retryFailedAuditVisits() async {
    final queue = ref.read(auditVisitQueueProvider);
    final failed = (await queue.listAll())
        .where((item) => item.status == AuditVisitQueueStatus.failed)
        .toList();
    for (final item in failed) {
      await queue.markPending(item.id);
    }
    await _syncAll();
  }

  Future<void> _syncAll() async {
    final l10n = AppLocalizations.of(context)!;
    setState(() {
      _syncing = true;
      _status = l10n.syncQueueSyncing;
    });
    try {
      final treeSync = ref.read(treeRegistrationSyncProvider);
      final bioSync = ref.read(bioacousticSyncProvider);
      final auditSync = ref.read(auditVisitSyncProvider);
      final survivalSync = ref.read(survivalSurveySyncProvider);
      final treeCount = await treeSync.syncAll(() => ref.read(apiClientProvider.future));
      final bioCount = await bioSync.syncAll(() => ref.read(apiClientProvider.future));
      final auditCount = await auditSync.syncAll(() => ref.read(apiClientProvider.future));
      final survivalCount = await survivalSync.syncAll(() => ref.read(apiClientProvider.future));
      ref.invalidate(treesProvider);
      ref.invalidate(bioacousticRecordingsProvider);
      ref.invalidate(auditFieldPlotQueueProvider);
      ref.invalidate(fieldOpsSummaryProvider);
      ref.invalidate(dashboardProvider);
      await _reload();
      if (mounted) {
        setState(() => _status = l10n.syncQueueSyncedCount(treeCount + bioCount + auditCount + survivalCount));
      }
    } catch (e) {
      if (maybeRedirectUnauthorized(ref, context, e)) return;
      if (mounted) setState(() => _status = apiErrorMessage(e));
    } finally {
      if (mounted) setState(() => _syncing = false);
    }
  }

  Future<void> _confirmDelete({
    required String title,
    required Future<void> Function() onDelete,
  }) async {
    final l10n = AppLocalizations.of(context)!;
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) {
        final dialogL10n = AppLocalizations.of(ctx)!;
        return AlertDialog(
          title: Text(title),
          content: Text(dialogL10n.syncQueueDeleteConfirmBody),
          actions: [
            TextButton(onPressed: () => Navigator.pop(ctx, false), child: Text(dialogL10n.cancel)),
            TextButton(onPressed: () => Navigator.pop(ctx, true), child: Text(dialogL10n.deleteLabel)),
          ],
        );
      },
    );
    if (confirmed == true) {
      await onDelete();
      await _reload();
      if (mounted) setState(() => _status = l10n.syncQueueItemRemoved);
    }
  }

  void _previewTreeItem(QueuedTreeRegistration item) {
    final payload = item.payload;
    showModalBottomSheet<void>(
      context: context,
      backgroundColor: PrototypeColors.bgSurface,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(PrototypeRadii.lg)),
      ),
      builder: (ctx) {
        final sheetL10n = AppLocalizations.of(ctx)!;
        return Padding(
          padding: const EdgeInsets.fromLTRB(20, 20, 20, 32),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text(
                payload['species_text'] as String? ?? sheetL10n.syncQueueTreeRegistration,
                style: GoogleFonts.dmSans(fontSize: 18, fontWeight: FontWeight.w600),
              ),
              const SizedBox(height: 8),
              Text(sheetL10n.syncQueueStatusLine(_queueLabel(item.status)), style: GoogleFonts.dmSans(fontSize: 13)),
              Text(sheetL10n.syncQueuePhotosLine(item.photoPaths.length), style: GoogleFonts.dmSans(fontSize: 13)),
              if (payload['latitude'] != null && payload['longitude'] != null)
                Text(
                  sheetL10n.syncQueueGpsLine('${payload['latitude']}', '${payload['longitude']}'),
                  style: GoogleFonts.dmSans(fontSize: 13),
                ),
              Text(
                sheetL10n.syncQueueQueuedLine(item.createdAt.toLocal().toString()),
                style: GoogleFonts.dmSans(fontSize: 12, color: PrototypeColors.textSecondary),
              ),
              if (item.errorMessage != null) ...[
                const SizedBox(height: 8),
                Text(
                  item.errorMessage!,
                  style: GoogleFonts.dmSans(fontSize: 12, color: PrototypeColors.statusDanger),
                ),
              ],
              if (item.photoPaths.isNotEmpty) ...[
                const SizedBox(height: 12),
                SizedBox(
                  height: 72,
                  child: ListView.separated(
                    scrollDirection: Axis.horizontal,
                    itemCount: item.photoPaths.length,
                    separatorBuilder: (_, __) => const SizedBox(width: 8),
                    itemBuilder: (_, i) {
                      final path = item.photoPaths[i];
                      final file = File(path);
                      if (!file.existsSync()) {
                        return Container(
                          width: 72,
                          color: PrototypeColors.border,
                          alignment: Alignment.center,
                          child: const Icon(Icons.broken_image_outlined),
                        );
                      }
                      return ClipRRect(
                        borderRadius: BorderRadius.circular(8),
                        child: Image.file(file, width: 72, height: 72, fit: BoxFit.cover),
                      );
                    },
                  ),
                ),
              ],
              const SizedBox(height: 16),
              if (item.status == TreeQueueStatus.failed)
                OutlinedButton(
                  onPressed: () async {
                    Navigator.pop(ctx);
                    await ref.read(treeRegistrationQueueProvider).markPending(item.id);
                    await _syncAll();
                  },
                  child: Text(sheetL10n.syncQueueRetryUpload),
                ),
              TextButton(
                onPressed: () async {
                  Navigator.pop(ctx);
                  await _confirmDelete(
                    title: sheetL10n.syncQueueDeleteTreeTitle,
                    onDelete: () => ref.read(treeRegistrationQueueProvider).remove(item.id),
                  );
                },
                child: Text(sheetL10n.syncQueueDeleteFromQueue, style: const TextStyle(color: PrototypeColors.statusDanger)),
              ),
            ],
          ),
        );
      },
    );
  }

  void _previewBioItem(QueuedBioacousticRecording item) {
    showModalBottomSheet<void>(
      context: context,
      backgroundColor: PrototypeColors.bgSurface,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(PrototypeRadii.lg)),
      ),
      builder: (ctx) {
        final sheetL10n = AppLocalizations.of(ctx)!;
        return Padding(
          padding: const EdgeInsets.fromLTRB(20, 20, 20, 32),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text(
                sheetL10n.syncQueueBioRecording,
                style: GoogleFonts.dmSans(fontSize: 18, fontWeight: FontWeight.w600),
              ),
              const SizedBox(height: 8),
              Text(sheetL10n.syncQueueDurationLine(item.durationSeconds.toStringAsFixed(0)), style: GoogleFonts.dmSans(fontSize: 13)),
              Text(sheetL10n.syncQueueStatusLine(_bioQueueLabel(item.status)), style: GoogleFonts.dmSans(fontSize: 13)),
              Text(
                sheetL10n.syncQueueGpsLine('${item.latitude}', '${item.longitude}'),
                style: GoogleFonts.dmSans(fontSize: 13),
              ),
              Text(
                sheetL10n.syncQueueQueuedLine(item.createdAt.toLocal().toString()),
                style: GoogleFonts.dmSans(fontSize: 12, color: PrototypeColors.textSecondary),
              ),
              if (item.errorMessage != null) ...[
                const SizedBox(height: 8),
                Text(
                  item.errorMessage!,
                  style: GoogleFonts.dmSans(fontSize: 12, color: PrototypeColors.statusDanger),
                ),
              ],
              const SizedBox(height: 16),
              if (item.status == BioacousticQueueStatus.failed)
                OutlinedButton(
                  onPressed: () async {
                    Navigator.pop(ctx);
                    await ref.read(bioacousticQueueProvider).markPending(item.id);
                    await _syncAll();
                  },
                  child: Text(sheetL10n.syncQueueRetryUpload),
                ),
              TextButton(
                onPressed: () async {
                  Navigator.pop(ctx);
                  await _confirmDelete(
                    title: sheetL10n.syncQueueDeleteRecordingTitle,
                    onDelete: () => ref.read(bioacousticQueueProvider).remove(item.id),
                  );
                },
                child: Text(sheetL10n.syncQueueDeleteFromQueue, style: const TextStyle(color: PrototypeColors.statusDanger)),
              ),
            ],
          ),
        );
      },
    );
  }

  Widget _syncingBadge(bool syncing) {
    if (!syncing) return const SizedBox.shrink();
    return const Padding(
      padding: EdgeInsets.only(left: 6),
      child: SizedBox(
        width: 14,
        height: 14,
        child: CircularProgressIndicator(strokeWidth: 2, color: PrototypeColors.brandCanopy),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    ref.watch(treeRegistrationSyncProvider);
    ref.watch(bioacousticSyncProvider);
    ref.watch(auditVisitSyncProvider);
    ref.watch(survivalSurveySyncProvider);
    final treePending = _treeItems.where((i) => i.status != TreeQueueStatus.syncing).length;
    final bioPending = _bioItems.where((i) => i.status != BioacousticQueueStatus.syncing).length;
    final auditPending = _auditItems.where((i) => i.status != AuditVisitQueueStatus.syncing).length;
    final survivalPending =
        _survivalItems.where((i) => i.status != SurvivalSurveyQueueStatus.syncing).length;
    final pending = treePending + bioPending + auditPending + survivalPending;
    final auditFailed = _auditItems.where((i) => i.status == AuditVisitQueueStatus.failed).length;

    return Scaffold(
      backgroundColor: PrototypeColors.bgApp,
      appBar: PrototypeBackBar(title: l10n.navSyncQueue),
      body: RefreshIndicator(
        color: PrototypeColors.brandCanopy,
        onRefresh: _syncAll,
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: PrototypeColors.bgSurface,
                borderRadius: BorderRadius.circular(PrototypeRadii.lg),
                border: Border.all(color: PrototypeColors.border),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    pending == 0 ? l10n.syncQueueAllSynced : l10n.syncQueuePendingCount(pending),
                    style: GoogleFonts.dmSans(fontSize: 16, fontWeight: FontWeight.w600),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    l10n.syncQueueBreakdown(treePending, survivalPending, auditPending, bioPending),
                    style: GoogleFonts.dmSans(fontSize: 12, color: PrototypeColors.textSecondary),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    l10n.auditSyncQueueHint,
                    style: GoogleFonts.dmSans(fontSize: 12, color: PrototypeColors.textSecondary),
                  ),
                  if (_status != null) ...[
                    const SizedBox(height: 8),
                    Text(_status!, style: GoogleFonts.dmSans(fontSize: 12, color: PrototypeColors.brandCanopy)),
                  ],
                  const SizedBox(height: 12),
                  FilledButton(
                    onPressed: _syncing ? null : _syncAll,
                    style: FilledButton.styleFrom(backgroundColor: PrototypeColors.brandForest),
                    child: _syncing
                        ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                        : Text(l10n.syncNow),
                  ),
                ],
              ),
            ),
            if (_treeItems.isNotEmpty) ...[
              const SizedBox(height: 20),
              PrototypeSectionHeader(title: l10n.pendingTreeRegistrations),
              for (final item in _treeItems)
                PrototypeRegistryRow(
                  code: item.payload['species_text'] as String? ?? l10n.treeFallback,
                  species: item.payload['species_text'] as String? ?? '—',
                  meta: l10n.syncQueuePhotosMeta(item.photoPaths.length, _queueLabel(item.status)),
                  health: null,
                  badges: [
                    if (item.status == TreeQueueStatus.syncing)
                      _syncingBadge(true)
                    else
                      PrototypeStatusBadge(
                        label: _queueLabel(item.status),
                        variant: item.status == TreeQueueStatus.failed ? 'danger' : 'warn',
                      ),
                  ],
                  onTap: () => _previewTreeItem(item),
                ),
            ],
            if (_survivalItems.isNotEmpty) ...[
              const SizedBox(height: 20),
              PrototypeSectionHeader(title: l10n.survivalSurvey),
              for (final item in _survivalItems)
                PrototypeRegistryRow(
                  code: item.payload['tree_id'] as String? ?? l10n.treeFallback,
                  species: item.payload['survival_status'] as String? ?? l10n.surveyFallback,
                  meta: l10n.syncQueuePhotosMeta(item.photoPaths.length, _survivalQueueLabel(item.status)),
                  health: null,
                  badges: [
                    if (item.status == SurvivalSurveyQueueStatus.syncing)
                      _syncingBadge(true)
                    else
                      PrototypeStatusBadge(
                        label: _survivalQueueLabel(item.status),
                        variant: item.status == SurvivalSurveyQueueStatus.failed ? 'danger' : 'warn',
                      ),
                  ],
                  onTap: () => _previewSurvivalItem(item),
                ),
            ],
            if (_auditItems.isNotEmpty) ...[
              const SizedBox(height: 20),
              PrototypeSectionHeader(
                title: l10n.auditSyncAuditVisits,
                linkLabel: l10n.auditSyncOpenWorkspace,
                onLink: () => context.push('/audit'),
              ),
              if (auditFailed > 0)
                Padding(
                  padding: const EdgeInsets.only(bottom: 8),
                  child: OutlinedButton(
                    onPressed: _syncing ? null : _retryFailedAuditVisits,
                    child: Text(l10n.auditSyncRetryFailed),
                  ),
                ),
              for (final item in _auditItems)
                PrototypeRegistryRow(
                  code: item.payload['plot_code'] as String? ?? l10n.plotFallback,
                  species: item.payload['tree_presence'] as String? ?? l10n.visitFallback,
                  meta: l10n.syncQueuePhotosMeta(item.photoPaths.length, _auditQueueLabel(item.status)),
                  health: null,
                  badges: [
                    if (item.status == AuditVisitQueueStatus.syncing)
                      _syncingBadge(true)
                    else
                      PrototypeStatusBadge(
                        label: _auditQueueLabel(item.status),
                        variant: item.status == AuditVisitQueueStatus.failed ? 'danger' : 'warn',
                      ),
                  ],
                  onTap: () => _previewAuditItem(item),
                ),
            ],
            if (_bioItems.isNotEmpty) ...[
              const SizedBox(height: 20),
              PrototypeSectionHeader(title: l10n.bioOfflineQueue),
              for (final item in _bioItems)
                PrototypeRegistryRow(
                  code: '🎙',
                  species: l10n.syncQueueRecordingMeta(item.durationSeconds.toStringAsFixed(0)),
                  meta: item.createdAt.toLocal().toString().substring(0, 16),
                  health: null,
                  badges: [
                    if (item.status == BioacousticQueueStatus.syncing)
                      _syncingBadge(true)
                    else
                      PrototypeStatusBadge(
                        label: _bioQueueLabel(item.status),
                        variant: item.status == BioacousticQueueStatus.failed ? 'danger' : 'warn',
                      ),
                  ],
                  onTap: () => _previewBioItem(item),
                ),
            ],
            if (_treeItems.isEmpty &&
                _bioItems.isEmpty &&
                _auditItems.isEmpty &&
                _survivalItems.isEmpty)
              Padding(
                padding: const EdgeInsets.only(top: 8),
                child: PrototypeEmptyState(
                  icon: '✓',
                  title: l10n.syncQueueAllSynced,
                  subtitle: l10n.auditSyncEmptyHint,
                ),
              ),
          ],
        ),
      ),
    );
  }

  void _previewAuditItem(QueuedAuditVisit item) {
    final payload = item.payload;
    showModalBottomSheet<void>(
      context: context,
      backgroundColor: PrototypeColors.bgSurface,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(PrototypeRadii.lg)),
      ),
      builder: (ctx) {
        final sheetL10n = AppLocalizations.of(ctx)!;
        return Padding(
          padding: const EdgeInsets.fromLTRB(20, 20, 20, 32),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text(
                payload['plot_code'] as String? ?? sheetL10n.syncQueueAuditPlotVisit,
                style: GoogleFonts.dmSans(fontSize: 18, fontWeight: FontWeight.w600),
              ),
              const SizedBox(height: 8),
              Text(sheetL10n.syncQueuePresenceLine('${payload['tree_presence']}'), style: GoogleFonts.dmSans(fontSize: 13)),
              Text(sheetL10n.syncQueueStatusLine(_auditQueueLabel(item.status)), style: GoogleFonts.dmSans(fontSize: 13)),
              Text(sheetL10n.syncQueuePhotosLine(item.photoPaths.length), style: GoogleFonts.dmSans(fontSize: 13)),
              if (item.errorMessage != null) ...[
                const SizedBox(height: 8),
                Text(
                  item.errorMessage!,
                  style: GoogleFonts.dmSans(fontSize: 12, color: PrototypeColors.statusDanger),
                ),
              ],
              const SizedBox(height: 16),
              if (item.status == AuditVisitQueueStatus.failed)
                OutlinedButton(
                  onPressed: () async {
                    Navigator.pop(ctx);
                    await ref.read(auditVisitQueueProvider).markPending(item.id);
                    await _syncAll();
                  },
                  child: Text(sheetL10n.syncQueueRetryUpload),
                ),
              TextButton(
                onPressed: () async {
                  Navigator.pop(ctx);
                  await _confirmDelete(
                    title: sheetL10n.syncQueueDeleteAuditVisitTitle,
                    onDelete: () => ref.read(auditVisitQueueProvider).remove(item.id),
                  );
                },
                child: Text(sheetL10n.syncQueueDeleteFromQueue, style: const TextStyle(color: PrototypeColors.statusDanger)),
              ),
            ],
          ),
        );
      },
    );
  }

  void _previewSurvivalItem(QueuedSurvivalSurvey item) {
    final payload = item.payload;
    showModalBottomSheet<void>(
      context: context,
      backgroundColor: PrototypeColors.bgSurface,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(PrototypeRadii.lg)),
      ),
      builder: (ctx) {
        final sheetL10n = AppLocalizations.of(ctx)!;
        return Padding(
          padding: const EdgeInsets.fromLTRB(20, 20, 20, 32),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text(
                sheetL10n.syncQueueSurvivalSurveyTitle,
                style: GoogleFonts.dmSans(fontSize: 18, fontWeight: FontWeight.w600),
              ),
              const SizedBox(height: 8),
              Text(sheetL10n.syncQueueTreeLine('${payload['tree_id']}'), style: GoogleFonts.dmSans(fontSize: 13)),
              Text(sheetL10n.syncQueueSurvivalStatusLine('${payload['survival_status']}'), style: GoogleFonts.dmSans(fontSize: 13)),
              Text(sheetL10n.syncQueueQueueLine(_survivalQueueLabel(item.status)), style: GoogleFonts.dmSans(fontSize: 13)),
              if (item.errorMessage != null) ...[
                const SizedBox(height: 8),
                Text(
                  item.errorMessage!,
                  style: GoogleFonts.dmSans(fontSize: 12, color: PrototypeColors.statusDanger),
                ),
              ],
              const SizedBox(height: 16),
              if (item.status == SurvivalSurveyQueueStatus.failed)
                OutlinedButton(
                  onPressed: () async {
                    Navigator.pop(ctx);
                    await ref.read(survivalSurveyQueueProvider).markPending(item.id);
                    await _syncAll();
                  },
                  child: Text(sheetL10n.syncQueueRetryUpload),
                ),
              TextButton(
                onPressed: () async {
                  Navigator.pop(ctx);
                  await _confirmDelete(
                    title: sheetL10n.syncQueueDeleteSurvivalTitle,
                    onDelete: () => ref.read(survivalSurveyQueueProvider).remove(item.id),
                  );
                },
                child: Text(sheetL10n.syncQueueDeleteFromQueue, style: const TextStyle(color: PrototypeColors.statusDanger)),
              ),
            ],
          ),
        );
      },
    );
  }

  String _survivalQueueLabel(SurvivalSurveyQueueStatus status) {
    final l10n = AppLocalizations.of(context)!;
    switch (status) {
      case SurvivalSurveyQueueStatus.pending:
        return l10n.bioQueuePending;
      case SurvivalSurveyQueueStatus.syncing:
        return l10n.bioQueueSyncing;
      case SurvivalSurveyQueueStatus.failed:
        return l10n.bioQueueFailed;
    }
  }

  String _auditQueueLabel(AuditVisitQueueStatus status) {
    final l10n = AppLocalizations.of(context)!;
    switch (status) {
      case AuditVisitQueueStatus.pending:
        return l10n.bioQueuePending;
      case AuditVisitQueueStatus.syncing:
        return l10n.bioQueueSyncing;
      case AuditVisitQueueStatus.failed:
        return l10n.bioQueueFailed;
    }
  }

  String _queueLabel(TreeQueueStatus status) {
    final l10n = AppLocalizations.of(context)!;
    switch (status) {
      case TreeQueueStatus.pending:
        return l10n.bioQueuePending;
      case TreeQueueStatus.syncing:
        return l10n.bioQueueSyncing;
      case TreeQueueStatus.failed:
        return l10n.bioQueueFailed;
    }
  }

  String _bioQueueLabel(BioacousticQueueStatus status) {
    final l10n = AppLocalizations.of(context)!;
    switch (status) {
      case BioacousticQueueStatus.pending:
        return l10n.bioQueuePending;
      case BioacousticQueueStatus.syncing:
        return l10n.bioQueueSyncing;
      case BioacousticQueueStatus.failed:
        return l10n.bioQueueFailed;
    }
  }
}
