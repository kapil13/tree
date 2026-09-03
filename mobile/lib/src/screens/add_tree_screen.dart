import 'package:byot_mobile/l10n/app_localizations.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:image_picker/image_picker.dart';
import 'package:url_launcher/url_launcher.dart';

import '../api/api_errors.dart';
import '../location_helper.dart';
import '../l10n/setup_labels.dart';
import '../offline/tree_registration_queue.dart';
import '../project_setup_readiness.dart';
import '../providers.dart';
import '../widgets/shell_scaffold.dart';
import '../widgets/stack_route_scaffold.dart';

const _roadSides = [
  ('lhs', 'LHS (left)'),
  ('rhs', 'RHS (right)'),
  ('median', 'Median'),
];
const _guardTypes = ['bamboo', 'iron', 'cement'];
const _mineSpecies = [
  'Neem',
  'Peepal',
  'Banyan',
  'Jamun',
  'Arjun',
  'Gulmohar',
  'Teak',
  'Karanj',
  'Mahua',
  'Palash',
];

const _measurementMethods = [
  ('visual_estimate', 'Visual estimate'),
  ('tape', 'Tape measure (DBH at 1.3 m)'),
  ('caliper', 'Caliper'),
  ('clinometer', 'Clinometer (height)'),
  ('photogrammetry', 'Photogrammetry'),
];

class AddTreeScreen extends ConsumerStatefulWidget {
  const AddTreeScreen({super.key, this.projectId, this.workAreaId});

  final String? projectId;
  final String? workAreaId;

  @override
  ConsumerState<AddTreeScreen> createState() => _AddTreeScreenState();
}

class _AddTreeScreenState extends ConsumerState<AddTreeScreen> {
  final _species = TextEditingController(text: 'Neem');
  final _dbh = TextEditingController();
  final _height = TextEditingController();
  final _extraControllers = <String, TextEditingController>{};
  final _localPhotoPaths = <String>[];
  List<dynamic> _programs = [];
  String? _programCode;
  Map<String, dynamic>? _project;
  List<dynamic> _workAreas = [];
  String? _selectedWorkAreaId;
  double? _lat;
  double? _lon;
  double? _acc;
  bool _busy = false;
  bool _loadingPrograms = true;
  String? _err;
  final List<String> _photoKeys = [];
  final _picker = ImagePicker();
  Map<String, dynamic>? _compliance;
  Map<String, dynamic>? _registrationContext;
  String? _roadSide;
  String? _guardType;
  String _pitSize = '60x60x60';
  String _measurementMethod = 'visual_estimate';
  int _sessionSavedCount = 0;
  String? _successMessage;
  int _wizardStep = 0;
  static const _wizardStepCount = 5;

  @override
  void initState() {
    super.initState();
    _selectedWorkAreaId = widget.workAreaId;
    _load();
  }

