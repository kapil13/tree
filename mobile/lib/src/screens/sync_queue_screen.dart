import 'package:byot_mobile/l10n/app_localizations.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';
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
  bool _syncing = false;
  String? _status;

  @override
  void initState() {
    super.initState();
    Future.microtask(() async {
      await ref.read(treeRegistrationQueueProvider).init();
      await ref.read(bioacousticQueueProvider).init();
      _reload();
    });
    ref.read(treeRegistrationQueueProvider).addListener(_reload);
    ref.read(bioacousticQueueProvider).addListener(_reload);
  }

  @override
  void dispose() {
    ref.read(treeRegistrationQueueProvider).removeListener(_reload);
    ref.read(bioacousticQueueProvider).removeListener(_reload);
    super.dispose();
  }

  Future<void> _reload() async {
    final trees = await ref.read(treeRegistrationQueueProvider).listAll();
    final bio = await ref.read(bioacousticQueueProvider).listAll();
    if (mounted) {
      setState(() {
        _treeItems = trees;
        _bioItems = bio;
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
      final treeCount = await treeSync.syncAll(() => ref.read(apiClientProvider.future));
      final bioCount = await bioSync.syncAll(() => ref.read(apiClientProvider.future));
      ref.invalidate(treesProvider);
      ref.invalidate(bioacousticRecordingsProvider);
      ref.invalidate(dashboardProvider);
      await _reload();
      if (mounted) {
        setState(() => _status = 'Synced ${treeCount + bioCount} item(s)');
      }
    } catch (e) {
      if (mounted) setState(() => _status = l10n.retry);
    } finally {
      if (mounted) setState(() => _syncing = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final pending = _treeItems.where((i) => i.status != TreeQueueStatus.syncing).length +
        _bioItems.where((i) => i.status != BioacousticQueueStatus.syncing).length;

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
                    'Trees, photos, and bioacoustic recordings upload when online',
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
                  onTap: item.status == TreeQueueStatus.failed
                      ? () async {
                          await ref.read(treeRegistrationQueueProvider).markPending(item.id);
                          await _syncAll();
                        }
                      : null,
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
                  onTap: item.status == BioacousticQueueStatus.failed
                      ? () async {
                          await ref.read(bioacousticQueueProvider).markPending(item.id);
                          await _syncAll();
                        }
                      : null,
                ),
            ],
            if (_treeItems.isEmpty && _bioItems.isEmpty)
              const PrototypeEmptyState(
                icon: '✓',
                title: 'All synced',
                subtitle: 'No pending tree registrations or recordings',
              ),
          ],
        ),
      ),
    );
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
