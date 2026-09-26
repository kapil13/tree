import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../api/api_errors.dart';
import '../audit_phases.dart';
import '../audit_workspace.dart';
import '../providers.dart';
import '../widgets/prototype/prototype_ui.dart';
import '../widgets/stack_route_scaffold.dart';

/// Per-project Estate Watch 8-phase workspace (Phase F).
class ProjectAuditWorkspaceScreen extends ConsumerStatefulWidget {
  const ProjectAuditWorkspaceScreen({super.key, required this.projectId, this.initialPhase});

  final String projectId;
  final String? initialPhase;

  @override
  ConsumerState<ProjectAuditWorkspaceScreen> createState() => _ProjectAuditWorkspaceScreenState();
}

class _ProjectAuditWorkspaceScreenState extends ConsumerState<ProjectAuditWorkspaceScreen> {
  late String _phase;
  bool _busy = false;

  @override
  void initState() {
    super.initState();
    _phase = widget.initialPhase ?? 'intake';
  }

  Future<Map<String, dynamic>?> _loadEngagement() async {
    final api = await ref.read(apiClientProvider.future);
    return api.getAuditEngagementForProject(widget.projectId);
  }

  Future<void> _ensureEngagement() async {
    setState(() => _busy = true);
    try {
      final api = await ref.read(apiClientProvider.future);
      await api.createAuditEngagement(widget.projectId);
      ref.invalidate(auditPortfolioSummaryProvider);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final projectAsync = ref.watch(plantingProjectProvider(widget.projectId));
    return stackRouteScaffold(
      location: '/projects/${widget.projectId}/audit',
      appBar: PrototypeBackBar(title: 'Estate Watch audit'),
      body: projectAsync.when(
        loading: () => const Center(child: CircularProgressIndicator(color: PrototypeColors.brandCanopy)),
        error: (e, _) => Center(child: Text(apiErrorMessage(e))),
        data: (project) {
          return FutureBuilder<Map<String, dynamic>?>(
            future: _loadEngagement(),
            builder: (context, snap) {
              if (!snap.hasData && snap.connectionState != ConnectionState.done) {
                return const Center(child: CircularProgressIndicator());
              }
              final engagement = snap.data;
              if (engagement == null) {
                return Center(
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text('No audit engagement for ${project['name']}'),
                      const SizedBox(height: 12),
                      FilledButton(
                        onPressed: _busy ? null : _ensureEngagement,
                        child: _busy
                            ? const SizedBox(
                                width: 18,
                                height: 18,
                                child: CircularProgressIndicator(strokeWidth: 2),
                              )
                            : const Text('Start Estate Watch intake'),
                      ),
                    ],
                  ),
                );
              }
              final status = engagement['status'] as String? ?? 'draft';
              if (_phase == 'intake' && widget.initialPhase == null) {
                _phase = defaultAuditPhase(status);
              }
              return Column(
                children: [
                  SizedBox(
                    height: 48,
                    child: ListView(
                      scrollDirection: Axis.horizontal,
                      padding: const EdgeInsets.symmetric(horizontal: 8),
                      children: auditPhases.map((p) {
                        final unlocked = isAuditPhaseUnlocked(p, status);
                        return Padding(
                          padding: const EdgeInsets.symmetric(horizontal: 4),
                          child: ChoiceChip(
                            label: Text(auditPhaseLabel(p)),
                            selected: _phase == p,
                            onSelected: unlocked ? (_) => setState(() => _phase = p) : null,
                          ),
                        );
                      }).toList(),
                    ),
                  ),
                  Expanded(child: _phasePanel(_phase, engagement, status, project)),
                ],
              );
            },
          );
        },
      ),
    );
  }

  Widget _phasePanel(
    String phase,
    Map<String, dynamic> engagement,
    String status,
    Map<String, dynamic> project,
  ) {
    final engagementId = engagement['id'] as String? ?? '';
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        Text(
          auditEngagementStatusLabel(status),
          style: const TextStyle(fontWeight: FontWeight.w600),
        ),
        const SizedBox(height: 8),
        Text(_phaseDescription(phase)),
        const SizedBox(height: 16),
        ..._phaseActions(phase, engagementId, status),
      ],
    );
  }

  String _phaseDescription(String phase) {
    return switch (phase) {
      'intake' => 'Capture audit scope, boundaries, and claim snapshots.',
      'satellite' => 'Review satellite timeline and mark analysis ready.',
      'confidence' => 'Compute confidence map from satellite + registry fusion.',
      'risk' => 'Scan risk anomalies and permanence signals.',
      'sampling' => 'Generate stratified sampling plan and field plot queue.',
      'reconciliation' => 'Reconcile confidence vs field verification.',
      'export' => 'Prepare audit evidence export package.',
      'attestation' => 'Sign or cosign attestation when export is ready.',
      _ => '',
    };
  }

  List<Widget> _phaseActions(String phase, String engagementId, String status) {
    return switch (phase) {
      'sampling' => [
        if (auditNeedsFieldPlots(status))
          FilledButton(
            onPressed: () => context.push('/audit-plots'),
            child: const Text('Open plot visit queue'),
          ),
      ],
      'attestation' => [
        if (auditAttestationEnabled(status))
          FilledButton(
            onPressed: () => context.push('/audit/attestation?engagement=$engagementId'),
            child: const Text('Open attestation'),
          ),
      ],
      'satellite' => [
        OutlinedButton(
          onPressed: () => context.push('/satellite?project=${widget.projectId}'),
          child: const Text('Open satellite workspace'),
        ),
      ],
      _ => [
        const Text(
          'Detailed phase actions are available on web for complex edits. '
          'Mobile supports field verification, attestation, and satellite triggers.',
          style: TextStyle(fontSize: 13, color: PrototypeColors.textSecondary),
        ),
      ],
    };
  }
}