  Future<void> _load() async {
    try {
      final api = await ref.read(apiClientProvider.future);
      final programs = await api.listEnrolledPlantingPrograms();
      Map<String, dynamic>? project;
      List<dynamic> workAreas = [];
      if (widget.projectId != null) {
        project = await api.getPlantingProject(widget.projectId!);
        workAreas = await api.listWorkAreas(widget.projectId!);
        _programCode = project['program_code'] as String? ?? _programCode;
        try {
          _registrationContext = await api.registrationContext(
            widget.projectId!,
            workAreaId: _selectedWorkAreaId,
          );
        } catch (_) {
          _registrationContext = null;
        }
      }
      if (!mounted) return;
      setState(() {
        _programs = programs;
        _project = project;
        _workAreas = workAreas;
        _programCode ??= programs.isNotEmpty ? programs.first['code'] as String : 'byot';
        _loadingPrograms = false;
      });
      _syncProgramSelection();
      _syncExtraFields();
      _applySegmentDefaults();
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _loadingPrograms = false;
        _err = apiErrorMessage(e);
      });
    }
  }

  String? get _segment {
    final fromProject = _project?['segment'] as String?;
    if (fromProject != null && fromProject.isNotEmpty) return fromProject;
    return _activeProgram?['segment'] as String?;
  }

  bool get _isNhaiContext =>
      _segment == 'nhai_highway' || _effectiveProgramCode == 'government_nhai';

  String? get _effectiveProgramCode {
    if (_programCode != null &&
        _programCode!.trim().isNotEmpty &&
        _programs.any((p) => p['code'] == _programCode)) {
      return _programCode;
    }
    if (_programs.isEmpty) return _programCode;
    return _programs.first['code'] as String?;
  }

  void _syncProgramSelection() {
    final effective = _effectiveProgramCode;
    if (effective != null && effective != _programCode) {
      _programCode = effective;
    }
  }

  String get _complianceMode =>
      _project?['compliance_mode'] as String? ?? 'open';

  List<String> get _allowedSpecies {
    final rules = _project?['active_standard']?['rules'] as Map<String, dynamic>?;
    final list = rules?['allowed_species'];
    if (list is List && list.isNotEmpty) {
      return list.map((e) => e.toString()).toList();
    }
    if (_segment == 'industrial_greenbelt') return _mineSpecies;
    return [];
  }

  bool get _isProjectMode => widget.projectId != null && _project != null;

  bool get _chainageEnabled {
    final inherited = _registrationContext?['inherited_standard'] as Map<String, dynamic>?;
    if (inherited?['chainage_enabled'] == true) return true;
    final rules = _project?['active_standard']?['rules'] as Map<String, dynamic>?;
    return rules?['chainage_enabled'] == true;
  }

  bool get _projectSetupBlocks {
    if (!_isProjectMode) return false;
    return !evaluateProjectSetup(_project!, _workAreas).canRegisterTree;
  }

  ProjectSetupStatus? get _setupStatus {
    if (!_isProjectMode || _project == null) return null;
    return evaluateProjectSetup(_project!, _workAreas);
  }

  Future<void> _openProjectSetupWeb() async {
    final id = widget.projectId;
    if (id == null) return;
    final uri = Uri.parse(projectSetupWebUrl(id));
    await launchUrl(uri, mode: LaunchMode.externalApplication);
  }

  void _applySegmentDefaults() {
    if (!_isProjectMode && _isNhaiContext) {
      _pitSize = '60x60x60';
      _guardType ??= 'bamboo';
      _roadSide ??= 'lhs';
      final meta = _project?['metadata'] as Map<String, dynamic>?;
      if (meta?['pit_size_cm'] != null) _pitSize = meta!['pit_size_cm'].toString();
    }
    if (_isProjectMode && _chainageEnabled) {
      _roadSide ??= 'lhs';
      final suggested = _registrationContext?['suggested_next'] as Map<String, dynamic>?;
      if (suggested?['chainage_label'] != null) {
        // chainage stored in metadata on submit if needed
      }
    }
    if (_segment == 'industrial_greenbelt' && _allowedSpecies.isNotEmpty) {
      _species.text = _allowedSpecies.first;
    }
  }

  Map<String, dynamic>? get _activeProgram {
    final code = _effectiveProgramCode;
    if (code == null) return null;
    return _programs.cast<Map<String, dynamic>?>().firstWhere(
          (p) => p?['code'] == code,
          orElse: () => null,
        );
  }

  List<Map<String, dynamic>> get _extraFields {
    if (_isProjectMode) return [];
    final schema = _activeProgram?['form_schema'] as Map<String, dynamic>?;
    final sections = (schema?['sections'] as List<dynamic>?) ?? [];
    final fields = <Map<String, dynamic>>[];
    for (final section in sections) {
      for (final field in (section['fields'] as List<dynamic>? ?? [])) {
        final map = Map<String, dynamic>.from(field as Map);
        final key = map['key'] as String;
        if (map['core'] == true) continue;
        if (key == 'latitude' || key == 'longitude' || key == 'accuracy_m' || key == 'altitude_m') {
          continue;
        }
        if (_isNhaiContext && (key == 'road_side' || key == 'guard_type' || key == 'pit_size_cm')) {
          continue;
        }
        if (map['type'] == 'boolean' || map['type'] == 'select') continue;
        fields.add(map);
      }
    }
    return fields;
  }

  void _syncExtraFields() {
    final keys = _extraFields.map((f) => f['key'] as String).toSet();
    for (final key in keys) {
      _extraControllers.putIfAbsent(key, TextEditingController.new);
    }
  }

  Map<String, dynamic> _buildMetadata() {
    final metadata = <String, dynamic>{};
    if (widget.projectId != null) metadata['project_id'] = widget.projectId;
    if (_isProjectMode) {
      if (_chainageEnabled && _roadSide != null) metadata['road_side'] = _roadSide;
    } else if (_isNhaiContext) {
      if (_roadSide != null) metadata['road_side'] = _roadSide;
      if (_guardType != null) metadata['guard_type'] = _guardType;
      metadata['pit_size_cm'] = _pitSize;
    }
    if ((_segment == 'township_landscape' ||
            _segment == 'nagar_van_urban' ||
            _segment == 'sahakar_van_coop') &&
        _selectedWorkAreaId != null) {
      final wa = _workAreas.cast<Map<String, dynamic>?>().firstWhere(
            (w) => w?['id'] == _selectedWorkAreaId,
            orElse: () => null,
          );
      if (wa?['segment_code'] != null) metadata['block_code'] = wa!['segment_code'];
    }
    for (final field in _extraFields) {
      final key = field['key'] as String;
      final value = _extraControllers[key]?.text.trim() ?? '';
      if (value.isNotEmpty) metadata[key] = value;
    }
    return metadata;
  }

  Future<void> _runComplianceCheck() async {
    if (widget.projectId == null || _selectedWorkAreaId == null || _lat == null) return;
    try {
      final api = await ref.read(apiClientProvider.future);
      final result = await api.complianceCheck(
        widget.projectId!,
        workAreaId: _selectedWorkAreaId!,
        lat: _lat!,
        lon: _lon!,
        accuracy: _acc,
        speciesText: _species.text.trim(),
        photoCount: _photoKeys.length + _localPhotoPaths.length,
        metadata: _buildMetadata(),
      );
      if (!mounted) return;
      setState(() => _compliance = result);
    } catch (e) {
      if (!mounted) return;
      setState(() => _err = apiErrorMessage(e));
    }
  }

  Future<void> _useGps() async {
    try {
      final gps = await captureLocation(allowFallback: false);
      setState(() {
        _lat = gps.latitude;
        _lon = gps.longitude;
        _acc = gps.accuracyMeters;
        _err = gps.message;
      });
      await _runComplianceCheck();
    } on LocationCaptureException catch (e) {
      if (!mounted) return;
      setState(() => _err = e.message);
    } catch (e) {
      setState(() => _err = apiErrorMessage(e));
    }
  }

  Future<void> _addPhoto() async {
    // P0 anti-fraud: strict compliance projects require live camera capture (no gallery).
    final image = await _picker.pickImage(
      source: ImageSource.camera,
      imageQuality: 85,
    );
    if (image == null) return;
    setState(() {
      _busy = true;
      _err = null;
    });
    try {
      final api = await ref.read(apiClientProvider.future);
      final key = await api.uploadImageFile(image.path, filename: image.name);
      setState(() => _photoKeys.add(key));
      await _runComplianceCheck();
    } catch (e) {
      setState(() {
        _localPhotoPaths.add(image.path);
        _err = 'Photo saved offline — will upload when connected.';
      });
      await _runComplianceCheck();
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  bool get _complianceBlocksSave {
    if (_complianceMode != 'strict') return false;
    if (_compliance == null) return widget.projectId != null;
    return _compliance!['passed'] != true;
  }

  bool _canAdvanceFromStep(int step) {
    switch (step) {
      case 0:
        if (_projectSetupBlocks) return false;
        if (widget.projectId != null && _workAreas.isNotEmpty && _selectedWorkAreaId == null) {
          return false;
        }
        if (_project == null && _programs.isNotEmpty && (_effectiveProgramCode == null || _effectiveProgramCode!.isEmpty)) {
          return false;
        }
        return true;
      case 1:
        return _species.text.trim().isNotEmpty;
      case 2:
        return _lat != null && _lon != null;
      case 3:
        return true;
      case 4:
        return !_complianceBlocksSave;
      default:
        return false;
    }
  }

  void _nextWizardStep() {
    if (!_canAdvanceFromStep(_wizardStep)) {
      _showStepValidationMessage(_wizardStep);
      return;
    }
    if (_wizardStep < _wizardStepCount - 1) {
      setState(() => _wizardStep++);
    }
  }

  void _prevWizardStep() {
    if (_wizardStep > 0) setState(() => _wizardStep--);
  }

  void _showStepValidationMessage(int step) {
    final l10n = AppLocalizations.of(context);
    String message;
    switch (step) {
      case 0:
        message = l10n?.addTreeValidationContext ??
            'Finish project setup or select a work area before continuing.';
        if (_project == null && _programs.isNotEmpty && (_effectiveProgramCode == null || _effectiveProgramCode!.isEmpty)) {
          message = l10n?.addTreeValidationProgram ?? 'Select a registration program before continuing.';
        } else if (widget.projectId != null && _workAreas.isNotEmpty && _selectedWorkAreaId == null) {
          message = l10n?.addTreeValidationWorkArea ?? 'Select a work area before continuing.';
        }
        break;
      case 1:
        message = l10n?.addTreeValidationSpecies ?? 'Enter a species before continuing.';
        break;
      case 2:
        message = l10n?.addTreeValidationLocation ?? 'Capture GPS before continuing.';
        break;
      default:
        message = l10n?.addTreeValidationCompliance ??
            'Compliance check failed — fix issues before saving (strict mode).';
    }
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(message)));
  }

  String _wizardStepLabel(int step, AppLocalizations l10n) {
    switch (step) {
      case 0:
        return l10n.addTreeStepContext;
      case 1:
        return l10n.addTreeStepSpecies;
      case 2:
        return l10n.addTreeStepLocation;
      case 3:
        return l10n.addTreeStepPhotos;
      default:
        return l10n.addTreeStepReview;
    }
  }

  Widget _wizardProgress(AppLocalizations l10n) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 8, 16, 0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            children: List.generate(_wizardStepCount, (i) {
              final active = i <= _wizardStep;
              return Expanded(
                child: Container(
                  height: 4,
                  margin: EdgeInsets.only(right: i == _wizardStepCount - 1 ? 0 : 6),
                  decoration: BoxDecoration(
                    color: active ? Theme.of(context).colorScheme.primary : Colors.grey.shade300,
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
              );
            }),
          ),
          const SizedBox(height: 8),
          Text(
            '${l10n.addTreeStepOf(_wizardStep + 1, _wizardStepCount)} · ${_wizardStepLabel(_wizardStep, l10n)}',
            style: Theme.of(context).textTheme.labelLarge,
          ),
        ],
      ),
    );
  }

  Widget _wizardNavButtons(AppLocalizations l10n, {required bool onLastStep}) {
    final setupBlocked = _projectSetupBlocks && _wizardStep == 0;
    return Row(
      children: [
        if (_wizardStep > 0)
          OutlinedButton(onPressed: _busy ? null : _prevWizardStep, child: Text(l10n.addTreeBack))
        else
          const SizedBox(width: 1),
        const Spacer(),
        if (!onLastStep && !setupBlocked)
          FilledButton(
            onPressed: _busy ? null : _nextWizardStep,
            child: Text(l10n.addTreeNext),
          ),
      ],
    );
  }

  Widget _wizardStickyFooter(AppLocalizations l10n, {required bool onLastStep}) {
    return Material(
      elevation: 8,
      color: Theme.of(context).colorScheme.surface,
      child: SafeArea(
        top: false,
        child: Padding(
          padding: const EdgeInsets.fromLTRB(16, 8, 16, 12),
          child: _wizardNavButtons(l10n, onLastStep: onLastStep),
        ),
      ),
    );
  }

  Future<void> _save({bool registerNext = false}) async {
    final l10n = AppLocalizations.of(context)!;
    if (_lat == null || _lon == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(l10n.captureGpsBeforeRegister)),
      );
      return;
    }
    if (widget.projectId != null && _selectedWorkAreaId == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(l10n.selectWorkAreaForProject)),
      );
      return;
    }
    if (_complianceBlocksSave) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(l10n.complianceStrictBlock)),
      );
      return;
    }

    setState(() {
      _busy = true;
      _err = null;
    });

    final metadata = _buildMetadata();
    final dbh = double.tryParse(_dbh.text.trim());
    final height = double.tryParse(_height.text.trim());
    final initialMeasurement = <String, dynamic>{
      'method': _measurementMethod,
      if (dbh != null) 'dbh_cm': dbh,
      if (height != null) 'height_m': height,
    };
    final payload = {
      'program_code': _programCode ?? 'byot',
      'species_text': _species.text.trim(),
      'latitude': _lat,
      'longitude': _lon,
      'accuracy_m': _acc,
      'photo_keys': _photoKeys,
      'metadata': metadata,
      if (_selectedWorkAreaId != null) 'work_area_id': _selectedWorkAreaId,
      if (dbh != null || height != null || _measurementMethod != 'visual_estimate')
        'initial_measurement': initialMeasurement,
    };

    try {
      final api = await ref.read(apiClientProvider.future);
      final t = await api.createTree(
        programCode: payload['program_code'] as String,
        speciesText: payload['species_text'] as String,
        lat: _lat!,
        lon: _lon!,
        accuracy: _acc,
        photoKeys: _photoKeys,
        metadata: metadata,
        workAreaId: _selectedWorkAreaId,
        initialMeasurement: initialMeasurement,
      );
      ref.invalidate(treesProvider);
      ref.invalidate(dashboardProvider);
      if (widget.projectId != null) {
        ref.invalidate(plantingProjectProvider(widget.projectId!));
        ref.invalidate(workAreasProvider(widget.projectId!));
      }
      if (!mounted) return;
      if (registerNext && widget.projectId != null) {
        setState(() {
          _sessionSavedCount += 1;
          _successMessage = l10n.treeSavedReadyNext;
          _photoKeys.clear();
          _localPhotoPaths.clear();
          _lat = null;
          _lon = null;
          _acc = null;
          _compliance = null;
        });
        try {
          _registrationContext = await api.registrationContext(
            widget.projectId!,
            workAreaId: _selectedWorkAreaId,
          );
          final suggested =
              _registrationContext?['suggested_next'] as Map<String, dynamic>?;
          if (suggested?['latitude'] != null && suggested?['longitude'] != null) {
            setState(() {
              _lat = (suggested!['latitude'] as num).toDouble();
              _lon = (suggested['longitude'] as num).toDouble();
            });
          }
        } catch (_) {}
        if (!mounted) return;
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(_successMessage ?? l10n.treeSaved)),
        );
        return;
      }
      context.go('/trees/${t['id']}');
    } catch (e) {
      final queue = ref.read(treeRegistrationQueueProvider);
      await queue.enqueue(
        id: 'tree-${DateTime.now().millisecondsSinceEpoch}',
        payload: payload,
        localPhotoPaths: _localPhotoPaths,
      );
      ref.read(treeRegistrationSyncProvider).syncAll(() => ref.read(apiClientProvider.future));
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('${l10n.offlineQueuedSync} ${apiErrorMessage(e)}')),
      );
      context.go('/projects');
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  void dispose() {
    _species.dispose();
    _dbh.dispose();
    _height.dispose();
    for (final c in _extraControllers.values) {
      c.dispose();
    }
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final title = _isProjectMode ? l10n.addTreeTitleProject : l10n.addTreeTitle;

    if (_loadingPrograms) {
      return stackRouteScaffold(
        location: '/trees/new',
        appBar: ShellTopBar(title: title),
        body: const Center(child: CircularProgressIndicator()),
      );
    }

    final active = _activeProgram;
    final minPhotos = (active?['min_photos'] as num?)?.toInt() ?? 0;
    final photoCount = _photoKeys.length + _localPhotoPaths.length;
    final onLastStep = _wizardStep == _wizardStepCount - 1;

    return stackRouteScaffold(
      location: '/trees/new',
      appBar: ShellTopBar(title: title),
      body: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          _wizardProgress(l10n),
          Expanded(
            child: ListView(
              padding: const EdgeInsets.fromLTRB(16, 16, 16, 24),
              keyboardDismissBehavior: ScrollViewKeyboardDismissBehavior.onDrag,
              children: [
                switch (_wizardStep) {
                  0 => _stepContext(l10n),
                  1 => _stepSpecies(l10n),
                  2 => _stepLocation(l10n),
                  3 => _stepPhotos(l10n, minPhotos: minPhotos, photoCount: photoCount),
                  _ => _stepReview(l10n, minPhotos: minPhotos, photoCount: photoCount),
                },
                if (_err != null) ...[
                  const SizedBox(height: 12),
                  Text(_err!, style: TextStyle(color: Theme.of(context).colorScheme.error)),
                ],
                if (onLastStep && !_projectSetupBlocks) ...[
                  const SizedBox(height: 24),
                  if (_isProjectMode) ...[
                    FilledButton(
                      onPressed: (_busy || _complianceBlocksSave) ? null : () => _save(registerNext: true),
                      child: Text(_busy ? l10n.addTreeSaving : l10n.addTreeSaveAndNext),
                    ),
                    const SizedBox(height: 8),
                    OutlinedButton(
                      onPressed: (_busy || _complianceBlocksSave) ? null : () => _save(registerNext: false),
                      child: Text(l10n.addTreeSaveAndExit),
                    ),
                  ] else
                    FilledButton(
                      onPressed: (_busy || _complianceBlocksSave) ? null : () => _save(registerNext: false),
                      child: Text(_busy ? l10n.addTreeSaving : l10n.registerTreePrimary),
                    ),
                ],
              ],
            ),
          ),
          _wizardStickyFooter(l10n, onLastStep: onLastStep),
        ],
      ),
    );
  }

  Widget _stepContext(AppLocalizations l10n) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        if (_isProjectMode) ...[
          Text(_project!['name'] as String, style: Theme.of(context).textTheme.titleMedium),
          Text(l10n.addTreeProjectHint, style: Theme.of(context).textTheme.bodySmall),
          const SizedBox(height: 12),
        ],
        if (_projectSetupBlocks) ...[
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: Colors.amber.shade50,
              border: Border.all(color: Colors.amber.shade300),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(l10n.addTreeSetupBlockedTitle, style: const TextStyle(fontWeight: FontWeight.bold)),
                const SizedBox(height: 4),
                Text(l10n.addTreeSetupBlockedExplain, style: const TextStyle(fontSize: 13)),
                if (_setupStatus?.blockReason != null) ...[
                  const SizedBox(height: 8),
                  Text(
                    _setupStatus!.blockReason!,
                    style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600),
                  ),
                ],
                const SizedBox(height: 12),
                for (final ProjectSetupStep step in _setupStatus?.steps.where((s) => s.required) ?? const [])
                  Padding(
                    padding: const EdgeInsets.only(bottom: 6),
                    child: Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Icon(
                          step.complete ? Icons.check_circle : Icons.warning_amber_rounded,
                          size: 18,
                          color: step.complete ? Colors.green.shade700 : Colors.amber.shade800,
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                localizedSetupStepLabel(l10n, step.id),
                                style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13),
                              ),
                              if (step.description != null)
                                Text(step.description!, style: const TextStyle(fontSize: 12)),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                const SizedBox(height: 8),
                FilledButton.icon(
                  onPressed: _openProjectSetupWeb,
                  icon: const Icon(Icons.open_in_new),
                  label: Text(l10n.openProjectSetupWeb),
                ),
                const SizedBox(height: 8),
                OutlinedButton(
                  onPressed: () => context.go('/projects/${widget.projectId}'),
                  child: Text(l10n.addTreeOpenProject),
                ),
              ],
            ),
          ),
          const SizedBox(height: 12),
        ],
        if (_project != null && !_projectSetupBlocks && _workAreas.isNotEmpty)
          DropdownButtonFormField<String>(
            value: _selectedWorkAreaId,
            decoration: InputDecoration(labelText: l10n.addTreeWorkArea),
            items: _workAreas
                .map(
                  (wa) => DropdownMenuItem<String>(
                    value: (wa as Map)['id'] as String,
                    child: Text((wa)['name'] as String? ?? 'Area'),
                  ),
                )
                .toList(),
            onChanged: _busy
                ? null
                : (v) {
                    setState(() => _selectedWorkAreaId = v);
                    _runComplianceCheck();
                  },
          ),
        if (_programs.isNotEmpty && _project == null) ...[
          const SizedBox(height: 12),
          DropdownButtonFormField<String>(
            value: _effectiveProgramCode,
            decoration: InputDecoration(labelText: l10n.addTreeProgram),
            items: _programs
                .map(
                  (program) => DropdownMenuItem<String>(
                    value: program['code'] as String,
                    child: Text(program['name'] as String? ?? program['code'] as String),
                  ),
                )
                .toList(),
            onChanged: _busy
                ? null
                : (v) {
                    setState(() => _programCode = v);
                    _syncExtraFields();
                    _applySegmentDefaults();
                  },
          ),
          const SizedBox(height: 8),
          Text(
            l10n.addTreeProgramHint,
            style: Theme.of(context).textTheme.bodySmall,
          ),
          const SizedBox(height: 20),
          FilledButton(
            onPressed: _busy ? null : _nextWizardStep,
            child: Text(l10n.addTreeNext),
          ),
        ],
      ],
    );
  }

  Widget _stepSpecies(AppLocalizations l10n) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        if (_allowedSpecies.isNotEmpty)
          DropdownButtonFormField<String>(
            value: _allowedSpecies.contains(_species.text) ? _species.text : _allowedSpecies.first,
            decoration: InputDecoration(labelText: l10n.addTreeApprovedSpecies),
            items: _allowedSpecies.map((s) => DropdownMenuItem(value: s, child: Text(s))).toList(),
            onChanged: _busy
                ? null
                : (v) {
                    setState(() => _species.text = v ?? _species.text);
                    _runComplianceCheck();
                  },
          )
        else
          TextField(
            controller: _species,
            decoration: InputDecoration(labelText: l10n.addTreeSpecies),
            onChanged: (_) => _runComplianceCheck(),
          ),
        if (_isProjectMode && _chainageEnabled) ...[
          const SizedBox(height: 12),
          DropdownButtonFormField<String>(
            value: _roadSide,
            decoration: InputDecoration(labelText: l10n.addTreeRoadSide),
            items: _roadSides.map((s) => DropdownMenuItem(value: s.$1, child: Text(s.$2))).toList(),
            onChanged: (v) {
              setState(() => _roadSide = v);
              _runComplianceCheck();
            },
          ),
        ] else if (!_isProjectMode && _isNhaiContext) ...[
          const SizedBox(height: 12),
          DropdownButtonFormField<String>(
            value: _roadSide,
            decoration: InputDecoration(labelText: l10n.addTreeRoadSideNhai),
            items: _roadSides.map((s) => DropdownMenuItem(value: s.$1, child: Text(s.$2))).toList(),
            onChanged: (v) {
              setState(() => _roadSide = v);
              _runComplianceCheck();
            },
          ),
          const SizedBox(height: 12),
          DropdownButtonFormField<String>(
            value: _guardType,
            decoration: InputDecoration(labelText: l10n.addTreeGuard),
            items: _guardTypes.map((s) => DropdownMenuItem(value: s, child: Text(s))).toList(),
            onChanged: (v) {
              setState(() => _guardType = v);
              _runComplianceCheck();
            },
          ),
          const SizedBox(height: 12),
          TextFormField(
            initialValue: _pitSize,
            decoration: InputDecoration(labelText: l10n.addTreePitSize),
            onChanged: (v) {
              _pitSize = v;
              _runComplianceCheck();
            },
          ),
        ],
        for (final field in _extraFields) ...[
          const SizedBox(height: 12),
          TextField(
            controller: _extraControllers[field['key'] as String],
            decoration: InputDecoration(
              labelText: '${field['label']}${field['required'] == true ? ' *' : ''}',
            ),
          ),
        ],
        if (!_isProjectMode) ...[
          const SizedBox(height: 16),
          Text(l10n.addTreeMeasurementsTitle, style: Theme.of(context).textTheme.titleSmall),
          const SizedBox(height: 4),
          Text(l10n.addTreeMeasurementsHint, style: Theme.of(context).textTheme.bodySmall),
          const SizedBox(height: 8),
          DropdownButtonFormField<String>(
            value: _measurementMethod,
            decoration: InputDecoration(labelText: l10n.addTreeMeasurementMethod),
            items: _measurementMethods
                .map((m) => DropdownMenuItem(value: m.$1, child: Text(m.$2)))
                .toList(),
            onChanged: _busy ? null : (v) => setState(() => _measurementMethod = v ?? _measurementMethod),
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: TextField(
                  controller: _dbh,
                  keyboardType: const TextInputType.numberWithOptions(decimal: true),
                  decoration: InputDecoration(labelText: l10n.addTreeDbh, hintText: '12.5'),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: TextField(
                  controller: _height,
                  keyboardType: const TextInputType.numberWithOptions(decimal: true),
                  decoration: InputDecoration(labelText: l10n.addTreeHeight, hintText: '3.2'),
                ),
              ),
            ],
          ),
        ],
        const SizedBox(height: 24),
        if (!_projectSetupBlocks)
          FilledButton(
            onPressed: _busy ? null : _nextWizardStep,
            child: Text(l10n.addTreeNext),
          ),
      ],
    );
  }

  Widget _stepLocation(AppLocalizations l10n) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Text(l10n.addTreeLocationHint, style: Theme.of(context).textTheme.bodyMedium),
        const SizedBox(height: 12),
        OutlinedButton.icon(
          onPressed: _busy ? null : _useGps,
          icon: const Icon(Icons.my_location),
          label: Text(l10n.addTreeGetGps),
        ),
        if (_lat != null)
          Padding(
            padding: const EdgeInsets.only(top: 8),
            child: Text(formatCoordinates(_lat!, _lon!, accuracyMeters: _acc)),
          ),
        if (_compliance != null) ...[
          const SizedBox(height: 12),
          _ComplianceBanner(result: _compliance!, mode: _complianceMode),
        ],
      ],
    );
  }

  Widget _stepPhotos(AppLocalizations l10n, {required int minPhotos, required int photoCount}) {
    final target = minPhotos > 0 ? minPhotos : 3;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Text(l10n.addTreePhotosHint, style: Theme.of(context).textTheme.bodyMedium),
        if (_complianceMode == 'strict')
          Padding(
            padding: const EdgeInsets.only(top: 8),
            child: Text(
              'Strict mode: photos must be taken with the camera (gallery uploads disabled).',
              style: Theme.of(context).textTheme.bodySmall?.copyWith(color: Colors.orange.shade800),
            ),
          ),
        const SizedBox(height: 12),
        OutlinedButton.icon(
          onPressed: _busy ? null : _addPhoto,
          icon: const Icon(Icons.photo_camera_outlined),
          label: Text(l10n.addTreeAddPhoto(photoCount, target)),
        ),
        if (_localPhotoPaths.isNotEmpty)
          Padding(
            padding: const EdgeInsets.only(top: 8),
            child: Text(l10n.addTreeOfflinePhotos(_localPhotoPaths.length)),
          ),
      ],
    );
  }

  Widget _stepReview(AppLocalizations l10n, {required int minPhotos, required int photoCount}) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Text(l10n.addTreeReviewTitle, style: Theme.of(context).textTheme.titleMedium),
        const SizedBox(height: 12),
        _ReviewRow(label: l10n.addTreeSpecies, value: _species.text.trim()),
        if (_selectedWorkAreaId != null)
          _ReviewRow(
            label: l10n.addTreeWorkArea,
            value: (_workAreas.cast<Map<String, dynamic>?>().firstWhere(
                  (w) => w?['id'] == _selectedWorkAreaId,
                  orElse: () => null,
                )?['name'] as String?) ??
                _selectedWorkAreaId!,
          ),
        if (_lat != null) _ReviewRow(label: l10n.addTreeStepLocation, value: formatCoordinates(_lat!, _lon!, accuracyMeters: _acc)),
        _ReviewRow(label: l10n.addTreeStepPhotos, value: '$photoCount'),
        if (_compliance != null) ...[
          const SizedBox(height: 8),
          _ComplianceBanner(result: _compliance!, mode: _complianceMode),
        ],
        if (_successMessage != null) ...[
          const SizedBox(height: 12),
          Text(
            '$_successMessage (${l10n.addTreeSessionCount(_sessionSavedCount)})',
            style: TextStyle(color: Theme.of(context).colorScheme.primary),
          ),
        ],
        if (minPhotos > 0 && photoCount < minPhotos)
          Padding(
            padding: const EdgeInsets.only(top: 8),
            child: Text(
              l10n.addTreeMinPhotosWarning(minPhotos),
              style: TextStyle(color: Theme.of(context).colorScheme.error, fontSize: 13),
            ),
          ),
      ],
    );
  }
}

class _ReviewRow extends StatelessWidget {
  const _ReviewRow({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(width: 120, child: Text(label, style: const TextStyle(fontWeight: FontWeight.w600))),
          Expanded(child: Text(value)),
        ],
      ),
    );
  }
}

class _ComplianceBanner extends StatelessWidget {
  const _ComplianceBanner({required this.result, required this.mode});

  final Map<String, dynamic> result;
  final String mode;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final passed = result['passed'] == true;
    final issues = (result['issues'] as List<dynamic>?) ?? [];
    final chainage = result['chainage_km'];
    final color = passed ? Colors.green.shade50 : (mode == 'strict' ? Colors.red.shade50 : Colors.orange.shade50);
    final border = passed ? Colors.green : (mode == 'strict' ? Colors.red : Colors.orange);
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: color,
        border: Border.all(color: border),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            passed ? l10n.compliancePassed : l10n.complianceIssuesFound,
            style: const TextStyle(fontWeight: FontWeight.bold),
          ),
          if (chainage != null) Text(l10n.chainageKm('$chainage')),
          for (final issue in issues)
            Text(
              '• ${(issue as Map)['message'] ?? issue['violation_type']}',
              style: const TextStyle(fontSize: 13),
            ),
        ],
      ),
    );
  }
}
