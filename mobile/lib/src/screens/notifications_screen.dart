import 'package:byot_mobile/l10n/app_localizations.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../api/api_errors.dart';
import '../providers.dart';
import '../theme.dart';
import '../widgets/shell_scaffold.dart';

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

  Future<void> _openPreferences(BuildContext context, WidgetRef ref) async {
    final l10n = AppLocalizations.of(context)!;
    try {
      final api = await ref.read(apiClientProvider.future);
      final prefs = await api.getAlertPreferences();
      if (!context.mounted) return;

      var satellite = (prefs['satellite_health'] as Map?)?['enabled'] == true;
      var survival = (prefs['survival_survey'] as Map?)?['enabled'] == true;
      var threat = (prefs['threat_watch'] as Map?)?['enabled'] == true;
      var compliance = (prefs['compliance'] as Map?)?['enabled'] == true;
      var saving = false;

      await showModalBottomSheet<void>(
        context: context,
        backgroundColor: AranyixColors.surfaceContainer,
        shape: const RoundedRectangleBorder(
          borderRadius: BorderRadius.vertical(top: Radius.circular(AranyixRadii.card)),
        ),
        builder: (ctx) {
          return StatefulBuilder(
            builder: (ctx, setSheet) {
              return SafeArea(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(8, 12, 8, 16),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text(l10n.alertPreferences, style: Theme.of(ctx).textTheme.titleLarge),
                      SwitchListTile(
                        title: Text(l10n.satelliteHealth),
                        value: satellite,
                        onChanged: saving ? null : (v) => setSheet(() => satellite = v),
                      ),
                      SwitchListTile(
                        title: Text(l10n.survivalSurvey),
                        value: survival,
                        onChanged: saving ? null : (v) => setSheet(() => survival = v),
                      ),
                      SwitchListTile(
                        title: Text(l10n.threatWatch),
                        value: threat,
                        onChanged: saving ? null : (v) => setSheet(() => threat = v),
                      ),
                      SwitchListTile(
                        title: Text(l10n.complianceLabel),
                        value: compliance,
                        onChanged: saving ? null : (v) => setSheet(() => compliance = v),
                      ),
                      const SizedBox(height: 8),
                      Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 12),
                        child: FilledButton(
                          onPressed: saving
                              ? null
                              : () async {
                                  setSheet(() => saving = true);
                                  try {
                                    await api.updateAlertPreferences({
                                      'satellite_health': {
                                        ...Map<String, dynamic>.from(
                                          (prefs['satellite_health'] as Map?) ?? const {},
                                        ),
                                        'enabled': satellite,
                                      },
                                      'survival_survey': {
                                        ...Map<String, dynamic>.from(
                                          (prefs['survival_survey'] as Map?) ?? const {},
                                        ),
                                        'enabled': survival,
                                      },
                                      'threat_watch': {
                                        ...Map<String, dynamic>.from(
                                          (prefs['threat_watch'] as Map?) ?? const {},
                                        ),
                                        'enabled': threat,
                                      },
                                      'compliance': {
                                        ...Map<String, dynamic>.from(
                                          (prefs['compliance'] as Map?) ?? const {},
                                        ),
                                        'enabled': compliance,
                                      },
                                    });
                                    if (ctx.mounted) Navigator.pop(ctx);
                                    if (context.mounted) {
                                      ScaffoldMessenger.of(context).showSnackBar(
                                        SnackBar(content: Text(l10n.preferencesSaved)),
                                      );
                                    }
                                  } catch (e) {
                                    setSheet(() => saving = false);
                                    if (context.mounted) {
                                      ScaffoldMessenger.of(context).showSnackBar(
                                        SnackBar(content: Text(apiErrorMessage(e))),
                                      );
                                    }
                                  }
                                },
                          child: Text(saving ? l10n.saving : l10n.save),
                        ),
                      ),
                    ],
                  ),
                ),
              );
            },
          );
        },
      );
    } catch (e) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(apiErrorMessage(e))),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context)!;
    final alertsAsync = ref.watch(alertsProvider);
    return Scaffold(
      appBar: ShellTopBar(
        title: l10n.navAlerts,
        actions: [
          IconButton(
            tooltip: l10n.preferences,
            onPressed: () => _openPreferences(context, ref),
            icon: const Icon(Icons.tune),
          ),
        ],
      ),
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
                  child: Text(l10n.retry),
                ),
              ],
            ),
          ),
        ),
        data: (items) {
          if (items.isEmpty) {
            return Center(child: Text(l10n.noAlerts));
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
                      if (!context.mounted) return;
                      final payload = a['payload'] as Map<String, dynamic>?;
                      final mobileDeepLink = payload?['mobile_deep_link'] as String?;
                      final deepLink = payload?['deep_link'] as String?;
                      final fenceId = payload?['fence_id'] as String?;
                      final treeId = a['tree_id'] as String? ?? payload?['tree_id'] as String?;
                      final projectId = payload?['project_id'] as String?;
                      final target = mobileDeepLink ?? deepLink;
                      if (target != null && target.startsWith('/')) {
                        context.push(target);
                      } else if (fenceId != null) {
                        context.push('/monitoring?fence=$fenceId');
                      } else if (treeId != null) {
                        context.push('/trees/$treeId');
                      } else if (projectId != null) {
                        context.push('/projects/$projectId');
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
