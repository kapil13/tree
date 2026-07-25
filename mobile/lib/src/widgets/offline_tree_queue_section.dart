import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../nav_access.dart';
import '../offline/tree_registration_queue.dart';
import '../offline/tree_registration_sync.dart';
import '../providers.dart';
import '../theme.dart';

class OfflineTreeQueueSection extends ConsumerStatefulWidget {
  const OfflineTreeQueueSection({super.key});

  @override
  ConsumerState<OfflineTreeQueueSection> createState() => _OfflineTreeQueueSectionState();
}

class _OfflineTreeQueueSectionState extends ConsumerState<OfflineTreeQueueSection> {
  List<QueuedTreeRegistration> _items = [];

  @override
  void initState() {
    super.initState();
    ref.read(treeRegistrationQueueProvider).addListener(_reload);
    _reload();
  }

  @override
  void dispose() {
    ref.read(treeRegistrationQueueProvider).removeListener(_reload);
    super.dispose();
  }

  Future<void> _reload() async {
    final items = await ref.read(treeRegistrationQueueProvider).listAll();
    if (mounted) setState(() => _items = items);
  }

  String _statusLabel(TreeQueueStatus status) {
    switch (status) {
      case TreeQueueStatus.pending:
        return 'Pending upload';
      case TreeQueueStatus.syncing:
        return 'Syncing…';
      case TreeQueueStatus.failed:
        return 'Failed';
    }
  }

  IconData _statusIcon(TreeQueueStatus status) {
    switch (status) {
      case TreeQueueStatus.pending:
        return Icons.cloud_upload_outlined;
      case TreeQueueStatus.syncing:
        return Icons.sync;
      case TreeQueueStatus.failed:
        return Icons.error_outline;
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_items.isEmpty) return const SizedBox.shrink();
    final sync = ref.watch(treeRegistrationSyncProvider);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Text('Pending tree registrations', style: Theme.of(context).textTheme.titleMedium),
            const Spacer(),
            if (sync.syncing)
              const Padding(
                padding: EdgeInsets.only(right: 8),
                child: SizedBox(
                  width: 18,
                  height: 18,
                  child: CircularProgressIndicator(strokeWidth: 2),
                ),
              ),
            TextButton.icon(
              onPressed: sync.syncing
                  ? null
                  : () => sync.syncAll(() => ref.read(apiClientProvider.future)),
              icon: const Icon(Icons.sync, size: 18),
              label: const Text('Sync now'),
            ),
          ],
        ),
        const SizedBox(height: 8),
        ..._items.map((item) {
          final species = item.payload['species_text'] as String? ?? 'Tree';
          return Card(
            margin: const EdgeInsets.only(bottom: 8),
            child: ListTile(
              leading: Icon(_statusIcon(item.status), color: AranyixColors.forest),
              title: Text('$species · ${_statusLabel(item.status)}'),
              subtitle: Text(
                '${item.createdAt.toLocal().toString().substring(0, 16)}'
                '${item.photoPaths.isNotEmpty ? ' · ${item.photoPaths.length} photo(s)' : ''}'
                '${item.errorMessage != null && item.errorMessage!.isNotEmpty ? '\n${item.errorMessage}' : ''}',
              ),
              isThreeLine: item.errorMessage != null && item.errorMessage!.isNotEmpty,
              trailing: item.status == TreeQueueStatus.failed
                  ? IconButton(
                      tooltip: 'Retry',
                      onPressed: () async {
                        await ref.read(treeRegistrationQueueProvider).markPending(item.id);
                        await sync.syncAll(() => ref.read(apiClientProvider.future));
                      },
                      icon: const Icon(Icons.refresh),
                    )
                  : null,
            ),
          );
        }),
      ],
    );
  }
}

class PendingSyncBanner extends ConsumerWidget {
  const PendingSyncBanner({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final treeQueue = ref.watch(treeRegistrationQueueProvider);
    final bioQueue = ref.watch(bioacousticQueueProvider);
    final treeSync = ref.watch(treeRegistrationSyncProvider);
    final bioSync = ref.watch(bioacousticSyncProvider);

    return FutureBuilder<int>(
      future: Future.wait([
        treeQueue.pendingCount(),
        bioQueue.pendingCount(),
      ]).then((counts) => counts[0] + counts[1]),
      builder: (context, snapshot) {
        final pending = snapshot.data ?? 0;
        if (pending == 0 && !treeSync.syncing && !bioSync.syncing) {
          return const SizedBox.shrink();
        }
        return Container(
          width: double.infinity,
          margin: const EdgeInsets.fromLTRB(16, 8, 16, 0),
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
          decoration: BoxDecoration(
            color: AranyixColors.warningContainer,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: AranyixColors.warningBorder),
          ),
          child: Row(
            children: [
              Icon(
                treeSync.syncing || bioSync.syncing ? Icons.sync : Icons.cloud_upload_outlined,
                size: 18,
                color: AranyixColors.warningOnContainer,
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Text(
                  treeSync.syncing || bioSync.syncing
                      ? 'Syncing offline data…'
                      : '$pending item(s) waiting to sync when online',
                  style: const TextStyle(fontSize: 13, color: AranyixColors.warningOnContainer),
                ),
              ),
            ],
          ),
        );
      },
    );
  }
}
