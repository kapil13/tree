import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../api/api_errors.dart';
import '../project_setup_readiness.dart';
import '../providers.dart';
import '../widgets/prototype/prototype_ui.dart';
import '../widgets/stack_route_scaffold.dart';

/// In-app project setup — Phase F replaces "complete on web" blocker.
class ProjectSetupScreen extends ConsumerStatefulWidget {
  const ProjectSetupScreen({super.key, required this.projectId, this.initialStep = 1});

  final String projectId;
  final int initialStep;

  @override
  ConsumerState<ProjectSetupScreen> createState() => _ProjectSetupScreenState();
}

class _ProjectSetupScreenState extends ConsumerState<ProjectSetupScreen> {
  late int _step;
  bool _busy = false;
  String? _error;
  final Map<String, TextEditingController> _refControllers = {};
  final Map<String, TextEditingController> _defaultControllers = {};

  @override
  void initState() {
    super.initState();
    _step = widget.initialStep.clamp(1, 4);
  }

  @override
  void dispose() {
    for (final c in _refControllers.values) {
      c.dispose();
    }
    for (final c in _defaultControllers.values) {
      c.dispose();
    }
    super.dispose();
  }

  void _bindControllers(Map<String, dynamic> project, Map<String, dynamic>? scheme) {
    final refs = Map<String, dynamic>.from(
      (project['metadata'] as Map?)?['scheme_refs'] as Map? ?? {},
    );
    final defaults = Map<String, dynamic>.from(
      (project['metadata'] as Map?)?['tree_registration_defaults'] as Map? ?? {},
    );
    if (scheme != null) {
      final sections = (scheme['metadata_sections'] as List?) ?? [];
      if (sections.isNotEmpty) {
        final fields = (sections.first as Map)['fields'] as List? ?? [];
        for (final field in fields) {
          final map = Map<String, dynamic>.from(field as Map);
          final key = map['key'] as String? ?? '';
          if (key.isEmpty) continue;
          _refControllers.putIfAbsent(key, () => TextEditingController(text: refs[key]?.toString() ?? ''));
        }
      }
    }
    for (final key in ['permit_reference', 'site_zone', 'implementing_agency', 'maintenance_responsible']) {
      _defaultControllers.putIfAbsent(
        key,
        () => TextEditingController(text: defaults[key]?.toString() ?? ''),
      );
    }
  }

