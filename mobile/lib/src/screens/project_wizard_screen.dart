import 'package:byot_mobile/l10n/app_localizations.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../api/api_errors.dart';
import '../project/segment_labels.dart';
import '../providers.dart';
import '../widgets/create_project_sheet.dart';
import '../widgets/prototype/prototype_ui.dart';
import '../widgets/stack_route_scaffold.dart';

/// 4-step scheme wizard — Phase F parity with web `/projects/new`.
class ProjectWizardScreen extends ConsumerStatefulWidget {
  const ProjectWizardScreen({super.key});

  @override
  ConsumerState<ProjectWizardScreen> createState() => _ProjectWizardScreenState();
}

class _ProjectWizardScreenState extends ConsumerState<ProjectWizardScreen> {
  int _step = 0;
  bool _busy = false;
  String? _error;

  List<dynamic> _schemes = [];
  Map<String, dynamic>? _selectedScheme;
  String _segment = 'general';
  final _nameController = TextEditingController();
  final _descriptionController = TextEditingController();
  final Map<String, TextEditingController> _refControllers = {};
  String? _createdProjectId;

  @override
  void initState() {
    super.initState();
    _loadSchemes();
  }

  @override
  void dispose() {
    _nameController.dispose();
    _descriptionController.dispose();
    for (final c in _refControllers.values) {
      c.dispose();
    }
    super.dispose();
  }

  Future<void> _loadSchemes() async {
    try {
      final api = await ref.read(apiClientProvider.future);
      final schemes = await api.listCentralSchemes();
      if (mounted) setState(() => _schemes = schemes);
    } catch (_) {}
  }

  bool get _hasSchemeRefsStep => _selectedScheme != null;

  int get _maxStep => _hasSchemeRefsStep ? 3 : 2;

  List<Map<String, dynamic>> _schemeRefFields() {
    if (_selectedScheme == null) return [];
    final sections = (_selectedScheme!['metadata_sections'] as List?) ?? [];
    if (sections.isEmpty) return [];
    final fields = (sections.first as Map)['fields'] as List? ?? [];
    return fields.map((f) => Map<String, dynamic>.from(f as Map)).toList();
  }

  void _initRefControllers() {
    for (final field in _schemeRefFields()) {
      final key = field['key'] as String? ?? '';
      if (key.isEmpty || _refControllers.containsKey(key)) continue;
      _refControllers[key] = TextEditingController();
    }
  }

  Future<void> _submitStep() async {
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      final api = await ref.read(apiClientProvider.future);
      if (_step == 0) {
        setState(() {
          _busy = false;
          _step = 1;
        });
        return;
      }
      if (_step == 1) {
        final name = _nameController.text.trim();
        if (name.isEmpty) {
          setState(() {
            _busy = false;
            _error = 'Project name is required';
          });
          return;
        }
        final project = await api.createPlantingProject(
          code: projectCodeFromName(name),
          name: name,
          description: _descriptionController.text.trim(),
          segment: _segment,
          schemeCode: _selectedScheme?['code'] as String?,
          standardTemplateCode: _selectedScheme?['default_template_code'] as String?,
          complianceMode: _selectedScheme?['compliance_mode'] as String? ?? 'guided',
        );
        _createdProjectId = project['id'] as String?;
        ref.invalidate(plantingProjectsProvider);
        if (_hasSchemeRefsStep) {
          _initRefControllers();
          setState(() {
            _busy = false;
            _step = 2;
          });
        } else {
          setState(() {
            _busy = false;
            _step = _maxStep;
          });
        }
        return;
      }
      if (_step == 2 && _createdProjectId != null) {
        final refs = <String, dynamic>{};
        for (final entry in _refControllers.entries) {
          final v = entry.value.text.trim();
          if (v.isNotEmpty) refs[entry.key] = v;
        }
        if (refs.isNotEmpty) {
          await api.patchSchemeMetadata(_createdProjectId!, refs);
        }
        setState(() {
          _busy = false;
          _step = 3;
        });
        return;
      }
      if (_step == 3 && _createdProjectId != null) {
        if (mounted) context.go('/map?draw=polygon&project=$_createdProjectId');
        return;
      }
    } catch (e) {
      setState(() {
        _busy = false;
        _error = apiErrorMessage(e);
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final steps = <String>[
      'Choose scheme',
      'Project details',
      if (_hasSchemeRefsStep) 'Scheme references',
      'Work areas',
    ];

    return stackRouteScaffold(
      location: '/projects/new',
      appBar: PrototypeBackBar(title: 'New project'),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          PrototypeWizardSteps(
            current: _step,
            labels: steps,
          ),
          const SizedBox(height: 16),
          if (_step == 0) _schemeStep(),
          if (_step == 1) _detailsStep(),
          if (_step == 2 && _hasSchemeRefsStep) _refsStep(),
          if (_step == _maxStep) _workAreaStep(),
          if (_error != null) ...[
            const SizedBox(height: 12),
            Text(_error!, style: TextStyle(color: Theme.of(context).colorScheme.error)),
          ],
          const SizedBox(height: 20),
          FilledButton(
            onPressed: _busy ? null : _submitStep,
            style: FilledButton.styleFrom(backgroundColor: PrototypeColors.brandForest),
            child: _busy
                ? const SizedBox(
                    width: 18,
                    height: 18,
                    child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                  )
                : Text(_step == _maxStep ? 'Draw on map' : 'Continue'),
          ),
          if (_step > 0)
            TextButton(
              onPressed: _busy ? null : () => setState(() => _step -= 1),
              child: const Text('Back'),
            ),
        ],
      ),
    );
  }

