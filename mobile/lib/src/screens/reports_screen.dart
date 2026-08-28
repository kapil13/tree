import 'package:byot_mobile/l10n/app_localizations.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../api/api_errors.dart';
import '../nav_access.dart';
import '../providers.dart';
import '../session.dart';
import '../theme.dart';
import '../widgets/shell_scaffold.dart';
import '../widgets/stack_route_scaffold.dart';

const _reportKinds = {
  'tree': 'Tree portfolio',
  'plantation': 'Plantation',
  'carbon': 'Carbon',
  'esg': 'ESG',
  'biodiversity': 'Biodiversity',
};

const _formats = ['pdf', 'xlsx'];

class ReportsScreen extends ConsumerStatefulWidget {
  const ReportsScreen({super.key});

  @override
  ConsumerState<ReportsScreen> createState() => _ReportsScreenState();
}

class _ReportsScreenState extends ConsumerState<ReportsScreen> {
  List<dynamic> _reports = [];
  bool _loading = true;
  String? _error;
  bool _creating = false;
  String _kind = 'carbon';
  String _format = 'pdf';

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final api = await ref.read(apiClientProvider.future);
      final items = await api.listReports();
      if (mounted) {
        setState(() {
          _reports = items;
          _loading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _error = apiErrorMessage(e);
          _loading = false;
        });
      }
    }
  }

  Future<void> _create() async {
    final l10n = AppLocalizations.of(context)!;
    final needsFence = _kind == 'biodiversity' || _kind == 'plantation';
    String? fenceId;
    if (needsFence) {
      try {
        final api = await ref.read(apiClientProvider.future);
        final fences = await api.listPlantationFences();
        if (fences.isEmpty) {
          if (mounted) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(content: Text(l10n.reportNeedsArea)),
            );
          }
          return;
        }
        fenceId = (fences.first as Map)['id'] as String?;
      } catch (e) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(apiErrorMessage(e))));
        }
        return;
      }
    }

    setState(() => _creating = true);
    try {
      final api = await ref.read(apiClientProvider.future);
      await api.createReport(reportType: _kind, format: _format, plantationFenceId: fenceId);
      await _load();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(l10n.reportCreated)));
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(apiErrorMessage(e))));
      }
    } finally {
      if (mounted) setState(() => _creating = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final canGenerate = canGenerateReports(sessionController.user);

    return stackRouteScaffold(
      location: '/reports',
      appBar: ShellTopBar(title: AppLocalizations.of(context)!.navReports),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
              ? Center(
                  child: Padding(
                    padding: const EdgeInsets.all(24),
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text(_error!, textAlign: TextAlign.center),
                        const SizedBox(height: 12),
                        FilledButton(onPressed: _load, child: Text(l10n.retry)),
                      ],
                    ),
                  ),
                )
              : RefreshIndicator(
                  color: AranyixColors.forest,
                  onRefresh: _load,
                  child: ListView(
                    padding: const EdgeInsets.all(16),
                    children: [
                      if (canGenerate) ...[
                        Text(l10n.createReport, style: Theme.of(context).textTheme.titleMedium),
                        const SizedBox(height: 8),
                        DropdownButtonFormField<String>(
                          value: _kind,
                          decoration: const InputDecoration(labelText: 'Type'),
                          items: [
                            for (final e in _reportKinds.entries)
                              DropdownMenuItem(value: e.key, child: Text(e.value)),
                          ],
                          onChanged: (v) => setState(() => _kind = v ?? _kind),
                        ),
                        const SizedBox(height: 12),
                        DropdownButtonFormField<String>(
                          value: _format,
                          decoration: const InputDecoration(labelText: 'Format'),
                          items: [
                            for (final f in _formats) DropdownMenuItem(value: f, child: Text(f.toUpperCase())),
                          ],
                          onChanged: (v) => setState(() => _format = v ?? _format),
                        ),
                        const SizedBox(height: 12),
                        FilledButton(
                          onPressed: _creating ? null : _create,
                          child: Text(_creating ? l10n.saving : l10n.createReport),
                        ),
                        const SizedBox(height: 24),
                      ],
                      Text(l10n.yourReports, style: Theme.of(context).textTheme.titleMedium),
                      const SizedBox(height: 8),
                      if (_reports.isEmpty)
                        Text(l10n.noReportsYet, style: const TextStyle(color: AranyixColors.onSurfaceMuted))
                      else
                        for (final raw in _reports)
                          ListTile(
                            contentPadding: EdgeInsets.zero,
                            leading: const Icon(Icons.description_outlined, color: AranyixColors.forest),
                            title: Text('${(raw as Map)['kind']} · ${raw['format']}'),
                            subtitle: Text('${raw['status']} · ${raw['created_at'] ?? ''}'),
                          ),
                    ],
                  ),
                ),
    );
  }
}
