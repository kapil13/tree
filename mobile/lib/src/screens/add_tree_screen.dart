import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:geolocator/geolocator.dart';
import 'package:go_router/go_router.dart';
import 'package:image_picker/image_picker.dart';

import '../providers.dart';

const _maxPhotos = 10;
const _maxPhotoBytes = 10 * 1024 * 1024;

class AddTreeScreen extends ConsumerStatefulWidget {
  const AddTreeScreen({super.key});
  @override
  ConsumerState<AddTreeScreen> createState() => _AddTreeScreenState();
}

class _AddTreeScreenState extends ConsumerState<AddTreeScreen> {
  final _species = TextEditingController(text: 'Neem');
  final _picker = ImagePicker();
  final _photos = <XFile>[];
  double? _lat;
  double? _lon;
  double? _acc;
  bool _busy = false;
  String? _status;

  Future<void> _useGps() async {
    LocationPermission perm = await Geolocator.checkPermission();
    if (perm == LocationPermission.denied) {
      perm = await Geolocator.requestPermission();
    }
    if (perm == LocationPermission.deniedForever || perm == LocationPermission.denied) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Location permission denied')));
      return;
    }
    final pos = await Geolocator.getCurrentPosition();
    setState(() {
      _lat = pos.latitude;
      _lon = pos.longitude;
      _acc = pos.accuracy;
    });
  }

  Future<void> _pickPhotos(ImageSource source) async {
    if (_photos.length >= _maxPhotos) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('You can attach up to $_maxPhotos photos.')),
      );
      return;
    }

    try {
      if (source == ImageSource.gallery) {
        final picked = await _picker.pickMultiImage(imageQuality: 85);
        if (picked.isEmpty) return;
        await _addPhotos(picked);
      } else {
        final picked = await _picker.pickImage(source: ImageSource.camera, imageQuality: 85);
        if (picked == null) return;
        await _addPhotos([picked]);
      }
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Could not open ${source == ImageSource.camera ? 'camera' : 'gallery'}: $e')),
      );
    }
  }

  Future<void> _addPhotos(List<XFile> picked) async {
    final room = _maxPhotos - _photos.length;
    final accepted = <XFile>[];

    for (final file in picked.take(room)) {
      final bytes = await file.length();
      if (bytes > _maxPhotoBytes) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Each photo must be 10 MB or smaller.')),
          );
        }
        continue;
      }
      accepted.add(file);
    }

    if (accepted.isEmpty) return;
    setState(() => _photos.addAll(accepted));
  }

  void _removePhoto(int index) => setState(() => _photos.removeAt(index));

  Future<void> _save() async {
    if (_lat == null || _lon == null) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Use GPS to capture location first')));
      return;
    }
    setState(() {
      _busy = true;
      _status = null;
    });
    try {
      final api = await ref.read(apiClientProvider.future);
      final photoKeys = <String>[];

      for (var i = 0; i < _photos.length; i++) {
        setState(() => _status = 'Uploading photo ${i + 1} of ${_photos.length}…');
        final key = await api.uploadTreePhoto(_photos[i].path);
        photoKeys.add(key);
      }

      setState(() => _status = 'Registering tree…');
      final t = await api.createTree(
        speciesText: _species.text.trim(),
        lat: _lat!,
        lon: _lon!,
        accuracy: _acc,
        photoKeys: photoKeys,
      );
      if (!mounted) return;
      context.go('/trees/${t['id']}');
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Could not save tree: $e')),
      );
    } finally {
      if (mounted) {
        setState(() {
          _busy = false;
          _status = null;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Add tree')),
      body: SingleChildScrollView(
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
            const SizedBox(height: 20),
            Text('Photos (optional)', style: Theme.of(context).textTheme.titleSmall),
            const SizedBox(height: 4),
            Text(
              'Add up to $_maxPhotos images. The first photo is used as the primary image for AI analysis.',
              style: Theme.of(context).textTheme.bodySmall?.copyWith(color: Colors.grey.shade600),
            ),
            const SizedBox(height: 12),
            if (_photos.isNotEmpty)
              SizedBox(
                height: 96,
                child: ListView.separated(
                  scrollDirection: Axis.horizontal,
                  itemCount: _photos.length,
                  separatorBuilder: (_, __) => const SizedBox(width: 8),
                  itemBuilder: (context, index) {
                    final photo = _photos[index];
                    return Stack(
                      clipBehavior: Clip.none,
                      children: [
                        ClipRRect(
                          borderRadius: BorderRadius.circular(10),
                          child: Image.file(
                            File(photo.path),
                            width: 96,
                            height: 96,
                            fit: BoxFit.cover,
                          ),
                        ),
                        Positioned(
                          top: -6,
                          right: -6,
                          child: IconButton.filled(
                            style: IconButton.styleFrom(
                              backgroundColor: Colors.black87,
                              minimumSize: const Size(28, 28),
                              padding: EdgeInsets.zero,
                            ),
                            onPressed: _busy ? null : () => _removePhoto(index),
                            icon: const Icon(Icons.close, size: 16),
                          ),
                        ),
                        if (index == 0)
                          Positioned(
                            left: 6,
                            bottom: 6,
                            child: DecoratedBox(
                              decoration: BoxDecoration(
                                color: Colors.black54,
                                borderRadius: BorderRadius.circular(4),
                              ),
                              child: const Padding(
                                padding: EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                child: Text('Primary', style: TextStyle(color: Colors.white, fontSize: 10)),
                              ),
                            ),
                          ),
                      ],
                    );
                  },
                ),
              ),
            if (_photos.isNotEmpty) const SizedBox(height: 12),
            Row(
              children: [
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: _busy || _photos.length >= _maxPhotos ? null : () => _pickPhotos(ImageSource.gallery),
                    icon: const Icon(Icons.photo_library_outlined),
                    label: const Text('Gallery'),
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: _busy || _photos.length >= _maxPhotos ? null : () => _pickPhotos(ImageSource.camera),
                    icon: const Icon(Icons.photo_camera_outlined),
                    label: const Text('Camera'),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 24),
            if (_status != null)
              Padding(
                padding: const EdgeInsets.only(bottom: 8),
                child: Text(_status!, textAlign: TextAlign.center, style: Theme.of(context).textTheme.bodySmall),
              ),
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