  Widget _schemeStep() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        const Text('Select a government scheme or continue without one.'),
        const SizedBox(height: 12),
        PrototypeChoiceCard(
          selected: _selectedScheme == null,
          title: 'General plantation',
          subtitle: 'No central scheme template',
          onTap: () => setState(() => _selectedScheme = null),
        ),
        for (final raw in _schemes) ...[
          const SizedBox(height: 8),
          PrototypeChoiceCard(
            selected: _selectedScheme?['code'] == raw['code'],
            title: raw['label'] as String? ?? raw['code'] as String? ?? 'Scheme',
            subtitle: raw['ministry'] as String? ?? raw['code'] as String? ?? '',
            onTap: () => setState(() => _selectedScheme = Map<String, dynamic>.from(raw as Map)),
          ),
        ],
      ],
    );
  }

  Widget _detailsStep() {
    final l10n = AppLocalizations.of(context)!;
    return Column(
      children: [
        TextField(
          controller: _nameController,
          decoration: const InputDecoration(labelText: 'Project name'),
          textCapitalization: TextCapitalization.sentences,
        ),
        const SizedBox(height: 12),
        TextField(
          controller: _descriptionController,
          decoration: const InputDecoration(labelText: 'Description'),
          maxLines: 2,
        ),
        const SizedBox(height: 12),
        DropdownButtonFormField<String>(
          value: _segment,
          decoration: const InputDecoration(labelText: 'Segment'),
          items: plantingSegmentKeys
              .map((k) => DropdownMenuItem(value: k, child: Text(segmentLabel(l10n, k))))
              .toList(),
          onChanged: (v) => setState(() => _segment = v ?? 'general'),
        ),
      ],
    );
  }

  Widget _refsStep() {
    final fields = _schemeRefFields();
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Text('${_selectedScheme?['label'] ?? 'Scheme'} — reference fields'),
        const SizedBox(height: 12),
        for (final field in fields) ...[
          TextField(
            controller: _refControllers.putIfAbsent(
              field['key'] as String? ?? '',
              () => TextEditingController(),
            ),
            decoration: InputDecoration(
              labelText: field['label'] as String? ?? field['key'] as String? ?? 'Field',
            ),
          ),
          const SizedBox(height: 8),
        ],
      ],
    );
  }

  Widget _workAreaStep() {
    return PrototypeInfoCard(
      title: 'Draw work areas',
      body: 'Open the map to draw at least one polygon or corridor for this project. '
          'You can return to project setup anytime from the project detail screen.',
    );
  }
}

/// Simple step indicator used by the project wizard.
class PrototypeWizardSteps extends StatelessWidget {
  const PrototypeWizardSteps({super.key, required this.current, required this.labels});

  final int current;
  final List<String> labels;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        for (var i = 0; i < labels.length; i++) ...[
          Expanded(
            child: Column(
              children: [
                CircleAvatar(
                  radius: 14,
                  backgroundColor: i <= current
                      ? PrototypeColors.brandForest
                      : PrototypeColors.border,
                  child: Text(
                    '${i + 1}',
                    style: TextStyle(
                      color: i <= current ? Colors.white : PrototypeColors.textSecondary,
                      fontSize: 12,
                    ),
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  labels[i],
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    fontSize: 10,
                    color: i == current ? PrototypeColors.brandForest : PrototypeColors.textSecondary,
                  ),
                ),
              ],
            ),
          ),
          if (i < labels.length - 1)
            Container(width: 8, height: 2, color: PrototypeColors.border),
        ],
      ],
    );
  }
}

class PrototypeChoiceCard extends StatelessWidget {
  const PrototypeChoiceCard({
    super.key,
    required this.selected,
    required this.title,
    required this.subtitle,
    required this.onTap,
  });

  final bool selected;
  final String title;
  final String subtitle;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: selected ? PrototypeColors.brandForest.withValues(alpha: 0.08) : PrototypeColors.bgSurface,
      borderRadius: BorderRadius.circular(PrototypeRadii.md),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(PrototypeRadii.md),
        child: Container(
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(PrototypeRadii.md),
            border: Border.all(
              color: selected ? PrototypeColors.brandForest : PrototypeColors.border,
            ),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(title, style: const TextStyle(fontWeight: FontWeight.w600)),
              if (subtitle.isNotEmpty)
                Text(subtitle, style: const TextStyle(fontSize: 12, color: PrototypeColors.textSecondary)),
            ],
          ),
        ),
      ),
    );
  }
}

class PrototypeInfoCard extends StatelessWidget {
  const PrototypeInfoCard({super.key, required this.title, required this.body});

  final String title;
  final String body;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(title, style: Theme.of(context).textTheme.titleMedium),
            const SizedBox(height: 8),
            Text(body),
          ],
        ),
      ),
    );
  }
}
