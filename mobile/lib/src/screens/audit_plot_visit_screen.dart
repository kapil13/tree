import 'package:byot_mobile/l10n/app_localizations.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../api/api_errors.dart';
import '../providers.dart';
import '../theme.dart';
import '../widgets/stack_route_scaffold.dart';

class AuditPlotVisitScreen extends ConsumerStatefulWidget {
  const AuditPlotVisitScreen({super.key, this.plot});

  final Map<String, dynamic>? plot;

  @override
  ConsumerState<AuditPlotVisitScreen> createState() => _AuditPlotVisitScreenState();
}

class _AuditPlotVisitScreenState extends ConsumerState<AuditPlotVisitScreen> {
  Map<String, dynamic>? _activePlot;
  final _treesObservedController = TextEditingController();
  final _treesAliveController = TextEditingController();
  final _notesController = TextEditingController();
  String _outcome = 'inconclusive';
  bool _saving = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _activePlot = widget.plot;
  }

  @override
  void dispose() {
    _treesObservedController.dispose();
    _treesAliveController.dispose();
    _notesController.dispose();
    super.dispose();
  }

  Future<void> _submitVisit() async {
    final plot = _activePlot;
    if (plot == null) return;
    setState(() {
      _saving = true;
      _error = null;
    });
    try {
      final api = await ref.read(apiClientProvider.future);
      await api.recordAuditFieldVisit(
        engagementId: plot['engagement_id'] as String,
        plotId: plot['plot_id'] as String,
        treesObserved: int.tryParse(_treesObservedController.text.trim()),
        treesAlive: int.tryParse(_treesAliveController.text.trim()),
        verificationOutcome: _outcome,
        notes: _notesController.text.trim(),
      );
      ref.invalidate(auditFieldPlotQueueProvider);
      ref.invalidate(fieldOpsSummaryProvider);
      if (!mounted) return;
      setState(() {
        _activePlot = null;
        _treesObservedController.clear();
        _treesAliveController.clear();
        _notesController.clear();
        _outcome = 'inconclusive';
        _saving = false;
      });
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Audit plot visit saved')),
      );
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _saving = false;
        _error = apiErrorMessage(e);
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final queueAsync = ref.watch(auditFieldPlotQueueProvider);

    return stackRouteScaffold(
      location: '/audit-plots',
      appBar: AppBar(
        title: const Text('Estate Watch audit plots'),
        backgroundColor: AranyixColors.surface,
        foregroundColor: AranyixColors.forestDark,
      ),
      body: queueAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(child: Text(apiErrorMessage(e))),
        data: (queue) {
          final items = List<Map<String, dynamic>>.from(
            (queue['items'] as List?)?.map((e) => Map<String, dynamic>.from(e as Map)) ?? [],
          );

          return RefreshIndicator(
            color: AranyixColors.forest,
            onRefresh: () async => ref.invalidate(auditFieldPlotQueueProvider),
            child: ListView(
              padding: const EdgeInsets.all(16),
              children: [
                Text(
                  '${queue['total_due'] ?? items.length} plot(s) waiting for verifier visits',
                  style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                        color: AranyixColors.onSurfaceMuted,
                      ),
                ),
                const SizedBox(height: 12),
                if (items.isEmpty)
                  Text(
                    'All assigned audit plots are visited for the current scope.',
                    style: const TextStyle(color: AranyixColors.onSurfaceMuted),
                  )
                else
                  for (final plot in items)
                    Card(
                      margin: const EdgeInsets.only(bottom: 10),
                      child: ListTile(
                        title: Text(plot['plot_code'] as String? ?? 'Plot'),
                        subtitle: Text(
                          '${plot['project_name'] ?? ''} · ${plot['risk_level'] ?? ''} risk',
                        ),
                        trailing: FilledButton(
                          onPressed: () => setState(() => _activePlot = plot),
                          child: Text(l10n.resolve),
                        ),
                      ),
                    ),
                if (_activePlot != null) ...[
                  const SizedBox(height: 16),
                  Text(
                    'Visit ${_activePlot!['plot_code']}',
                    style: Theme.of(context).textTheme.titleMedium,
                  ),
                  const SizedBox(height: 8),
                  TextField(
                    controller: _treesObservedController,
                    keyboardType: TextInputType.number,
                    decoration: const InputDecoration(labelText: 'Trees observed'),
                  ),
                  const SizedBox(height: 8),
                  TextField(
                    controller: _treesAliveController,
                    keyboardType: TextInputType.number,
                    decoration: const InputDecoration(labelText: 'Trees alive'),
                  ),
                  const SizedBox(height: 8),
                  DropdownButtonFormField<String>(
                    value: _outcome,
                    decoration: const InputDecoration(labelText: 'Outcome'),
                    items: const [
                      DropdownMenuItem(value: 'inconclusive', child: Text('Inconclusive')),
                      DropdownMenuItem(value: 'claim_supported', child: Text('Supported')),
                      DropdownMenuItem(value: 'claim_unsupported', child: Text('Unsupported')),
                    ],
                    onChanged: (v) => setState(() => _outcome = v ?? 'inconclusive'),
                  ),
                  const SizedBox(height: 8),
                  TextField(
                    controller: _notesController,
                    maxLines: 3,
                    decoration: const InputDecoration(labelText: 'Field notes'),
                  ),
                  if (_error != null) ...[
                    const SizedBox(height: 8),
                    Text(_error!, style: const TextStyle(color: Colors.red)),
                  ],
                  const SizedBox(height: 12),
                  Row(
                    children: [
                      FilledButton(
                        onPressed: _saving ? null : _submitVisit,
                        child: Text(_saving ? 'Saving…' : 'Save visit'),
                      ),
                      const SizedBox(width: 8),
                      TextButton(
                        onPressed: () => setState(() => _activePlot = null),
                        child: Text(l10n.cancel),
                      ),
                    ],
                  ),
                ],
              ],
            ),
          );
        },
      ),
    );
  }
}
