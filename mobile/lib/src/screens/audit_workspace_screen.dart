import 'package:byot_mobile/l10n/app_localizations.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../api/api_errors.dart';
import '../audit_workspace.dart';
import '../nav_access.dart';
import '../project_context.dart';
import '../providers.dart';
import '../session.dart';
import '../widgets/prototype/prototype_ui.dart';
import '../widgets/stack_route_scaffold.dart';

class AuditWorkspaceScreen extends ConsumerWidget {
  const AuditWorkspaceScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context)!;
    final user = sessionController.user;
    if (!canSeeFieldOps(user)) {
      return stackRouteScaffold(
        location: '/audit',
        appBar: PrototypeBackBar(title: l10n.auditWorkspaceTitle),
        body: Center(child: Text(l10n.auditWorkspaceNoAccess)),
      );
    }

    final summaryAsync = ref.watch(auditPortfolioSummaryProvider);
    final plotsAsync = ref.watch(auditFieldPlotQueueProvider);
    final selectedId = ref.watch(selectedProjectIdProvider);
    final projectsAsync = ref.watch(plantingProjectsProvider);
    final projects = projectsAsync.maybeWhen(data: (d) => d, orElse: () => <dynamic>[]);
    final projectLabel = selectedProjectLabel(context, projects, selectedId);

    return stackRouteScaffold(
      location: '/audit',
      appBar: PrototypeBackBar(title: l10n.auditWorkspaceTitle),
      body: summaryAsync.when(
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
                  onPressed: () => ref.invalidate(auditPortfolioSummaryProvider),
                  style: FilledButton.styleFrom(backgroundColor: PrototypeColors.brandForest),
                  child: Text(l10n.retry),
                ),
              ],
            ),
          ),
        ),
        data: (summary) {
          final portfolioProjects = List<Map<String, dynamic>>.from(
            (summary['projects'] as List?)?.map((e) => Map<String, dynamic>.from(e as Map)) ?? [],
          );
          final scopedProjects = selectedId == null
              ? portfolioProjects
              : portfolioProjects.where((p) => p['id'] == selectedId).toList();
          final plotsDue = (summary['audit_plots_due'] as num?)?.toInt() ?? 0;
          final plotQueueCount = plotsAsync.maybeWhen(
            data: (q) => (q['total_due'] as num?)?.toInt() ?? 0,
            orElse: () => plotsDue,
          );
          final exportReady = (summary['engagements_export_ready'] as num?)?.toInt() ?? 0;
          final attested = (summary['engagements_attested'] as num?)?.toInt() ?? 0;
          final inField = (summary['engagements_in_field'] as num?)?.toInt() ?? 0;

          final attestationCandidates = scopedProjects
              .where((p) => auditAttestationEnabled(p['engagement_status'] as String?))
              .toList();
          final nextAttestation = attestationCandidates.cast<Map<String, dynamic>?>().firstWhere(
                (p) => p?['engagement_status'] != 'attested',
                orElse: () => attestationCandidates.isNotEmpty ? attestationCandidates.first : null,
              );

          return RefreshIndicator(
            color: PrototypeColors.brandCanopy,
            onRefresh: () async {
              ref.invalidate(auditPortfolioSummaryProvider);
              ref.invalidate(auditFieldPlotQueueProvider);
            },
            child: ListView(
              padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
              children: [
                PrototypeContextStrip(
                  project: projectLabel,
                  meta: l10n.auditWorkspaceSubtitle,
                ),
                PrototypeSignalStrip(
                  signals: [
                    PrototypeSignal(value: '${summary['engagement_count'] ?? 0}', label: l10n.auditEngagements),
                    PrototypeSignal(value: '$plotQueueCount', label: l10n.auditPlotsDue),
                    PrototypeSignal(value: '$inField', label: l10n.auditInField),
                    PrototypeSignal(value: '$exportReady', label: l10n.auditExportReady),
                    PrototypeSignal(value: '$attested', label: l10n.auditAttested),
                  ],
                ),
                if (plotQueueCount > 0)
                  PrototypeNextUpHero(
                    fieldStyle: true,
                    label: l10n.auditNearestAction,
                    title: l10n.auditPlotsDueTitle(plotQueueCount),
                    subtitle: l10n.auditPlotsDueSubtitle,
                    action: '${l10n.auditOpenPlots} →',
                    onTap: () => context.push('/audit-plots'),
                  ),
                if (nextAttestation != null && nextAttestation['engagement_id'] != null) ...[
                  PrototypeNextUpHero(
                    fieldStyle: true,
                    label: l10n.auditAttestationAction,
                    title: auditEngagementStatusLabel(nextAttestation['engagement_status'] as String? ?? ''),
                    subtitle: nextAttestation['name'] as String? ?? l10n.projectFallback,
                    action: '${l10n.auditOpenAttestation} →',
                    onTap: () => context.push(
                      '/audit/attestation?engagement=${nextAttestation['engagement_id']}',
                    ),
                  ),
                ],
                PrototypeSectionHeader(
                  title: l10n.auditQuickLinks,
                ),
                PrototypePriorityCard(
                  icon: '📍',
                  title: l10n.auditPlotVisits,
                  subtitle: plotQueueCount > 0
                      ? l10n.auditPlotsDueTitle(plotQueueCount)
                      : l10n.auditPlotsAllVisited,
                  onTap: () => context.push('/audit-plots'),
                ),
                PrototypePriorityCard(
                  icon: '✓',
                  title: l10n.auditAttestationTitle,
                  subtitle: l10n.auditAttestationMobileSubtitle,
                  onTap: () {
                    if (nextAttestation?['engagement_id'] != null) {
                      context.push('/audit/attestation?engagement=${nextAttestation!['engagement_id']}');
                      return;
                    }
                    if (attestationCandidates.isNotEmpty) {
                      final first = attestationCandidates.first;
                      context.push('/audit/attestation?engagement=${first['engagement_id']}');
                      return;
                    }
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(content: Text(l10n.auditAttestationUnavailable)),
                    );
                  },
                ),
                PrototypePriorityCard(
                  icon: '☁',
                  title: l10n.navSyncQueue,
                  subtitle: l10n.auditSyncQueueHint,
                  onTap: () => context.push('/sync-queue'),
                ),
                PrototypeSectionHeader(
                  title: l10n.auditProjectsTitle,
                  linkLabel: l10n.viewAllProjects,
                  onLink: () => context.go('/projects'),
                ),
                if (scopedProjects.isEmpty)
                  PrototypeEmptyState(
                    icon: '🌲',
                    title: l10n.auditNoEstateProjects,
                    subtitle: l10n.auditNoEstateProjectsHint,
                  )
                else
                  for (final project in scopedProjects)
                    PrototypeConnectedProject(
                      name: project['name'] as String? ?? l10n.projectFallback,
                      meta:
                          '${auditEngagementStatusLabel(project['engagement_status'] as String? ?? '')} · ${project['audit_plots_due'] ?? 0} plots due',
                      badge: auditEngagementStatusLabel(project['engagement_status'] as String? ?? ''),
                      badgeOk: project['engagement_status'] == 'attested',
                      onTap: () {
                        final engagementId = project['engagement_id'] as String?;
                        final status = project['engagement_status'] as String?;
                        if (engagementId != null && auditAttestationEnabled(status)) {
                          context.push('/audit/attestation?engagement=$engagementId');
                          return;
                        }
                        if (auditNeedsFieldPlots(status)) {
                          context.push('/audit-plots');
                          return;
                        }
                        context.push('/projects/${project['id']}');
                      },
                    ),
              ],
            ),
          );
        },
      ),
    );
  }
}