  Future<void> _save(Map<String, dynamic> project) async {
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      final api = await ref.read(apiClientProvider.future);
      if (_step == 3) {
        final refs = <String, dynamic>{};
        for (final e in _refControllers.entries) {
          final v = e.value.text.trim();
          if (v.isNotEmpty) refs[e.key] = v;
        }
        await api.patchSchemeMetadata(widget.projectId, refs);
      } else if (_step == 2) {
        final defaults = <String, dynamic>{};
        for (final e in _defaultControllers.entries) {
          final v = e.value.text.trim();
          if (v.isNotEmpty) defaults[e.key] = v;
        }
        final metadata = Map<String, dynamic>.from(project['metadata'] as Map? ?? {});
        metadata['tree_registration_defaults'] = defaults;
        await api.updatePlantingProject(widget.projectId, {'metadata': metadata});
      }
      ref.invalidate(plantingProjectProvider(widget.projectId));
      ref.invalidate(workAreasProvider(widget.projectId));
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Setup saved')));
      }
    } catch (e) {
      setState(() => _error = apiErrorMessage(e));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final projectAsync = ref.watch(plantingProjectProvider(widget.projectId));
    final schemeAsync = ref.watch(projectSchemeProvider(widget.projectId));
    final workAreasAsync = ref.watch(workAreasProvider(widget.projectId));

    return stackRouteScaffold(
      location: '/projects/${widget.projectId}/setup',
      appBar: PrototypeBackBar(title: 'Project setup'),
      body: projectAsync.when(
        loading: () => const Center(child: CircularProgressIndicator(color: PrototypeColors.brandCanopy)),
        error: (e, _) => Center(child: Text(apiErrorMessage(e))),
        data: (project) {
          final scheme = schemeAsync.maybeWhen(data: (s) => s, orElse: () => null);
          final workAreas = workAreasAsync.maybeWhen(data: (w) => w, orElse: () => <dynamic>[]);
          if (_refControllers.isEmpty && _defaultControllers.isEmpty) {
            _bindControllers(project, scheme);
          }
          final status = evaluateProjectSetup(project, workAreas, scheme: scheme);
          return ListView(
            padding: const EdgeInsets.all(16),
            children: [
              _checklist(status),
              const SizedBox(height: 16),
              _stepPicker(project, scheme),
              const SizedBox(height: 16),
              if (_step == 2) _defaultsForm(),
              if (_step == 3) _refsForm(scheme),
              if (_step == 4) _workAreaPrompt(workAreas),
              if (_error != null)
                Text(_error!, style: TextStyle(color: Theme.of(context).colorScheme.error)),
              const SizedBox(height: 16),
              if (_step < 4)
                FilledButton(
                  onPressed: _busy ? null : () => _save(project),
                  style: FilledButton.styleFrom(backgroundColor: PrototypeColors.brandForest),
                  child: _busy
                      ? const SizedBox(
                          width: 18,
                          height: 18,
                          child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                        )
                      : const Text('Save step'),
                ),
              if (_step == 4)
                FilledButton(
                  onPressed: () => context.push('/map?draw=polygon&project=${widget.projectId}'),
                  style: FilledButton.styleFrom(backgroundColor: PrototypeColors.brandForest),
                  child: const Text('Open map to draw'),
                ),
            ],
          );
        },
      ),
    );
  }

  Widget _checklist(ProjectSetupStatus status) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              status.canRegisterTree ? 'Ready for tree registration' : 'Setup incomplete',
              style: const TextStyle(fontWeight: FontWeight.w600),
            ),
            const SizedBox(height: 8),
            for (final step in status.steps)
              ListTile(
                dense: true,
                leading: Icon(
                  step.complete ? Icons.check_circle : Icons.radio_button_unchecked,
                  color: step.complete ? PrototypeColors.brandCanopy : PrototypeColors.textTertiary,
                  size: 20,
                ),
                title: Text(step.label, style: const TextStyle(fontSize: 14)),
                subtitle: step.description != null ? Text(step.description!, style: const TextStyle(fontSize: 12)) : null,
              ),
          ],
        ),
      ),
    );
  }

  Widget _stepPicker(Map<String, dynamic> project, Map<String, dynamic>? scheme) {
    final hasScheme = project['scheme_code'] != null;
    return Wrap(
      spacing: 8,
      children: [
        if (hasScheme)
          ChoiceChip(
            label: const Text('Scheme refs'),
            selected: _step == 3,
            onSelected: (_) => setState(() => _step = 3),
          ),
        ChoiceChip(
          label: const Text('Tree defaults'),
          selected: _step == 2,
          onSelected: (_) => setState(() => _step = 2),
        ),
        ChoiceChip(
          label: const Text('Work areas'),
          selected: _step == 4,
          onSelected: (_) => setState(() => _step = 4),
        ),
      ],
    );
  }

  Widget _defaultsForm() {
    return Column(
      children: [
        for (final entry in _defaultControllers.entries)
          Padding(
            padding: const EdgeInsets.only(bottom: 8),
            child: TextField(
              controller: entry.value,
              decoration: InputDecoration(labelText: entry.key.replaceAll('_', ' ')),
            ),
          ),
      ],
    );
  }

  Widget _refsForm(Map<String, dynamic>? scheme) {
    if (scheme == null) return const Text('No scheme attached to this project.');
    final sections = (scheme['metadata_sections'] as List?) ?? [];
    if (sections.isEmpty) return const Text('This scheme has no reference fields.');
    final fields = (sections.first as Map)['fields'] as List? ?? [];
    return Column(
      children: [
        for (final field in fields)
          Padding(
            padding: const EdgeInsets.only(bottom: 8),
            child: TextField(
              controller: _refControllers[(field as Map)['key'] as String? ?? ''],
              decoration: InputDecoration(
                labelText: field['label'] as String? ?? field['key'] as String?,
              ),
            ),
          ),
      ],
    );
  }

  Widget _workAreaPrompt(List<dynamic> workAreas) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Text(
          workAreas.isEmpty
              ? 'No work areas yet. Draw at least one polygon on the map.'
              : '${workAreas.length} work area(s) defined. Open the map to add or edit.',
        ),
      ),
    );
  }
}
