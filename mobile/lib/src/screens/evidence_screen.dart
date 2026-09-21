import 'package:byot_mobile/l10n/app_localizations.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:share_plus/share_plus.dart';

import '../api/api_errors.dart';
import '../widgets/session_aware_error.dart';
import '../providers.dart';
import '../widgets/prototype/prototype_ui.dart';
import '../widgets/stack_route_scaffold.dart';

class EvidenceScreen extends ConsumerStatefulWidget {
  const EvidenceScreen({super.key, this.projectId});

  final String? projectId;

  @override
  ConsumerState<EvidenceScreen> createState() => _EvidenceScreenState();
}

class _EvidenceScreenState extends ConsumerState<EvidenceScreen> {
  String? _selectedProjectId;
  bool _exportBusy = false;

  @override
  void initState() {
    super.initState();
    _selectedProjectId = widget.projectId;
  }

  Future<void> _exportMrv(String format) async {
    final l10n = AppLocalizations.of(context)!;
    final projectId = _selectedProjectId;
    if (projectId == null) return;
    setState(() => _exportBusy = true);
    try {
      final api = await ref.read(apiClientProvider.future);
      final project = await ref.read(plantingProjectProvider(projectId).future);
      final code = project['code'] as String? ?? projectId;
      final path = await api.downloadMrvExport(
        projectId: projectId,
        projectCode: code,
        format: format,
      );
      await Share.shareXFiles([XFile(path)], text: l10n.evidenceMrvShareText);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(l10n.evidenceMrvReady)),
        );
      }
    } catch (e) {
      if (redirectIfUnauthorized(ref, context, e)) return;
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(apiErrorMessage(e))),
        );
      }
    } finally {
      if (mounted) setState(() => _exportBusy = false);
    }
  }

  Future<void> _exportEvidenceBundle() async {
    final l10n = AppLocalizations.of(context)!;
    final projectId = _selectedProjectId;
    if (projectId == null) return;
    setState(() => _exportBusy = true);
    try {
      final api = await ref.read(apiClientProvider.future);
      final project = await ref.read(plantingProjectProvider(projectId).future);
      final code = project['code'] as String? ?? projectId;
      final path = await api.downloadEvidenceBundle(
        projectId: projectId,
        projectCode: code,
      );
      await Share.shareXFiles([XFile(path)], text: l10n.evidenceBundleShareText);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(l10n.evidenceBundleReady)),
        );
      }
    } catch (e) {
      if (redirectIfUnauthorized(ref, context, e)) return;
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(apiErrorMessage(e))),
        );
      }
    } finally {
      if (mounted) setState(() => _exportBusy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final dashAsync = ref.watch(dashboardProvider);
    final monitoringAsync = ref.watch(monitoringSummaryProvider);
    final projectsAsync = ref.watch(plantingProjectsProvider);
    final projectId = _selectedProjectId;
    final survivalAsync = projectId != null ? ref.watch(survivalDueProvider(projectId)) : null;
    final violationsAsync = projectId != null ? ref.watch(projectViolationsProvider(projectId)) : null;
    final integrityAsync = projectId != null ? ref.watch(integrityFusionProvider(projectId)) : null;

    return stackRouteScaffold(
      location: '/evidence',
      appBar: PrototypeBackBar(title: l10n.evidenceTitle),
      body: dashAsync.when(
        loading: () => const Center(child: CircularProgressIndicator(color: PrototypeColors.brandCanopy)),
        error: (e, _) => Center(child: Text(apiErrorMessage(e))),
        data: (dashboard) {
          final kpi = dashboard['kpi'] as Map<String, dynamic>? ?? {};
          final verified = (kpi['verified_trees'] as num?)?.toInt() ?? (kpi['total_trees'] as num?)?.toInt() ?? 0;
          final pending = monitoringAsync.maybeWhen(
            data: (m) => (m['open_violations'] as num?)?.toInt() ?? 0,
            orElse: () => 0,
          );

          final gaps = <Map<String, String>>[];
          if (projectId != null) {
            final survival = survivalAsync?.maybeWhen(data: (s) => s, orElse: () => null);
            final violations = violationsAsync?.maybeWhen(data: (v) => v, orElse: () => null);
            final integrity = integrityAsync?.maybeWhen(data: (i) => i, orElse: () => null);
            final due = (survival?['trees_due'] as num?)?.toInt() ?? 0;
            if (due > 0) {
              gaps.add({
                'item': l10n.evidenceGapSurvivalDue,
                'project': l10n.evidenceGapTreesCount('$due'),
                'status': 'due',
                'route': '/projects/$projectId',
              });
            }
            if (violations != null && violations.isNotEmpty) {
              gaps.add({
                'item': l10n.evidenceGapViolationsOpen,
                'project': l10n.evidenceGapOpenCount('${violations.length}'),
                'status': 'open',
                'route': '/projects/$projectId',
              });
            }
            if (integrity != null && integrity['monitoring_ready'] != true) {
              gaps.add({
                'item': l10n.evidenceGapIntegrityBlocked,
                'project': l10n.evidenceGapCreditTransitions,
                'status': 'blocked',
                'route': '/projects/$projectId',
              });
            }
          } else {
            final survivalDue = monitoringAsync.maybeWhen(
              data: (m) => (m['survival_due'] as num?)?.toInt() ?? 0,
              orElse: () => 0,
            );
            if (survivalDue > 0) {
              gaps.add({
                'item': l10n.evidenceGapSurvivalDue,
                'project': l10n.evidenceGapTreesCount('$survivalDue'),
                'status': 'due',
                'route': '/field',
              });
            }
            if (pending > 0) {
              gaps.add({
                'item': l10n.evidenceGapViolationsOpen,
                'project': l10n.evidenceGapFieldOps,
                'status': 'open',
                'route': '/field',
              });
            }
          }

          return ListView(
            padding: const EdgeInsets.all(16),
            children: [
              Text(l10n.evidenceProjectScope, style: GoogleFonts.dmSans(fontSize: 13, fontWeight: FontWeight.w700)),
              const SizedBox(height: 8),
              projectsAsync.when(
                loading: () => const LinearProgressIndicator(),
                error: (e, _) => Text(apiErrorMessage(e)),
                data: (projects) {
                  if (projects.isEmpty) {
                    return Text(l10n.evidenceNoProjects);
                  }
                  return DropdownButtonFormField<String?>(
                    value: projectId,
                    decoration: InputDecoration(
                      labelText: l10n.evidenceSelectProject,
                      border: const OutlineInputBorder(),
                    ),
                    items: [
                      DropdownMenuItem(value: null, child: Text(l10n.evidencePortfolioAll)),
                      for (final raw in projects)
                        DropdownMenuItem(
                          value: (raw as Map)['id'] as String,
                          child: Text((raw)['name'] as String? ?? l10n.projectFallback),
                        ),
                    ],
                    onChanged: (v) => setState(() => _selectedProjectId = v),
                  );
                },
              ),
              const SizedBox(height: 16),
              Text(l10n.evidencePipeline, style: GoogleFonts.dmSans(fontSize: 13, fontWeight: FontWeight.w700)),
              const SizedBox(height: 8),
              PrototypeEvidencePipeline(activeStep: pending > 0 ? 2 : 3),
              const SizedBox(height: 16),
              Row(
                children: [
                  PrototypeStatBox(value: '$verified', label: l10n.evidenceVerified),
                  const SizedBox(width: 8),
                  PrototypeStatBox(value: '$pending', label: l10n.evidencePending),
                  const SizedBox(width: 8),
                  PrototypeStatBox(value: '${gaps.length}', label: l10n.evidenceGaps),
                ],
              ),
              const SizedBox(height: 20),
              PrototypeSectionHeader(title: l10n.evidenceGapsHeader),
              if (gaps.isEmpty)
                PrototypeEmptyState(icon: '✓', title: l10n.evidenceNoGaps, subtitle: l10n.evidenceNoGapsSub)
              else
                for (final g in gaps)
                  PrototypePriorityCard(
                    icon: '📋',
                    title: g['item']!,
                    subtitle: g['project']!,
                    severity: 'high',
                    action: g['status'],
                    onTap: () => context.push(g['route'] ?? '/field'),
                  ),
              if (projectId != null) ...[
                const SizedBox(height: 20),
                PrototypeSectionHeader(title: l10n.evidenceExports),
                if (_exportBusy)
                  const Padding(
                    padding: EdgeInsets.symmetric(vertical: 12),
                    child: Center(child: CircularProgressIndicator(color: PrototypeColors.brandCanopy)),
                  )
                else ...[
                  FilledButton(
                    onPressed: () => _exportMrv('pdf'),
                    style: FilledButton.styleFrom(
                      backgroundColor: PrototypeColors.brandForest,
                      minimumSize: const Size.fromHeight(48),
                    ),
                    child: Text(l10n.evidenceDownloadMrvPdf),
                  ),
                  const SizedBox(height: 8),
                  OutlinedButton(
                    onPressed: () => _exportMrv('xlsx'),
                    style: const ButtonStyle(minimumSize: WidgetStatePropertyAll(Size.fromHeight(48))),
                    child: Text(l10n.evidenceDownloadMrvExcel),
                  ),
                  const SizedBox(height: 8),
                  OutlinedButton(
                    onPressed: _exportEvidenceBundle,
                    style: const ButtonStyle(minimumSize: WidgetStatePropertyAll(Size.fromHeight(48))),
                    child: Text(l10n.evidenceDownloadBundle),
                  ),
                ],
              ],
              const SizedBox(height: 16),
              OutlinedButton(
                onPressed: () => context.push('/reports'),
                style: const ButtonStyle(minimumSize: WidgetStatePropertyAll(Size.fromHeight(48))),
                child: Text(l10n.evidenceReportsExports),
              ),
            ],
          );
        },
      ),
    );
  }
}
