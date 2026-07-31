import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:flutter/material.dart';
import 'package:byot_mobile/l10n/app_localizations.dart';

import '../theme.dart';

/// Shows when the device has no network connectivity.
class OfflineConnectivityBanner extends StatefulWidget {
  const OfflineConnectivityBanner({super.key});

  @override
  State<OfflineConnectivityBanner> createState() => _OfflineConnectivityBannerState();
}

class _OfflineConnectivityBannerState extends State<OfflineConnectivityBanner> {
  bool _offline = false;

  @override
  void initState() {
    super.initState();
    _refresh();
    Connectivity().onConnectivityChanged.listen((_) => _refresh());
  }

  Future<void> _refresh() async {
    final results = await Connectivity().checkConnectivity();
    final offline = results.every((r) => r == ConnectivityResult.none);
    if (mounted) setState(() => _offline = offline);
  }

  @override
  Widget build(BuildContext context) {
    if (!_offline) return const SizedBox.shrink();
    final l10n = AppLocalizations.of(context);
    return Container(
      width: double.infinity,
      color: AranyixColors.warningContainer,
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      child: Row(
        children: [
          const Icon(Icons.wifi_off, size: 18, color: AranyixColors.warningOnContainer),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              l10n?.offlineMode ?? 'You are offline — changes will sync when connected.',
              style: const TextStyle(fontSize: 13, color: AranyixColors.warningOnContainer),
            ),
          ),
        ],
      ),
    );
  }
}
