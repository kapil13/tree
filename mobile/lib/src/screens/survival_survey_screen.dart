import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:image_picker/image_picker.dart';

import '../api/api_errors.dart';
import '../location_helper.dart';
import '../providers.dart';
import '../theme.dart';
import '../widgets/shell_scaffold.dart';
import '../widgets/stack_route_scaffold.dart';
import '../l10n/l10n_ext.dart';

class SurvivalSurveyScreen extends ConsumerStatefulWidget {
  const SurvivalSurveyScreen({super.key, required this.treeId});

  final String treeId;

  @override
  ConsumerState<SurvivalSurveyScreen> createState() => _SurvivalSurveyScreenState();
}

class _SurvivalSurveyScreenState extends ConsumerState<SurvivalSurveyScreen> {
  final _remarks = TextEditingController();
  final _dbh = TextEditingController();
  final _height = TextEditingController();
  final _picker = ImagePicker();
  LocationCaptureResult? _location;
  bool _locating = false;
  bool _submitting = false;
  bool _photoBusy = false;
  String? _error;
  String? _locMessage;
  String? _surveyPhotoKey;
  String _survivalStatus = 'live';
  String _measurementMethod = 'tape';

  @override
  void initState() {
    super.initState();
    _captureGps();
  }

  @override
  void dispose() {
    _remarks.dispose();
    _dbh.dispose();
    _height.dispose();
    super.dispose();
  }

  Future<void> _captureGps() async {
    setState(() {
      _locating = true;
      _error = null;
      _locMessage = null;
    });
    try {
      final loc = await captureLocation(allowFallback: false);
      if (mounted) {
        setState(() {
          _location = loc;
          _locMessage = loc.message;
          _locating = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _error = e is LocationCaptureException ? e.message : apiErrorMessage(e);
          _locating = false;
        });
      }
    }
  }

  Future<void> _captureSurveyPhoto() async {
    setState(() {
      _photoBusy = true;
      _error = null;
    });
    try {
      final image = await _picker.pickImage(source: ImageSource.camera, imageQuality: 85);
      if (image == null) return;
      final api = await ref.read(apiClientProvider.future);
      final key = await api.uploadImageFile(image.path, filename: image.name);
      if (mounted) setState(() => _surveyPhotoKey = key);
    } catch (e) {
      if (mounted) setState(() => _error = apiErrorMessage(e));
    } finally {
      if (mounted) setState(() => _photoBusy = false);
    }
  }

  Future<void> _submit() async {
    final loc = _location;
    if (loc == null) {
      setState(() => _error = 'Capture GPS before submitting.');
      return;
    }
    setState(() {
      _submitting = true;
      _error = null;
    });
    try {
      final api = await ref.read(apiClientProvider.future);
      await api.regeotagTree(
        widget.treeId,
        lat: loc.latitude,
        lon: loc.longitude,
        accuracy: loc.accuracyMeters,
        remarks: _remarks.text.trim().isEmpty ? null : _remarks.text.trim(),
        survivalStatus: _survivalStatus,
        photoKey: _surveyPhotoKey,
        dbhCm: double.tryParse(_dbh.text.trim()),
        heightM: double.tryParse(_height.text.trim()),
        method: _measurementMethod,
      );
      ref.invalidate(treesProvider);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(context.l10n.survivalSurveySaved)),
        );
        context.pop();
      }
    } catch (e) {
      if (mounted) setState(() => _error = apiErrorMessage(e));
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final loc = _location;

    final l10n = context.l10n;
    return stackRouteScaffold(
      location: '/trees/${widget.treeId}/survival',
      appBar: ShellTopBar(title: l10n.survivalRegeotag, menuWithBack: true),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Text(
            'Capture GPS and optional remeasurements for tree ${widget.treeId}. '
            'Each survey creates an auditable measurement record.',
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: AranyixColors.onSurfaceMuted),
          ),
          const SizedBox(height: 16),
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(l10n.currentGps, style: const TextStyle(fontWeight: FontWeight.w600)),
                  const SizedBox(height: 8),
                  if (_locating)
                    const LinearProgressIndicator()
                  else if (loc != null)
                    Text(formatCoordinates(loc.latitude, loc.longitude, accuracyMeters: loc.accuracyMeters))
                  else
                    Text(l10n.noGpsFix),
                  if (_locMessage != null) ...[
                    const SizedBox(height: 6),
                    Text(_locMessage!, style: const TextStyle(fontSize: 12, color: AranyixColors.onSurfaceMuted)),
                  ],
                  const SizedBox(height: 12),
                  OutlinedButton.icon(
                    onPressed: _locating ? null : _captureGps,
                    icon: const Icon(Icons.my_location),
                    label: Text(l10n.refreshGps),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 16),
          DropdownButtonFormField<String>(
            value: _survivalStatus,
            decoration: InputDecoration(labelText: l10n.survivalStatusLabel),
            items: [
              DropdownMenuItem(value: 'live', child: Text(l10n.survivalLive)),
              DropdownMenuItem(value: 'stressed', child: Text(l10n.survivalStressed)),
              DropdownMenuItem(value: 'dead', child: Text(l10n.survivalDead)),
              DropdownMenuItem(value: 'replaced', child: Text(l10n.survivalReplaced)),
              const DropdownMenuItem(value: 'missing', child: Text('Missing / uprooted')),
            ],
            onChanged: _submitting ? null : (v) => setState(() => _survivalStatus = v ?? _survivalStatus),
          ),
          const SizedBox(height: 12),
          DropdownButtonFormField<String>(
            value: _measurementMethod,
            decoration: InputDecoration(labelText: l10n.measurementMethodLabel),
            items: [
              const DropdownMenuItem(value: 'tape', child: Text('Tape measure (DBH at 1.3 m)')),
              DropdownMenuItem(value: 'caliper', child: Text(l10n.caliper)),
              const DropdownMenuItem(value: 'clinometer', child: Text('Clinometer (height)')),
              DropdownMenuItem(value: 'visual_estimate', child: Text(l10n.visualEstimate)),
            ],
            onChanged: _submitting ? null : (v) => setState(() => _measurementMethod = v ?? _measurementMethod),
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: TextField(
                  controller: _dbh,
                  keyboardType: const TextInputType.numberWithOptions(decimal: true),
                  decoration: InputDecoration(
                    labelText: l10n.dbhLabel,
                    hintText: l10n.optionalRemeasure,
                  ),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: TextField(
                  controller: _height,
                  keyboardType: const TextInputType.numberWithOptions(decimal: true),
                  decoration: InputDecoration(
                    labelText: l10n.heightLabel,
                    hintText: l10n.optionalHint,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          OutlinedButton.icon(
            onPressed: _photoBusy || _submitting ? null : _captureSurveyPhoto,
            icon: const Icon(Icons.add_a_photo_outlined),
            label: Text(
              _surveyPhotoKey != null
                  ? 'Survey photo attached'
                  : (_photoBusy ? 'Capturing photo…' : 'Add survey photo (camera)'),
            ),
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _remarks,
            decoration: InputDecoration(
              labelText: l10n.remarksLabel,
              hintText: 'Condition, replacement notes…',
            ),
            maxLines: 3,
          ),
          if (_error != null) ...[
            const SizedBox(height: 12),
            Text(_error!, style: TextStyle(color: Theme.of(context).colorScheme.error)),
          ],
          const SizedBox(height: 20),
          FilledButton(
            onPressed: _submitting || loc == null ? null : _submit,
            child: Text(_submitting ? l10n.submitting : l10n.submitSurvivalSurvey),
          ),
        ],
      ),
    );
  }
}
