import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:flutter/material.dart';
import 'package:byot_mobile/l10n/app_localizations.dart';

import '../services/network_status.dart';
import '../theme.dart';

/// Shows when the device has no network or the API is unreachable.
class OfflineConnectivityBanner extends StatefulWidget {
  const OfflineConnectivityBanner({super.key});

  @override
  State<OfflineConnectivityBanner> createState() => _OfflineConnectivityBannerState();
}

class _OfflineConnectivityBannerState extends State<OfflineConnectivityBanner> {
  bool _showBanner = false;
  bool _apiUnreachable = false;

  @override
  void initState() {
    super.initState();
    _refresh();
    Connectivity().onConnectivityChanged.listen((_) => _refresh());
  }

  Future<void> _refresh() async {
    final hasNetwork = await NetworkStatus.hasDeviceNetwork();
    if (!hasNetwork) {
      if (mounted) {
        setState(() {
          _showBanner = true;
          _apiUnreachable = false;
        });
      }
      return;
    }
    final apiOk = await NetworkStatus.isApiReachable();
    if (mounted) {
      setState(() {
        _showBanner = !apiOk;
        _apiUnreachable = !apiOk;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    if (!_showBanner) return const SizedBox.shrink();
    final l10n = AppLocalizations.of(context);
    final message = _apiUnreachable
        ? (l10n?.offlineServerUnreachable ??
            'Server unreachable — changes will sync when the API is back.')
        : (l10n?.offlineMode ?? 'You are offline — changes will sync when connected.');
    return Container(
      width: double.infinity,
      color: AranyixColors.warningContainer,
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      child: Row(
        children: [
          Icon(
            _apiUnreachable ? Icons.cloud_off : Icons.wifi_off,
            size: 18,
            color: AranyixColors.warningOnContainer,
          ),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              message,
              style: const TextStyle(fontSize: 13, color: AranyixColors.warningOnContainer),
            ),
          ),
        ],
      ),
    );
  }
}
