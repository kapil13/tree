import 'package:byot_mobile/l10n/app_localizations.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:share_plus/share_plus.dart';

import '../api/api_errors.dart';
import '../nav_access.dart';
import '../plantation_reports.dart';
import '../providers.dart';
import '../session.dart';
import '../theme.dart';
import '../widgets/shell_scaffold.dart';
import '../widgets/stack_route_scaffold.dart';

const _reportKindKeys = ['tree', 'plantation', 'carbon', 'esg', 'biodiversity'];

String _reportKindLabel(AppLocalizations l10n, String key) => switch (key) {
      'tree' => l10n.reportTypeTree,
      'plantation' => l10n.reportTypePlantation,
      'carbon' => l10n.reportTypeCarbon,
      'biodiversity' => l10n.reportTypeBiodiversity,
      _ => key.toUpperCase(),
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
  String? _downloadingId;
  String _kind = 'carbon';
  String _format = 'pdf';
  String _misReportId = mobilePlantationMisReports.first.id;
  String _misFormat = 'pdf';
  String? _downloadingMisId;

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

  bool _isReady(Map raw) {
    final status = (raw['status'] as String? ?? '').toLowerCase();
    return status == 'ready' || raw['download_ready'] == true || raw['s3_key'] != null;
  }

  Future<void> _downloadMis() async {
    final report = plantationMisReportById(_misReportId);
    if (report == null) return;
    setState(() => _downloadingMisId = report.id);
    try {
      final api = await ref.read(apiClientProvider.future);
      final path = await api.downloadPlantationMisReport(
        path: report.path,
        reportId: report.id,
        format: _misFormat,
      );
      await Share.shareXFiles([XFile(path)], text: report.label);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('${report.label} ready to share')),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(apiErrorMessage(e))),
        );
      }
    } finally {
      if (mounted) setState(() => _downloadingMisId = null);
    }
  }

  Future<void> _download(Map<String, dynamic> raw) async {
    final l10n = AppLocalizations.of(context)!;
    final id = raw['id'] as String?;
    if (id == null) return;
    setState(() => _downloadingId = id);
    try {
      final api = await ref.read(apiClientProvider.future);
      final path = await api.downloadReportFile(
        reportId: id,
        kind: raw['kind'] as String? ?? 'report',
        format: raw['format'] as String? ?? 'pdf',
      );
      await Share.shareXFiles([XFile(path)], text: l10n.navReports);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Report ready to share')),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(apiErrorMessage(e))),
        );
      }
    } finally {
      if (mounted) setState(() => _downloadingId = null);
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
                          decoration: InputDecoration(labelText: l10n.typeLabel),
                          items: [
                            for (final key in _reportKindKeys)
                              DropdownMenuItem(value: key, child: Text(_reportKindLabel(l10n, key))),
                          ],
                          onChanged: (v) => setState(() => _kind = v ?? _kind),
                        ),
                        const SizedBox(height: 12),
                        DropdownButtonFormField<String>(
                          value: _format,
                          decoration: InputDecoration(labelText: l10n.formatLabel),
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
                            trailing: _isReady(raw)
                                ? (_downloadingId == raw['id']
                                    ? const SizedBox(
                                        width: 24,
                                        height: 24,
                                        child: CircularProgressIndicator(strokeWidth: 2),
                                      )
                                    : IconButton(
                                        icon: const Icon(Icons.download_outlined),
                                        tooltip: 'Download',
                                        onPressed: () => _download(Map<String, dynamic>.from(raw)),
                                      ))
                                : null,
                            onTap: _isReady(raw) ? () => _download(Map<String, dynamic>.from(raw)) : null,
                          ),
                      if (canGenerate) ...[
                        const SizedBox(height: 24),
                        Text('Plantation MIS reports', style: Theme.of(context).textTheme.titleMedium),
                        const SizedBox(height: 4),
                        Text(
                          'Operational exports used by government plantation programmes',
                          style: Theme.of(context).textTheme.bodySmall?.copyWith(
                                color: AranyixColors.onSurfaceMuted,
                              ),
                        ),
                        const SizedBox(height: 8),
                        DropdownButtonFormField<String>(
                          value: _misReportId,
                          decoration: const InputDecoration(labelText: 'Report type'),
                          items: [
                            for (final report in mobilePlantationMisReports)
                              DropdownMenuItem(
                                value: report.id,
                                child: Text(report.label),
                              ),
                          ],
                          onChanged: (v) => setState(() => _misReportId = v ?? _misReportId),
                        ),
                        if (plantationMisReportById(_misReportId)?.description != null) ...[
                          const SizedBox(height: 8),
                          Text(
                            plantationMisReportById(_misReportId)!.description,
                            style: const TextStyle(color: AranyixColors.onSurfaceMuted, fontSize: 13),
                          ),
                        ],
                        const SizedBox(height: 12),
                        DropdownButtonFormField<String>(
                          value: _misFormat,
                          decoration: InputDecoration(labelText: l10n.formatLabel),
                          items: const [
                            DropdownMenuItem(value: 'pdf', child: Text('PDF')),
                            DropdownMenuItem(value: 'xlsx', child: Text('XLSX')),
                          ],
                          onChanged: (v) => setState(() => _misFormat = v ?? _misFormat),
                        ),
                        const SizedBox(height: 12),
                        FilledButton.icon(
                          onPressed: _downloadingMisId != null ? null : _downloadMis,
                          icon: _downloadingMisId != null
                              ? const SizedBox(
                                  width: 18,
                                  height: 18,
                                  child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                                )
                              : const Icon(Icons.download_outlined),
                          label: Text(_downloadingMisId != null ? 'Downloading…' : 'Download MIS report'),
                        ),
                      ],
                    ],
                  ),
                ),
    );
  }
}
