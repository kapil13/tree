import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../api/api_errors.dart';
import '../compliance_gap_actions.dart';
import '../providers.dart';
import '../widgets/prototype/prototype_ui.dart';
import '../widgets/stack_route_scaffold.dart';

/// Project compliance checklist with gap-action deep links (Phase F).
class ComplianceChecklistScreen extends ConsumerStatefulWidget {
  const ComplianceChecklistScreen({super.key, required this.projectId});

  final String projectId;

  @override
  ConsumerState<ComplianceChecklistScreen> createState() => _ComplianceChecklistScreenState();
}

class _ComplianceChecklistScreenState extends ConsumerState<ComplianceChecklistScreen> {
  Map<String, dynamic>? _checklist;
  bool _loading = true;
  String? _error;

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
      final data = await api.getComplianceChecklist(widget.projectId);
      if (!mounted) return;
      setState(() {
        _checklist = data;
        _loading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _error = apiErrorMessage(e);
        _loading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return stackRouteScaffold(
      location: '/projects/${widget.projectId}/compliance',
      appBar: PrototypeBackBar(title: 'Compliance checklist'),
      body: _loading
          ? const Center(child: CircularProgressIndicator(color: PrototypeColors.brandCanopy))
          : _error != null
              ? Center(child: Text(_error!))
              : RefreshIndicator(
                  onRefresh: _load,
                  child: ListView(
                    padding: const EdgeInsets.all(16),
                    children: _buildItems(),
                  ),
                ),
    );
  }

  List<Widget> _buildItems() {
    final gaps = List<dynamic>.from(_checklist?['gaps'] ?? _checklist?['items'] ?? []);
    if (gaps.isEmpty) {
      return [const Center(child: Text('No open compliance gaps'))];
    }
    return gaps.map((raw) {
      final gap = Map<String, dynamic>.from(raw as Map);
      final action = resolveComplianceGapAction(gap, projectId: widget.projectId);
      final complete = gap['complete'] == true || gap['status'] == 'complete';
      return Card(
        child: ListTile(
          leading: Icon(
            complete ? Icons.check_circle : Icons.warning_amber,
            color: complete ? PrototypeColors.brandCanopy : PrototypeColors.statusDanger,
          ),
          title: Text(gap['label'] as String? ?? gap['key'] as String? ?? 'Gap'),
          subtitle: Text(gap['description'] as String? ?? action?.description ?? ''),
          trailing: action != null && !complete
              ? TextButton(
                  onPressed: () => context.push(action.route),
                  child: Text(action.label),
                )
              : null,
        ),
      );
    }).toList();
  }
}
