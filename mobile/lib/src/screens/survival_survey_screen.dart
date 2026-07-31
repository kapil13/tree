import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../api/api_errors.dart';
import '../location_helper.dart';
import '../providers.dart';
import '../theme.dart';

class SurvivalSurveyScreen extends ConsumerStatefulWidget {
  const SurvivalSurveyScreen({super.key, required this.treeId});

  final String treeId;

  @override
  ConsumerState<SurvivalSurveyScreen> createState() => _SurvivalSurveyScreenState();
}

class _SurvivalSurveyScreenState extends ConsumerState<SurvivalSurveyScreen> {
  final _remarks = TextEditingController();
  LocationCaptureResult? _location;
  bool _locating = false;
  bool _submitting = false;
  String? _error;
  String? _locMessage;

  @override
  void initState() {
    super.initState();
    _captureGps();
  }

  @override
  void dispose() {
    _remarks.dispose();
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
      );
      ref.invalidate(treesProvider);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Survival re-geotag saved')),
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

    return Scaffold(
      backgroundColor: AranyixColors.surface,
      appBar: AppBar(title: const Text('Survival / re-geotag')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Text(
            'Capture current GPS for tree ${widget.treeId} and submit a survival re-geotag.',
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: AranyixColors.onSurfaceMuted),
          ),
          const SizedBox(height: 16),
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('Current GPS', style: TextStyle(fontWeight: FontWeight.w600)),
                  const SizedBox(height: 8),
                  if (_locating)
                    const LinearProgressIndicator()
                  else if (loc != null)
                    Text(formatCoordinates(loc.latitude, loc.longitude, accuracyMeters: loc.accuracyMeters))
                  else
                    const Text('No fix yet'),
                  if (_locMessage != null) ...[
                    const SizedBox(height: 6),
                    Text(_locMessage!, style: const TextStyle(fontSize: 12, color: AranyixColors.onSurfaceMuted)),
                  ],
                  const SizedBox(height: 12),
                  OutlinedButton.icon(
                    onPressed: _locating ? null : _captureGps,
                    icon: const Icon(Icons.my_location),
                    label: const Text('Refresh GPS'),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 16),
          TextField(
            controller: _remarks,
            decoration: const InputDecoration(
              labelText: 'Remarks',
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
            child: Text(_submitting ? 'Submitting…' : 'Submit re-geotag'),
          ),
        ],
      ),
    );
  }
}
