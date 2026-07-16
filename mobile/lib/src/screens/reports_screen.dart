import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../api/api_errors.dart';
import '../providers.dart';
import '../theme.dart';

class ReportsScreen extends ConsumerStatefulWidget {
  const ReportsScreen({super.key});

  @override
  ConsumerState<ReportsScreen> createState() => _ReportsScreenState();
}

class _ReportsScreenState extends ConsumerState<ReportsScreen> {
  String? _busyKind;

  static const _reports = [
    (kind: 'carbon', format: 'pdf', title: 'Carbon Report', subtitle: 'Sequestration & credit summary'),
    (kind: 'esg', format: 'pdf', title: 'ESG Report', subtitle: 'Environmental impact for stakeholders'),
    (kind: 'biodiversity', format: 'pdf', title: 'Biodiversity Report', subtitle: 'Species & acoustic health'),
    (kind: 'tree', format: 'xlsx', title: 'Tree Inventory', subtitle: 'Full plantation export'),
  ];

  Future<void> _export(String kind, String format) async {
    setState(() => _busyKind = kind);
    try {
      final api = await ref.read(apiClientProvider.future);
      await api.queueReport(kind: kind, format: format);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('$kind report queued — check your email or web portal.'),
            behavior: SnackBarBehavior.floating,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(apiErrorMessage(e))),
        );
      }
    } finally {
      if (mounted) setState(() => _busyKind = null);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AranyixColors.surface,
      appBar: AppBar(title: const Text('Reports')),
      body: ListView.separated(
        padding: const EdgeInsets.all(20),
        itemCount: _reports.length,
        separatorBuilder: (_, __) => const SizedBox(height: 12),
        itemBuilder: (_, i) {
          final r = _reports[i];
          final busy = _busyKind == r.kind;
          return Card(
            child: ListTile(
              contentPadding: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
              title: Text(r.title, style: Theme.of(context).textTheme.titleMedium),
              subtitle: Text(r.subtitle),
              trailing: busy
                  ? const SizedBox(
                      width: 24,
                      height: 24,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    )
                  : IconButton(
                      onPressed: () => _export(r.kind, r.format),
                      icon: const Icon(Icons.download_outlined, color: AranyixColors.forest),
                    ),
              onTap: busy ? null : () => _export(r.kind, r.format),
            ),
          );
        },
      ),
    );
  }
}
