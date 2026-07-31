import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:webview_flutter/webview_flutter.dart';

/// Cloudflare Turnstile widget (same provider as web auth).
class TurnstileCaptcha extends StatefulWidget {
  const TurnstileCaptcha({
    super.key,
    required this.siteKey,
    required this.onTokenChange,
    this.height = 72,
  });

  final String siteKey;
  final ValueChanged<String> onTokenChange;
  final double height;

  @override
  State<TurnstileCaptcha> createState() => TurnstileCaptchaState();
}

class TurnstileCaptchaState extends State<TurnstileCaptcha> {
  late final WebViewController _controller;
  bool _loadError = false;
  int _renderKey = 0;

  void reset() {
    widget.onTokenChange('');
    setState(() {
      _loadError = false;
      _renderKey++;
    });
    _loadHtml();
  }

  @override
  void initState() {
    super.initState();
    _controller = WebViewController()
      ..setJavaScriptMode(JavaScriptMode.unrestricted)
      ..setBackgroundColor(const Color(0x00000000))
      ..addJavaScriptChannel(
        'TurnstileBridge',
        onMessageReceived: (message) {
          try {
            final data = jsonDecode(message.message) as Map<String, dynamic>;
            final type = data['type'] as String? ?? '';
            if (type == 'token') {
              widget.onTokenChange(data['token'] as String? ?? '');
            } else if (type == 'expired' || type == 'error') {
              widget.onTokenChange('');
              if (type == 'error' && mounted) {
                setState(() => _loadError = true);
              }
            }
          } catch (_) {
            widget.onTokenChange('');
          }
        },
      );
    _loadHtml();
  }

  @override
  void didUpdateWidget(covariant TurnstileCaptcha oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.siteKey != widget.siteKey) {
      reset();
    }
  }

  void _loadHtml() {
    final html = '''
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
  <script src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit" async defer></script>
  <style>
    html, body { margin: 0; padding: 0; background: transparent; }
    #c { display: flex; justify-content: center; align-items: center; min-height: 65px; }
  </style>
</head>
<body>
  <div id="c"></div>
  <script>
    function post(payload) {
      TurnstileBridge.postMessage(JSON.stringify(payload));
    }
    function mount() {
      if (!window.turnstile) {
        setTimeout(mount, 50);
        return;
      }
      turnstile.render('#c', {
        sitekey: ${jsonEncode(widget.siteKey)},
        theme: 'light',
        callback: function(token) { post({ type: 'token', token: token }); },
        'expired-callback': function() { post({ type: 'expired' }); },
        'error-callback': function() { post({ type: 'error' }); }
      });
    }
    window.addEventListener('load', mount);
  </script>
</body>
</html>
''';
    _controller.loadHtmlString(html, baseUrl: 'https://aranyix.tech');
  }

  @override
  Widget build(BuildContext context) {
    if (_loadError) {
      return Column(
        children: [
          const Text(
            'Security check could not load. Disable ad blockers or try another network.',
            textAlign: TextAlign.center,
            style: TextStyle(fontSize: 12, color: Color(0xFF9A3412)),
          ),
          TextButton(
            onPressed: reset,
            child: const Text('Retry security check'),
          ),
        ],
      );
    }
    return SizedBox(
      key: ValueKey(_renderKey),
      height: widget.height,
      child: WebViewWidget(controller: _controller),
    );
  }
}
