import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../api/api_errors.dart';
import '../providers.dart';

class NotificationsScreen extends ConsumerWidget {
  const NotificationsScreen({super.key});

  Color _severityColor(String? severity) {
    switch (severity) {
      case 'critical':
        return Colors.red.shade700;
      case 'high':
        return Colors.orange.shade800;
      case 'moderate':
        return Colors.amber.shade800;
      default:
        return Colors.green.shade700;
    }
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final alertsAsync = ref.watch(alertsProvider);
    return Scaffold(
      appBar: AppBar(title: const Text('Notifications')),
      body: alertsAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(apiErrorMessage(e), textAlign: TextAlign.center),
                const SizedBox(height: 12),
                FilledButton(
                  onPressed: () => ref.invalidate(alertsProvider),
                  child: const Text('Retry'),
                ),
              ],
            ),
          ),
        ),
        data: (items) {
          if (items.isEmpty) {
            return const Center(child: Text('No alerts.'));
          }
          return RefreshIndicator(
            onRefresh: () async => ref.invalidate(alertsProvider),
            child: ListView.separated(
              padding: const EdgeInsets.all(8),
              itemCount: items.length,
              separatorBuilder: (_, __) => const SizedBox(height: 4),
              itemBuilder: (_, i) {
                final a = items[i] as Map<String, dynamic>;
                final isRead = a['is_read'] == true;
                final severity = a['severity'] as String?;
                return Card(
                  color: isRead ? null : Colors.green.shade50,
                  child: ListTile(
                    leading: Icon(Icons.notifications, color: _severityColor(severity)),
                    title: Text(a['title'] as String? ?? 'Alert'),
                    subtitle: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(a['message'] as String? ?? ''),
                        if (a['created_at'] != null)
                          Text(
                            a['created_at'] as String,
                            style: const TextStyle(fontSize: 11, color: Colors.grey),
                          ),
                      ],
                    ),
                    isThreeLine: true,
                    onTap: () async {
                      if (!isRead) {
                        try {
                          final api = await ref.read(apiClientProvider.future);
                          await api.markAlertRead(a['id'] as String);
                          ref.invalidate(alertsProvider);
                        } catch (e) {
                          if (context.mounted) {
                            ScaffoldMessenger.of(context).showSnackBar(
                              SnackBar(content: Text(apiErrorMessage(e))),
                            );
                          }
                        }
                      }
                      final treeId = a['tree_id'] as String?;
                      if (treeId != null && context.mounted) {
                        context.push('/trees/$treeId');
                      }
                    },
                  ),
                );
              },
            ),
          );
        },
      ),
    );
  }
}
