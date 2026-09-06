import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';

import '../api/api_errors.dart';
import '../providers.dart';
import '../widgets/prototype/prototype_ui.dart';
import '../widgets/stack_route_scaffold.dart';

class EvidenceScreen extends ConsumerWidget {
  const EvidenceScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final dashAsync = ref.watch(dashboardProvider);
    final monitoringAsync = ref.watch(monitoringSummaryProvider);

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
          final survivalDue = monitoringAsync.maybeWhen(
            data: (m) => (m['survival_due'] as num?)?.toInt() ?? 0,
            orElse: () => 0,
          );
          final gaps = <Map<String, String>>[];
          if (survivalDue > 0) {
            gaps.add({'item': 'Survival survey evidence due', 'project': '$survivalDue trees', 'status': 'due'});
          }
          if (pending > 0) {
            gaps.add({'item': 'Compliance violations open', 'project': 'Field ops', 'status': 'open'});
          }

          return ListView(
            padding: const EdgeInsets.all(16),
            children: [
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
                    onTap: () => context.push('/field'),
                  ),
              const SizedBox(height: 16),
              FilledButton(
                onPressed: () => context.push('/reports'),
                style: FilledButton.styleFrom(
                  backgroundColor: PrototypeColors.brandForest,
                  minimumSize: const Size.fromHeight(48),
                ),
                child: const Text('Reports & exports'),
              ),
            ],
          );
        },
      ),
    );
  }
}
