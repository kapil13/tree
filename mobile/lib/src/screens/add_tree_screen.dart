import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:geolocator/geolocator.dart';
import 'package:go_router/go_router.dart';

import '../api/api_errors.dart';
import '../providers.dart';

class AddTreeScreen extends ConsumerStatefulWidget {
  const AddTreeScreen({super.key});
  @override
  ConsumerState<AddTreeScreen> createState() => _AddTreeScreenState();
}

class _AddTreeScreenState extends ConsumerState<AddTreeScreen> {
  final _species = TextEditingController(text: 'Neem');
  double? _lat;
  double? _lon;
  double? _acc;
  bool _busy = false;
  String? _err;

  Future<void> _useGps() async {
    LocationPermission perm = await Geolocator.checkPermission();
    if (perm == LocationPermission.denied) {
      perm = await Geolocator.requestPermission();
    }
    if (perm == LocationPermission.deniedForever || perm == LocationPermission.denied) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Location permission denied')),
      );
      return;
    }
    try {
      final pos = await Geolocator.getCurrentPosition();
      setState(() {
        _lat = pos.latitude;
        _lon = pos.longitude;
        _acc = pos.accuracy;
        _err = null;
      });
    } catch (e) {
      setState(() => _err = apiErrorMessage(e));
    }
  }

  Future<void> _save() async {
    if (_lat == null || _lon == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Use GPS to capture location first')),
      );
      return;
    }
    setState(() {
      _busy = true;
      _err = null;
    });
    try {
      final api = await ref.read(apiClientProvider.future);
      final t = await api.createTree(
        speciesText: _species.text.trim(),
        lat: _lat!,
        lon: _lon!,
        accuracy: _acc,
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
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Add tree')),
      body: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            TextField(controller: _species, decoration: const InputDecoration(labelText: 'Species')),
            const SizedBox(height: 12),
            OutlinedButton.icon(
              onPressed: _busy ? null : _useGps,
              icon: const Icon(Icons.gps_fixed),
              label: const Text('Capture GPS location'),
            ),
            if (_lat != null)
              Padding(
                padding: const EdgeInsets.only(top: 8),
                child: Text(
                  'lat ${_lat!.toStringAsFixed(6)} · lon ${_lon!.toStringAsFixed(6)}'
                  ' · ±${_acc?.toStringAsFixed(1) ?? "?"} m',
                ),
              ),
            if (_err != null) ...[
              const SizedBox(height: 12),
              Text(_err!, style: const TextStyle(color: Colors.red)),
            ],
            const Spacer(),
            FilledButton(
              onPressed: _busy ? null : _save,
              child: Text(_busy ? 'Saving…' : 'Register tree'),
            ),
          ],
        ),
      ),
    );
  }
}
