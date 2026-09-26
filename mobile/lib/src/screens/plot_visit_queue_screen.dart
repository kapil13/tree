import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../api/api_errors.dart';
import '../providers.dart';
import '../widgets/prototype/prototype_ui.dart';
import '../widgets/stack_route_scaffold.dart';

/// Tier-4 plot monitoring visit queue (Phase F).
class PlotVisitQueueScreen extends ConsumerStatefulWidget {
  const PlotVisitQueueScreen({super.key, this.projectId});

  final String? projectId;

  @override
  ConsumerState<PlotVisitQueueScreen> createState() => _PlotVisitQueueScreenState();
}

class _PlotVisitQueueScreenState extends ConsumerState<PlotVisitQueueScreen> {
  bool _busy = false;
  String? _notes;

  Future<void> _recordVisit(String plotId) async {
    setState(() => _busy = true);
    try {
      final api = await ref.read(apiClientProvider.future);
      await api.recordPlotVisit(
        plotId,
        observation: {'alive': true},
        notes: _notes,
      );
      ref.invalidate(plotVisitQueueProvider(widget.projectId));
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Visit recorded')));
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(apiErrorMessage(e))));
      }
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final queueAsync = ref.watch(plotVisitQueueProvider(widget.projectId));
    return stackRouteScaffold(
      location: '/plot-visits',
      appBar: PrototypeBackBar(title: 'Plot visit queue'),
      body: queueAsync.when(
        loading: () => const Center(child: CircularProgressIndicator(color: PrototypeColors.brandCanopy)),
        error: (e, _) => Center(child: Text(apiErrorMessage(e))),
        data: (plots) {
          if (plots.isEmpty) {
            return const Center(child: Text('No plots due for visit'));
          }
          return ListView(
            padding: const EdgeInsets.all(16),
            children: [
              TextField(
                decoration: const InputDecoration(labelText: 'Visit notes (optional)'),
                onChanged: (v) => _notes = v.trim().isEmpty ? null : v.trim(),
              ),
              const SizedBox(height: 12),
              for (final raw in plots)
                Card(
                  child: ListTile(
                    title: Text((raw as Map)['plot_code'] as String? ?? 'Plot'),
                    subtitle: Text(
                      '${(raw as Map)['stratum_id'] ?? ''} · ${(raw as Map)['status'] ?? 'due'}',
                    ),
                    trailing: _busy
                        ? const SizedBox(
                            width: 18,
                            height: 18,
                            child: CircularProgressIndicator(strokeWidth: 2),
                          )
                        : FilledButton(
                            onPressed: () => _recordVisit((raw as Map)['id'] as String),
                            child: const Text('Record'),
                          ),
                  ),
                ),
            ],
          );
        },
      ),
    );
  }
}
