import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:image_picker/image_picker.dart';

import '../api/api_errors.dart';
import '../location_helper.dart';
import '../providers.dart';

class AddTreeScreen extends ConsumerStatefulWidget {
  const AddTreeScreen({super.key});
  @override
  ConsumerState<AddTreeScreen> createState() => _AddTreeScreenState();
}

class _AddTreeScreenState extends ConsumerState<AddTreeScreen> {
  final _species = TextEditingController(text: 'Neem');
  final _extraControllers = <String, TextEditingController>{};
  List<dynamic> _programs = [];
  String? _programCode;
  double? _lat;
  double? _lon;
  double? _acc;
  bool _busy = false;
  bool _loadingPrograms = true;
  String? _err;
  final List<String> _photoKeys = [];
  final _picker = ImagePicker();

  @override
  void initState() {
    super.initState();
    _loadPrograms();
  }

  Future<void> _loadPrograms() async {
    try {
      final api = await ref.read(apiClientProvider.future);
      final programs = await api.listEnrolledPlantingPrograms();
      if (!mounted) return;
      setState(() {
        _programs = programs;
        _programCode = programs.isNotEmpty ? programs.first['code'] as String : 'byot';
        _loadingPrograms = false;
      });
      _syncExtraFields();
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _loadingPrograms = false;
        _err = apiErrorMessage(e);
      });
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
    for (final key in _extraControllers.keys.toList()) {
      if (!keys.contains(key)) {
        _extraControllers.remove(key)?.dispose();
      }
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
    } catch (e) {
      setState(() => _err = apiErrorMessage(e));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _save() async {
    if (_lat == null || _lon == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Tap “Get my location” first — trees need a GPS point on the map.')),
      );
      return;
    }
    setState(() {
      _busy = true;
      _err = null;
    });
    try {
      final api = await ref.read(apiClientProvider.future);
      final metadata = <String, dynamic>{};
      for (final field in _extraFields) {
        final key = field['key'] as String;
        final value = _extraControllers[key]?.text.trim() ?? '';
        if (value.isNotEmpty) metadata[key] = value;
      }
      final t = await api.createTree(
        programCode: _programCode ?? 'byot',
        speciesText: _species.text.trim(),
        lat: _lat!,
        lon: _lon!,
        accuracy: _acc,
        photoKeys: _photoKeys,
        metadata: metadata,
      );
      ref.invalidate(treesProvider);
      ref.invalidate(dashboardProvider);
      if (!mounted) return;
      context.go('/trees/${t['id']}');
    } catch (e) {
      setState(() => _err = apiErrorMessage(e));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  void dispose() {
    _species.dispose();
    for (final controller in _extraControllers.values) {
      controller.dispose();
    }
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    if (_loadingPrograms) {
      return const Scaffold(
        appBar: AppBar(title: Text('Add tree')),
        body: Center(child: CircularProgressIndicator()),
      );
    }

    final active = _activeProgram;
    final minPhotos = (active?['min_photos'] as num?)?.toInt() ?? 0;

    return Scaffold(
      appBar: AppBar(title: const Text('Add tree')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          if (_programs.isNotEmpty)
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
                  : (value) {
                      setState(() => _programCode = value);
                      _syncExtraFields();
                    },
            ),
          if (active != null) ...[
            const SizedBox(height: 8),
            Text(
              active['description'] as String? ?? '',
              style: Theme.of(context).textTheme.bodySmall,
            ),
          ],
          const SizedBox(height: 12),
          TextField(controller: _species, decoration: const InputDecoration(labelText: 'Species')),
          const SizedBox(height: 12),
          for (final field in _extraFields) ...[
            TextField(
              controller: _extraControllers[field['key'] as String],
              decoration: InputDecoration(
                labelText: '${field['label'] as String}${field['required'] == true ? ' *' : ''}',
              ),
            ),
            const SizedBox(height: 12),
          ],
          OutlinedButton.icon(
            onPressed: _busy ? null : _useGps,
            icon: const Icon(Icons.my_location),
            label: const Text('Get my location'),
          ),
          if (_lat != null)
            Padding(
              padding: const EdgeInsets.only(top: 8),
              child: Text(formatCoordinates(_lat!, _lon!, accuracyMeters: _acc)),
            ),
          if (minPhotos > 0) ...[
            const SizedBox(height: 12),
            OutlinedButton.icon(
              onPressed: _busy ? null : _addPhoto,
              icon: const Icon(Icons.photo_camera_outlined),
              label: Text('Add photo (${_photoKeys.length}/$minPhotos)'),
            ),
          ],
          if (_err != null) ...[
            const SizedBox(height: 12),
            Text(_err!, style: const TextStyle(color: Colors.red)),
          ],
          const SizedBox(height: 24),
          FilledButton(
            onPressed: _busy ? null : _save,
            child: Text(_busy ? 'Saving…' : 'Register tree'),
          ),
        ],
      ),
    );
  }
}
