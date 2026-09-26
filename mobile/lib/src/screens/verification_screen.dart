import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../api/api_errors.dart';
import '../providers.dart';
import '../widgets/prototype/prototype_ui.dart';
import '../widgets/stack_route_scaffold.dart';

/// Supervisor verification queue — Phase F parity with web `/verification`.
class VerificationScreen extends ConsumerStatefulWidget {
  const VerificationScreen({super.key});

  @override
  ConsumerState<VerificationScreen> createState() => _VerificationScreenState();
}

class _VerificationScreenState extends ConsumerState<VerificationScreen> {
  List<dynamic> _samples = [];
  Map<String, dynamic>? _selected;
  bool _loading = true;
  String? _error;
  bool _busy = false;

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
      final samples = await api.listVerificationSamples();
      if (!mounted) return;
      setState(() {
        _samples = samples;
        _loading = false;
        if (_selected == null && samples.isNotEmpty) {
          _selected = Map<String, dynamic>.from(samples.first as Map);
        }
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _error = apiErrorMessage(e);
        _loading = false;
      });
    }
  }

  Future<void> _attest(String sampleId, String itemId, String decision) async {
    setState(() => _busy = true);
    try {
      final api = await ref.read(apiClientProvider.future);
      await api.attestVerificationItem(sampleId, itemId, decision: decision);
      final detail = await api.getVerificationSample(sampleId);
      setState(() => _selected = detail);
      await _load();
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
    return stackRouteScaffold(
      location: '/verification',
      appBar: PrototypeBackBar(title: 'Verification queue'),
      body: _loading
          ? const Center(child: CircularProgressIndicator(color: PrototypeColors.brandCanopy))
          : _error != null
              ? Center(child: Text(_error!))
              : Row(
                  children: [
                    SizedBox(
                      width: 160,
                      child: ListView(
                        children: [
                          for (final raw in _samples)
                            ListTile(
                              selected: _selected?['id'] == (raw as Map)['id'],
                              title: Text(
                                (raw as Map)['project_name'] as String? ?? 'Sample',
                                style: const TextStyle(fontSize: 13),
                              ),
                              subtitle: Text('${(raw as Map)['item_count'] ?? 0} trees'),
                              onTap: () async {
                                final id = (raw as Map)['id'] as String;
                                final api = await ref.read(apiClientProvider.future);
                                final detail = await api.getVerificationSample(id);
                                setState(() => _selected = detail);
                              },
                            ),
                        ],
                      ),
                    ),
                    const VerticalDivider(width: 1),
                    Expanded(child: _detail()),
                  ],
                ),
    );
  }

  Widget _detail() {
    final sample = _selected;
    if (sample == null) {
      return const Center(child: Text('Select a verification sample'));
    }
    final items = List<dynamic>.from(sample['items'] ?? []);
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        Text('Sample ${sample['id']}', style: const TextStyle(fontWeight: FontWeight.w600)),
        Text('Status: ${sample['status']} · ${sample['sample_pct']}% sample'),
        const SizedBox(height: 12),
        for (final item in items)
          Card(
            child: ListTile(
              title: Text((item as Map)['tree_code'] as String? ?? 'Tree'),
              subtitle: Text((item as Map)['status'] as String? ?? 'pending'),
              trailing: _busy
                  ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2))
                  : PopupMenuButton<String>(
                      onSelected: (d) => _attest(sample['id'] as String, (item as Map)['id'] as String, d),
                      itemBuilder: (_) => const [
                        PopupMenuItem(value: 'approved', child: Text('Approve')),
                        PopupMenuItem(value: 'rejected', child: Text('Reject')),
                      ],
                    ),
            ),
          ),
      ],
    );
  }
}
