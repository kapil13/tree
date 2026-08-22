import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:image_picker/image_picker.dart';

import '../api/api_errors.dart';
import '../location_helper.dart';
import '../offline/tree_registration_queue.dart';
import '../providers.dart';

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

  String? get _segment => _project?['segment'] as String?;

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
    if (_project?['active_standard'] == null) return true;
    if (_complianceMode != 'open' && _workAreas.isEmpty) return true;
    final schemeCode = _project?['scheme_code'];
    final programCode = _project?['program_code'];
    if (schemeCode == null && programCode != 'government_nhai') return false;
    final defaults =
        (_project?['metadata']?['tree_registration_defaults'] as Map<String, dynamic>?) ?? {};
    for (final key in [
      'permit_reference',
      'site_zone',
      'implementing_agency',
      'maintenance_responsible',
    ]) {
      if ((defaults[key]?.toString().trim() ?? '').isEmpty) return true;
    }
    return false;
  }

  void _applySegmentDefaults() {
    if (!_isProjectMode && _segment == 'nhai_highway') {
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
    if (_programCode == null) return null;
    return _programs.cast<Map<String, dynamic>?>().firstWhere(
          (p) => p?['code'] == _programCode,
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
        if (_segment == 'nhai_highway' && (key == 'road_side' || key == 'guard_type' || key == 'pit_size_cm')) {
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
    } else if (_segment == 'nhai_highway') {
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
    final image = await _picker.pickImage(source: ImageSource.camera, imageQuality: 85);
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

  Future<void> _save({bool registerNext = false}) async {
    if (_lat == null || _lon == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Capture GPS before registering.')),
      );
      return;
    }
    if (widget.projectId != null && _selectedWorkAreaId == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Select a work area for this project.')),
      );
      return;
    }
    if (_complianceBlocksSave) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Compliance check failed — fix issues before saving (strict mode).')),
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
          _successMessage = 'Tree saved. Ready for the next gap.';
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
          SnackBar(content: Text(_successMessage ?? 'Tree saved')),
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
        SnackBar(content: Text('Offline — queued for sync. ${apiErrorMessage(e)}')),
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
    if (_loadingPrograms) {
      return Scaffold(
        appBar: AppBar(title: const Text('Register tree')),
        body: const Center(child: CircularProgressIndicator()),
      );
    }

    final active = _activeProgram;
    final minPhotos = (active?['min_photos'] as num?)?.toInt() ?? 0;
    final photoCount = _photoKeys.length + _localPhotoPaths.length;

    return Scaffold(
      appBar: AppBar(
        title: Text(_isProjectMode ? 'Register project tree' : 'Add tree'),
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          if (_isProjectMode) ...[
            Text(_project!['name'] as String, style: Theme.of(context).textTheme.titleMedium),
            Text(
              'GPS, photos, and species only — pit, spacing, and guard inherit from the project.',
              style: Theme.of(context).textTheme.bodySmall,
            ),
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
                  const Text(
                    'Finish project setup first',
                    style: TextStyle(fontWeight: FontWeight.bold),
                  ),
                  const SizedBox(height: 4),
                  const Text(
                    'Complete tree registration defaults (permit, site zone, agency) '
                    'in the web project setup before registering trees here.',
                    style: TextStyle(fontSize: 13),
                  ),
                  const SizedBox(height: 8),
                  OutlinedButton(
                    onPressed: () => context.go('/projects/${widget.projectId}'),
                    child: const Text('Open project'),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 12),
          ],
          if (_project != null && !_projectSetupBlocks) ...[
            if (_workAreas.isNotEmpty)
              DropdownButtonFormField<String>(
                value: _selectedWorkAreaId,
                decoration: const InputDecoration(labelText: 'Work area *'),
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
            const SizedBox(height: 12),
          ],
          if (_programs.isNotEmpty && _project == null)
            DropdownButtonFormField<String>(
              value: _programCode,
              decoration: const InputDecoration(labelText: 'Registration program'),
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
                    },
            ),
          const SizedBox(height: 12),
          if (_allowedSpecies.isNotEmpty)
            DropdownButtonFormField<String>(
              value: _allowedSpecies.contains(_species.text) ? _species.text : _allowedSpecies.first,
              decoration: const InputDecoration(labelText: 'Approved species'),
              items: _allowedSpecies
                  .map((s) => DropdownMenuItem(value: s, child: Text(s)))
                  .toList(),
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
              decoration: const InputDecoration(labelText: 'Species'),
              onChanged: (_) => _runComplianceCheck(),
            ),
          if (_isProjectMode && _chainageEnabled) ...[
            const SizedBox(height: 12),
            DropdownButtonFormField<String>(
              value: _roadSide,
              decoration: const InputDecoration(labelText: 'Road side *'),
              items: _roadSides
                  .map((s) => DropdownMenuItem(value: s.$1, child: Text(s.$2)))
                  .toList(),
              onChanged: (v) {
                setState(() => _roadSide = v);
                _runComplianceCheck();
              },
            ),
          ] else if (!_isProjectMode && _segment == 'nhai_highway') ...[
            const SizedBox(height: 12),
            DropdownButtonFormField<String>(
              value: _roadSide,
              decoration: const InputDecoration(labelText: 'Road side (LHS/RHS) *'),
              items: _roadSides
                  .map((s) => DropdownMenuItem(value: s.$1, child: Text(s.$2)))
                  .toList(),
              onChanged: (v) {
                setState(() => _roadSide = v);
                _runComplianceCheck();
              },
            ),
            const SizedBox(height: 12),
            DropdownButtonFormField<String>(
              value: _guardType,
              decoration: const InputDecoration(labelText: 'Tree guard *'),
              items: _guardTypes.map((s) => DropdownMenuItem(value: s, child: Text(s))).toList(),
              onChanged: (v) {
                setState(() => _guardType = v);
                _runComplianceCheck();
              },
            ),
            const SizedBox(height: 12),
            TextFormField(
              initialValue: _pitSize,
              decoration: const InputDecoration(labelText: 'Pit size (LxWxD cm)'),
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
            Text('Field measurements (optional)', style: Theme.of(context).textTheme.titleSmall),
            const SizedBox(height: 4),
            Text(
              'Measure DBH at 1.3 m above ground. Leave blank if not measured yet.',
              style: Theme.of(context).textTheme.bodySmall,
            ),
            const SizedBox(height: 8),
            DropdownButtonFormField<String>(
              value: _measurementMethod,
              decoration: const InputDecoration(labelText: 'Measurement method'),
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
                    decoration: const InputDecoration(
                      labelText: 'DBH (cm)',
                      hintText: 'e.g. 12.5',
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: TextField(
                    controller: _height,
                    keyboardType: const TextInputType.numberWithOptions(decimal: true),
                    decoration: const InputDecoration(
                      labelText: 'Height (m)',
                      hintText: 'e.g. 3.2',
                    ),
                  ),
                ),
              ],
            ),
          ],
          const SizedBox(height: 12),
          OutlinedButton.icon(
            onPressed: _busy ? null : _useGps,
            icon: const Icon(Icons.my_location),
            label: const Text('Get GPS location'),
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
          if (minPhotos > 0 || _project != null) ...[
            const SizedBox(height: 12),
            OutlinedButton.icon(
              onPressed: _busy ? null : _addPhoto,
              icon: const Icon(Icons.photo_camera_outlined),
              label: Text('Add photo ($photoCount/${minPhotos > 0 ? minPhotos : 3})'),
            ),
          ],
          if (_successMessage != null) ...[
            const SizedBox(height: 12),
            Text(
              '$_successMessage (${_sessionSavedCount} this session)',
              style: TextStyle(color: Theme.of(context).colorScheme.primary),
            ),
          ],
          if (_err != null) ...[
            const SizedBox(height: 12),
            Text(_err!, style: TextStyle(color: Theme.of(context).colorScheme.error)),
          ],
          const SizedBox(height: 24),
          if (_isProjectMode && !_projectSetupBlocks) ...[
            FilledButton(
              onPressed: (_busy || _complianceBlocksSave) ? null : () => _save(registerNext: true),
              child: Text(_busy ? 'Saving…' : 'Save & register next'),
            ),
            const SizedBox(height: 8),
            OutlinedButton(
              onPressed: (_busy || _complianceBlocksSave) ? null : () => _save(registerNext: false),
              child: const Text('Save & exit'),
            ),
          ] else if (!_projectSetupBlocks)
            FilledButton(
              onPressed: (_busy || _complianceBlocksSave) ? null : () => _save(registerNext: false),
              child: Text(_busy ? 'Saving…' : 'Register tree'),
            ),
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
            passed ? 'Compliance check passed' : 'Compliance issues found',
            style: const TextStyle(fontWeight: FontWeight.bold),
          ),
          if (chainage != null) Text('Chainage: ${chainage} km'),
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
