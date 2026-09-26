import 'package:flutter/material.dart';
import 'package:webview_flutter/webview_flutter.dart';

import '../api/api_base_url.dart';
import '../theme.dart';
import '../l10n/l10n_ext.dart';

/// Cloudflare Turnstile for mobile — loads from aranyix.tech (registered domain)
/// and returns token via `aranyix://captcha?token=…` navigation intercept.
class TurnstileCaptcha extends StatefulWidget {
  const TurnstileCaptcha({
    super.key,
    required this.siteKey,
    required this.onToken,
    this.onError,
    this.onExpired,
  });

  final String siteKey;
  final ValueChanged<String> onToken;
  final VoidCallback? onError;
  final VoidCallback? onExpired;

  @override
  State<TurnstileCaptcha> createState() => TurnstileCaptchaState();
}

class TurnstileCaptchaState extends State<TurnstileCaptcha> {
  WebViewController? _controller;
  bool _loading = true;
  bool _failed = false;
  String? _errorMessage;
  int _loadAttempt = 0;

  static String captchaPageUrl(String siteKey, {String theme = 'light'}) {
    final apiUri = Uri.parse(kByotApiBase);
    final String webHost;
    if (apiUri.host.startsWith('api.')) {
      webHost = apiUri.host.substring(4);
    } else if (_isLocalhost(apiUri.host)) {
      // Turnstile only works on registered production domains.
      webHost = 'aranyix.tech';
    } else {
      webHost = apiUri.host;
    }
    return 'https://$webHost/auth/mobile-captcha'
        '?sitekey=${Uri.encodeComponent(siteKey)}&theme=${Uri.encodeComponent(theme)}';
  }

  static bool _isLocalhost(String host) =>
      host == 'localhost' || host == '127.0.0.1' || host == '10.0.2.2';

  @override
  void initState() {
    super.initState();
    _initController();
  }

  void _initController() {
    final url = captchaPageUrl(widget.siteKey);
    _controller = WebViewController()
      ..setJavaScriptMode(JavaScriptMode.unrestricted)
      ..setBackgroundColor(AranyixColors.surface)
      ..setNavigationDelegate(
        NavigationDelegate(
          onPageStarted: (_) {
            if (mounted) {
              setState(() {
                _loading = true;
                _failed = false;
              });
            }
          },
          onPageFinished: (_) {
            if (mounted) setState(() => _loading = false);
          },
          onWebResourceError: (err) {
            if (mounted) {
              setState(() {
                _loading = false;
                _failed = true;
                _errorMessage = err.description.isNotEmpty
                    ? err.description
                    : 'Could not reach the security check. Try another network.';
              });
              widget.onError?.call();
            }
          },
          onNavigationRequest: (request) {
            final uri = Uri.tryParse(request.url);
            if (uri != null && uri.scheme == 'aranyix' && uri.host == 'captcha') {
              final token = uri.queryParameters['token'];
              if (token != null && token.isNotEmpty) {
                widget.onToken(token);
                if (mounted) {
                  setState(() {
                    _failed = false;
                    _errorMessage = null;
                  });
                }
              } else {
                widget.onExpired?.call();
                widget.onError?.call();
              }
              return NavigationDecision.prevent;
            }
            return NavigationDecision.navigate;
          },
        ),
      )
      ..loadRequest(Uri.parse(url));
  }

  void reset() {
    setState(() {
      _loadAttempt++;
      _loading = true;
      _failed = false;
      _errorMessage = null;
    });
    _initController();
  }

  @override
  Widget build(BuildContext context) {
    final controller = _controller;
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(AranyixRadii.chip),
        border: Border.all(color: AranyixColors.forest.withValues(alpha: 0.12)),
      ),
      clipBehavior: Clip.antiAlias,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(14, 10, 14, 0),
            child: Row(
              children: [
                Icon(Icons.verified_user_outlined, size: 16, color: AranyixColors.forest.withValues(alpha: 0.8)),
                const SizedBox(width: 6),
                Text(
                  context.l10n.securityCheck,
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                    color: AranyixColors.forestDark.withValues(alpha: 0.85),
                  ),
                ),
              ],
            ),
          ),
          SizedBox(
            height: 88,
            child: Stack(
              alignment: Alignment.center,
              children: [
                if (controller != null) WebViewWidget(controller: controller),
                if (_loading)
                  const SizedBox(
                    width: 22,
                    height: 22,
                    child: CircularProgressIndicator(strokeWidth: 2, color: AranyixColors.forest),
                  ),
              ],
            ),
          ),
          if (_failed) ...[
            Padding(
              padding: const EdgeInsets.fromLTRB(14, 0, 14, 10),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Text(
                    _errorMessage ?? context.l10n.securityCheckUnavailable,
                    style: const TextStyle(fontSize: 12, color: AranyixColors.warningOnContainer),
                  ),
                  const SizedBox(height: 6),
                  TextButton(
                    onPressed: reset,
                    style: TextButton.styleFrom(
                      foregroundColor: AranyixColors.forest,
                      padding: EdgeInsets.zero,
                      minimumSize: const Size(0, 32),
                      tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                    ),
                    child: Text(context.l10n.retrySecurityCheck),
                  ),
                ],
              ),
            ),
          ],
        ],
      ),
    );
  }
}
