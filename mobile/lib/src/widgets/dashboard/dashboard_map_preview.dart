import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:latlong2/latlong.dart';
import 'package:byot_mobile/l10n/app_localizations.dart';

import '../../providers.dart';
import '../../theme.dart';
import '../../l10n/l10n_ext.dart';

/// Compact interactive map preview on the home dashboard.
class DashboardMapPreview extends ConsumerWidget {
  const DashboardMapPreview({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = context.l10n;
    final treesAsync = ref.watch(treesProvider);

    return treesAsync.when(
      loading: () => _MapPreviewShell(l10n: l10n, child: const Center(child: CircularProgressIndicator())),
      error: (_, __) => _MapPreviewShell(
        l10n: l10n,
        child: Center(
          child: TextButton(
            onPressed: () => context.push('/map'),
            child: Text(l10n.openFullMap),
          ),
        ),
      ),
      data: (trees) {
        final points = <LatLng>[];
        for (final raw in trees) {
          final t = raw as Map<String, dynamic>;
          final lat = (t['latitude'] as num?)?.toDouble();
          final lon = (t['longitude'] as num?)?.toDouble();
          if (lat != null && lon != null) {
            points.add(LatLng(lat, lon));
          }
        }

        if (points.isEmpty) {
          return _MapPreviewShell(
            l10n: l10n,
            child: Center(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Icon(Icons.map_outlined, size: 40, color: AranyixColors.onSurfaceMuted),
                  const SizedBox(height: 8),
                  Text(l10n.noTreesOnMapPreview),
                  const SizedBox(height: 8),
                  FilledButton.tonal(
                    onPressed: () => context.push('/trees/new'),
                    child: Text(l10n.registerFirstTree),
                  ),
                ],
              ),
            ),
          );
        }

        final center = _centerOf(points);
        final zoom = points.length == 1 ? 14.0 : 11.0;

        return _MapPreviewShell(
          l10n: l10n,
          onTap: () => context.push('/map'),
          child: ClipRRect(
            borderRadius: BorderRadius.circular(AranyixRadii.card - 2),
            child: FlutterMap(
              options: MapOptions(
                initialCenter: center,
                initialZoom: zoom,
                interactionOptions: const InteractionOptions(flags: InteractiveFlag.none),
              ),
              children: [
                TileLayer(
                  urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
                  userAgentPackageName: 'tech.aranyix.mobile',
                ),
                MarkerLayer(
                  markers: [
                    for (final p in points.take(80))
                      Marker(
                        point: p,
                        width: 14,
                        height: 14,
                        child: Container(
                          decoration: BoxDecoration(
                            color: AranyixColors.forest,
                            shape: BoxShape.circle,
                            border: Border.all(color: Colors.white, width: 2),
                          ),
                        ),
                      ),
                  ],
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  LatLng _centerOf(List<LatLng> points) {
    if (points.length == 1) return points.first;
    var lat = 0.0;
    var lon = 0.0;
    for (final p in points) {
      lat += p.latitude;
      lon += p.longitude;
    }
    return LatLng(lat / points.length, lon / points.length);
  }
}

class _MapPreviewShell extends StatelessWidget {
  const _MapPreviewShell({required this.l10n, required this.child, this.onTap});

  final AppLocalizations l10n;
  final Widget child;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.only(left: 4, bottom: 12),
          child: Row(
            children: [
              Text(l10n.liveMap, style: Theme.of(context).textTheme.titleMedium),
              const Spacer(),
              if (onTap != null)
                TextButton(
                  onPressed: onTap,
                  child: Text(l10n.expand),
                ),
            ],
          ),
        ),
        Material(
          color: AranyixColors.surfaceContainer,
          borderRadius: BorderRadius.circular(AranyixRadii.card),
          clipBehavior: Clip.antiAlias,
          child: InkWell(
            onTap: onTap,
            child: SizedBox(height: 200, width: double.infinity, child: child),
          ),
        ),
      ],
    );
  }
}
