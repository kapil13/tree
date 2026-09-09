import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:share_plus/share_plus.dart';

import '../api/api_errors.dart';
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
      await Share.shareXFiles([XFile(path)], text: 'MRV compliance export');
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('MRV export ready to share')),
        );
      }
    } catch (e) {
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
      await Share.shareXFiles([XFile(path)], text: 'Evidence bundle');
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Evidence bundle ready to share')),
        );
      }
    } catch (e) {
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
    final dashAsync = ref.watch(dashboardProvider);
    final monitoringAsync = ref.watch(monitoringSummaryProvider);
    final projectsAsync = ref.watch(plantingProjectsProvider);
    final projectId = _selectedProjectId;
    final survivalAsync = projectId != null ? ref.watch(survivalDueProvider(projectId)) : null;
    final violationsAsync = projectId != null ? ref.watch(projectViolationsProvider(projectId)) : null;
    final integrityAsync = projectId != null ? ref.watch(integrityFusionProvider(projectId)) : null;

    return stackRouteScaffold(
      location: '/evidence',
      appBar: const PrototypeBackBar(title: 'Evidence & MRV'),
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
                'item': 'Survival survey evidence due',
                'project': '$due trees',
                'status': 'due',
                'route': '/projects/$projectId',
              });
            }
            if (violations != null && violations.isNotEmpty) {
              gaps.add({
                'item': 'Compliance violations open',
                'project': '${violations.length} open',
                'status': 'open',
                'route': '/projects/$projectId',
              });
            }
            if (integrity != null && integrity['monitoring_ready'] != true) {
              gaps.add({
                'item': 'Integrity monitoring gate blocked',
                'project': 'Credit transitions',
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
                'item': 'Survival survey evidence due',
                'project': '$survivalDue trees',
                'status': 'due',
                'route': '/field',
              });
            }
            if (pending > 0) {
              gaps.add({
                'item': 'Compliance violations open',
                'project': 'Field ops',
                'status': 'open',
                'route': '/field',
              });
            }
          }

          return ListView(
            padding: const EdgeInsets.all(16),
            children: [
              Text('Project scope', style: GoogleFonts.dmSans(fontSize: 13, fontWeight: FontWeight.w700)),
              const SizedBox(height: 8),
              projectsAsync.when(
                loading: () => const LinearProgressIndicator(),
                error: (e, _) => Text(apiErrorMessage(e)),
                data: (projects) {
                  if (projects.isEmpty) {
                    return const Text('No projects available');
                  }
                  return DropdownButtonFormField<String?>(
                    value: projectId,
                    decoration: const InputDecoration(
                      labelText: 'Select project',
                      border: OutlineInputBorder(),
                    ),
                    items: [
                      const DropdownMenuItem(value: null, child: Text('Portfolio (all)')),
                      for (final raw in projects)
                        DropdownMenuItem(
                          value: (raw as Map)['id'] as String,
                          child: Text((raw)['name'] as String? ?? 'Project'),
                        ),
                    ],
                    onChanged: (v) => setState(() => _selectedProjectId = v),
                  );
                },
              ),
              const SizedBox(height: 16),
              Text('Evidence pipeline', style: GoogleFonts.dmSans(fontSize: 13, fontWeight: FontWeight.w700)),
              const SizedBox(height: 8),
              PrototypeEvidencePipeline(activeStep: pending > 0 ? 2 : 3),
              const SizedBox(height: 16),
              Row(
                children: [
                  PrototypeStatBox(value: '$verified', label: 'Verified'),
                  const SizedBox(width: 8),
                  PrototypeStatBox(value: '$pending', label: 'Pending'),
                  const SizedBox(width: 8),
                  PrototypeStatBox(value: '${gaps.length}', label: 'Gaps'),
                ],
              ),
              const SizedBox(height: 20),
              const PrototypeSectionHeader(title: 'Gaps needing attention'),
              if (gaps.isEmpty)
                const PrototypeEmptyState(icon: '✓', title: 'No evidence gaps', subtitle: 'Portfolio evidence is up to date')
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
                const PrototypeSectionHeader(title: 'Exports'),
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
                    child: const Text('Download MRV pack (PDF)'),
                  ),
                  const SizedBox(height: 8),
                  OutlinedButton(
                    onPressed: () => _exportMrv('xlsx'),
                    style: const ButtonStyle(minimumSize: WidgetStatePropertyAll(Size.fromHeight(48))),
                    child: const Text('Download MRV pack (Excel)'),
                  ),
                  const SizedBox(height: 8),
                  OutlinedButton(
                    onPressed: _exportEvidenceBundle,
                    style: const ButtonStyle(minimumSize: WidgetStatePropertyAll(Size.fromHeight(48))),
                    child: const Text('Download evidence bundle (ZIP)'),
                  ),
                ],
              ],
              const SizedBox(height: 16),
              OutlinedButton(
                onPressed: () => context.push('/reports'),
                style: const ButtonStyle(minimumSize: WidgetStatePropertyAll(Size.fromHeight(48))),
                child: const Text('Reports & exports'),
              ),
            ],
          );
        },
      ),
    );
  }
}
