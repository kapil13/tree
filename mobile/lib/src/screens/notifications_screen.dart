import 'package:byot_mobile/l10n/app_localizations.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../api/api_errors.dart';
import '../l10n/alert_filters.dart';
import '../l10n/alert_labels.dart';
import '../providers.dart';
import '../widgets/prototype/prototype_ui.dart';

class NotificationsScreen extends ConsumerStatefulWidget {
  const NotificationsScreen({super.key});

  @override
  ConsumerState<NotificationsScreen> createState() => _NotificationsScreenState();
}

class _NotificationsScreenState extends ConsumerState<NotificationsScreen> {
  String _filter = 'all';
  String? _appliedRouteFilter;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    final routeFilter = GoRouterState.of(context).uri.queryParameters['filter'];
    if (routeFilter != null &&
        routeFilter.isNotEmpty &&
        routeFilter != _appliedRouteFilter) {
      _appliedRouteFilter = routeFilter;
      _filter = routeFilter;
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
        backgroundColor: PrototypeColors.bgSurface,
        shape: const RoundedRectangleBorder(
          borderRadius: BorderRadius.vertical(top: Radius.circular(PrototypeRadii.lg)),
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
                          style: FilledButton.styleFrom(backgroundColor: PrototypeColors.brandForest),
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

  List<dynamic> _filtered(List<dynamic> items) {
    return items
        .where((a) => matchesAlertFilter(a as Map<String, dynamic>, _filter))
        .toList();
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final lang = Localizations.localeOf(context).languageCode;
    final alertsAsync = ref.watch(alertsProvider);
    return Scaffold(
      backgroundColor: PrototypeColors.bgApp,
      appBar: PrototypeBackBar(
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
        loading: () => const Center(child: CircularProgressIndicator(color: PrototypeColors.brandCanopy)),
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
                  style: FilledButton.styleFrom(backgroundColor: PrototypeColors.brandForest),
                  child: Text(l10n.retry),
                ),
              ],
            ),
          ),
        ),
        data: (items) {
          final filtered = _filtered(items);
          return RefreshIndicator(
            color: PrototypeColors.brandCanopy,
            onRefresh: () async => ref.invalidate(alertsProvider),
            child: ListView(
              padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
              children: [
                Wrap(
                  spacing: 6,
                  runSpacing: 6,
                  children: [
                    for (final filter in alertFilterChipOrder)
                      PrototypeFilterChip(
                        label: alertFilterLabel(filter, languageCode: lang),
                        selected: _filter == filter,
                        onTap: () => setState(() => _filter = filter),
                      ),
                  ],
                ),
                const SizedBox(height: 12),
                if (filtered.isEmpty)
                  PrototypeEmptyState(icon: '🔔', title: l10n.noAlerts)
                else
                  ...filtered.map((raw) {
                    final a = raw as Map<String, dynamic>;
                    final kind = a['kind'] as String? ?? '';
                    return PrototypeAlertItem(
                      title: a['title'] as String? ?? 'Alert',
                      detail: a['message'] as String? ?? alertKindLabel(kind, languageCode: lang),
                      time: a['created_at'] as String? ?? '',
                      severity: a['severity'] as String? ?? 'moderate',
                      onTap: () async {
                        if (a['is_read'] != true) {
                          try {
                            final api = await ref.read(apiClientProvider.future);
                            await api.markAlertRead(a['id'] as String);
                            ref.invalidate(alertsProvider);
                          } catch (_) {}
                        }
                        if (context.mounted) context.push('/alerts/${a['id']}');
                      },
                    );
                  }),
              ],
            ),
          );
        },
      ),
    );
  }
}
