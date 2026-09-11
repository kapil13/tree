import 'dart:io';

import 'package:byot_mobile/l10n/app_localizations.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';
import '../offline/audit_visit_queue.dart';
import '../offline/bioacoustic_queue.dart';
import '../offline/tree_registration_queue.dart';
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
  bool _syncing = false;
  String? _status;

  @override
  void initState() {
    super.initState();
    Future.microtask(() async {
      await ref.read(treeRegistrationQueueProvider).init();
      await ref.read(bioacousticQueueProvider).init();
      await ref.read(auditVisitQueueProvider).init();
      _reload();
    });
    ref.read(treeRegistrationQueueProvider).addListener(_reload);
    ref.read(bioacousticQueueProvider).addListener(_reload);
    ref.read(auditVisitQueueProvider).addListener(_reload);
  }

  @override
  void dispose() {
    ref.read(treeRegistrationQueueProvider).removeListener(_reload);
    ref.read(bioacousticQueueProvider).removeListener(_reload);
    ref.read(auditVisitQueueProvider).removeListener(_reload);
    super.dispose();
  }

  Future<void> _reload() async {
    final trees = await ref.read(treeRegistrationQueueProvider).listAll();
    final bio = await ref.read(bioacousticQueueProvider).listAll();
    final audit = await ref.read(auditVisitQueueProvider).listAll();
    if (mounted) {
      setState(() {
        _treeItems = trees;
        _bioItems = bio;
        _auditItems = audit;
      });
    }
  }

  Future<void> _syncAll() async {
    final l10n = AppLocalizations.of(context)!;
    setState(() {
      _syncing = true;
      _status = 'Syncing…';
    });
    try {
      final treeSync = ref.read(treeRegistrationSyncProvider);
      final bioSync = ref.read(bioacousticSyncProvider);
      final auditSync = ref.read(auditVisitSyncProvider);
      final treeCount = await treeSync.syncAll(() => ref.read(apiClientProvider.future));
      final bioCount = await bioSync.syncAll(() => ref.read(apiClientProvider.future));
      final auditCount = await auditSync.syncAll(() => ref.read(apiClientProvider.future));
      ref.invalidate(treesProvider);
      ref.invalidate(bioacousticRecordingsProvider);
      ref.invalidate(auditFieldPlotQueueProvider);
      ref.invalidate(fieldOpsSummaryProvider);
      ref.invalidate(dashboardProvider);
      await _reload();
      if (mounted) {
        setState(() => _status = 'Synced ${treeCount + bioCount + auditCount} item(s)');
      }
    } catch (e) {
      if (mounted) setState(() => _status = l10n.retry);
    } finally {
      if (mounted) setState(() => _syncing = false);
    }
  }

  Future<void> _confirmDelete({
    required String title,
    required Future<void> Function() onDelete,
  }) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text(title),
        content: const Text('This removes the offline item from your device. It cannot be undone.'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Cancel')),
          TextButton(onPressed: () => Navigator.pop(ctx, true), child: const Text('Delete')),
        ],
      ),
    );
    if (confirmed == true) {
      await onDelete();
      await _reload();
      if (mounted) setState(() => _status = 'Item removed');
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
        return Padding(
          padding: const EdgeInsets.fromLTRB(20, 20, 20, 32),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text(
                payload['species_text'] as String? ?? 'Tree registration',
                style: GoogleFonts.dmSans(fontSize: 18, fontWeight: FontWeight.w600),
              ),
              const SizedBox(height: 8),
              Text('Status: ${_queueLabel(item.status)}', style: GoogleFonts.dmSans(fontSize: 13)),
              Text('Photos: ${item.photoPaths.length}', style: GoogleFonts.dmSans(fontSize: 13)),
              if (payload['latitude'] != null && payload['longitude'] != null)
                Text(
                  'GPS: ${payload['latitude']}, ${payload['longitude']}',
                  style: GoogleFonts.dmSans(fontSize: 13),
                ),
              Text(
                'Queued: ${item.createdAt.toLocal()}',
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
                  child: const Text('Retry upload'),
                ),
              TextButton(
                onPressed: () async {
                  Navigator.pop(ctx);
                  await _confirmDelete(
                    title: 'Delete tree registration?',
                    onDelete: () => ref.read(treeRegistrationQueueProvider).remove(item.id),
                  );
                },
                child: const Text('Delete from queue', style: TextStyle(color: PrototypeColors.statusDanger)),
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
        return Padding(
          padding: const EdgeInsets.fromLTRB(20, 20, 20, 32),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text(
                'Bioacoustic recording',
                style: GoogleFonts.dmSans(fontSize: 18, fontWeight: FontWeight.w600),
              ),
              const SizedBox(height: 8),
              Text('Duration: ${item.durationSeconds.toStringAsFixed(0)}s', style: GoogleFonts.dmSans(fontSize: 13)),
              Text('Status: ${_bioQueueLabel(item.status)}', style: GoogleFonts.dmSans(fontSize: 13)),
              Text(
                'GPS: ${item.latitude}, ${item.longitude}',
                style: GoogleFonts.dmSans(fontSize: 13),
              ),
              Text(
                'Queued: ${item.createdAt.toLocal()}',
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
                  child: const Text('Retry upload'),
                ),
              TextButton(
                onPressed: () async {
                  Navigator.pop(ctx);
                  await _confirmDelete(
                    title: 'Delete recording?',
                    onDelete: () => ref.read(bioacousticQueueProvider).remove(item.id),
                  );
                },
                child: const Text('Delete from queue', style: TextStyle(color: PrototypeColors.statusDanger)),
              ),
            ],
          ),
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final pending = _treeItems.where((i) => i.status != TreeQueueStatus.syncing).length +
        _bioItems.where((i) => i.status != BioacousticQueueStatus.syncing).length +
        _auditItems.where((i) => i.status != AuditVisitQueueStatus.syncing).length;

    return Scaffold(
      backgroundColor: PrototypeColors.bgApp,
      appBar: PrototypeBackBar(title: 'Sync queue'),
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
                    pending == 0 ? 'All synced' : '$pending item(s) pending',
                    style: GoogleFonts.dmSans(fontSize: 16, fontWeight: FontWeight.w600),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    'Trees, audit visits, and bioacoustic recordings upload when online',
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
                        : Text(l10n.bioSyncNow),
                  ),
                ],
              ),
            ),
            if (_treeItems.isNotEmpty) ...[
              const SizedBox(height: 20),
              PrototypeSectionHeader(title: l10n.pendingTreeRegistrations),
              for (final item in _treeItems)
                PrototypeRegistryRow(
                  code: item.payload['species_text'] as String? ?? 'Tree',
                  species: item.payload['species_text'] as String? ?? '—',
                  meta: '${item.photoPaths.length} photo(s) · ${_queueLabel(item.status)}',
                  health: null,
                  badges: [
                    PrototypeStatusBadge(
                      label: _queueLabel(item.status),
                      variant: item.status == TreeQueueStatus.failed ? 'danger' : 'warn',
                    ),
                  ],
                  onTap: () => _previewTreeItem(item),
                ),
            ],
            if (_auditItems.isNotEmpty) ...[
              const SizedBox(height: 20),
              const PrototypeSectionHeader(title: 'Audit plot visits'),
              for (final item in _auditItems)
                PrototypeRegistryRow(
                  code: item.payload['plot_code'] as String? ?? 'Plot',
                  species: item.payload['tree_presence'] as String? ?? 'visit',
                  meta: '${item.photoPaths.length} photo(s) · ${_auditQueueLabel(item.status)}',
                  health: null,
                  badges: [
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
                  species: '${item.durationSeconds.toStringAsFixed(0)}s recording',
                  meta: item.createdAt.toLocal().toString().substring(0, 16),
                  health: null,
                  badges: [
                    PrototypeStatusBadge(
                      label: _bioQueueLabel(item.status),
                      variant: item.status == BioacousticQueueStatus.failed ? 'danger' : 'warn',
                    ),
                  ],
                  onTap: () => _previewBioItem(item),
                ),
            ],
            if (_treeItems.isEmpty && _bioItems.isEmpty && _auditItems.isEmpty)
              const PrototypeEmptyState(
                icon: '✓',
                title: 'All synced',
                subtitle: 'No pending tree registrations, audit visits, or recordings',
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
        return Padding(
          padding: const EdgeInsets.fromLTRB(20, 20, 20, 32),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text(
                payload['plot_code'] as String? ?? 'Audit plot visit',
                style: GoogleFonts.dmSans(fontSize: 18, fontWeight: FontWeight.w600),
              ),
              const SizedBox(height: 8),
              Text('Presence: ${payload['tree_presence']}', style: GoogleFonts.dmSans(fontSize: 13)),
              Text('Status: ${_auditQueueLabel(item.status)}', style: GoogleFonts.dmSans(fontSize: 13)),
              Text('Photos: ${item.photoPaths.length}', style: GoogleFonts.dmSans(fontSize: 13)),
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
                  child: const Text('Retry upload'),
                ),
              TextButton(
                onPressed: () async {
                  Navigator.pop(ctx);
                  await _confirmDelete(
                    title: 'Delete audit visit?',
                    onDelete: () => ref.read(auditVisitQueueProvider).remove(item.id),
                  );
                },
                child: const Text('Delete from queue', style: TextStyle(color: PrototypeColors.statusDanger)),
              ),
            ],
          ),
        );
      },
    );
  }

  String _auditQueueLabel(AuditVisitQueueStatus status) {
    switch (status) {
      case AuditVisitQueueStatus.pending:
        return 'pending';
      case AuditVisitQueueStatus.syncing:
        return 'syncing';
      case AuditVisitQueueStatus.failed:
        return 'failed';
    }
  }

  String _queueLabel(TreeQueueStatus status) {
    switch (status) {
      case TreeQueueStatus.pending:
        return 'pending';
      case TreeQueueStatus.syncing:
        return 'syncing';
      case TreeQueueStatus.failed:
        return 'failed';
    }
  }

  String _bioQueueLabel(BioacousticQueueStatus status) {
    switch (status) {
      case BioacousticQueueStatus.pending:
        return 'pending';
      case BioacousticQueueStatus.syncing:
        return 'syncing';
      case BioacousticQueueStatus.failed:
        return 'failed';
    }
  }
}
