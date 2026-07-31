import 'package:flutter/material.dart';
import 'package:webview_flutter/webview_flutter.dart';

/// Cloudflare Turnstile via embedded WebView (production signup/login).
class TurnstileCaptcha extends StatefulWidget {
  const TurnstileCaptcha({
    super.key,
    required this.siteKey,
    required this.onToken,
    this.onError,
  });

  final String siteKey;
  final ValueChanged<String> onToken;
  final VoidCallback? onError;

  @override
  State<TurnstileCaptcha> createState() => _TurnstileCaptchaState();
}

class _TurnstileCaptchaState extends State<TurnstileCaptcha> {
  late final WebViewController _controller;
  bool _loaded = false;

  @override
  void initState() {
    super.initState();
    _controller = WebViewController()
      ..setJavaScriptMode(JavaScriptMode.unrestricted)
      ..addJavaScriptChannel(
        'AranyixTurnstile',
        onMessageReceived: (msg) {
          final token = msg.message.trim();
          if (token.isNotEmpty && token != 'error') {
            widget.onToken(token);
          } else {
            widget.onError?.call();
          }
        },
      )
      ..setNavigationDelegate(
        NavigationDelegate(
          onPageFinished: (_) {
            if (mounted) setState(() => _loaded = true);
          },
        ),
      )
      ..loadHtmlString(_html(widget.siteKey));
  }

  void reset() {
    _controller.reload();
    setState(() => _loaded = false);
  }

  static String _html(String siteKey) => '''
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <script src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit" async defer></script>
  <style>
    body { margin: 0; display: flex; justify-content: center; align-items: center; min-height: 80px; background: #f8faf8; font-family: system-ui, sans-serif; }
    #wrap { width: 100%; display: flex; justify-content: center; }
  </style>
</head>
<body>
  <div id="wrap"><div id="captcha"></div></div>
  <script>
    function renderCaptcha() {
      if (!window.turnstile) { setTimeout(renderCaptcha, 120); return; }
      turnstile.render('#captcha', {
        sitekey: '$siteKey',
        theme: 'light',
        callback: function(token) { AranyixTurnstile.postMessage(token); },
        'error-callback': function() { AranyixTurnstile.postMessage('error'); }
      });
    }
    renderCaptcha();
  </script>
</body>
</html>
''';

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: 88,
      child: Stack(
        children: [
          WebViewWidget(controller: _controller),
          if (!_loaded)
            const Center(child: SizedBox(width: 24, height: 24, child: CircularProgressIndicator(strokeWidth: 2))),
        ],
      ),
    );
  }
}
