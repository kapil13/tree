import 'package:flutter/material.dart';
import 'package:webview_flutter/webview_flutter.dart';

import '../l10n/l10n_ext.dart';

/// In-app Google OAuth — intercepts redirect to `/auth/callback#access_token=…`.
class GoogleOAuthWebView extends StatefulWidget {
  const GoogleOAuthWebView({super.key, required this.authorizeUrl});

  final String authorizeUrl;

  /// Returns `{access_token, refresh_token}` or null if cancelled.
  static Future<Map<String, String>?> open(BuildContext context, String authorizeUrl) {
    return Navigator.of(context).push<Map<String, String>>(
      MaterialPageRoute(
        fullscreenDialog: true,
        builder: (_) => GoogleOAuthWebView(authorizeUrl: authorizeUrl),
      ),
    );
  }

  @override
  State<GoogleOAuthWebView> createState() => _GoogleOAuthWebViewState();
}

class _GoogleOAuthWebViewState extends State<GoogleOAuthWebView> {
  late final WebViewController _controller;
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _controller = WebViewController()
      ..setJavaScriptMode(JavaScriptMode.unrestricted)
      ..setNavigationDelegate(
        NavigationDelegate(
          onPageStarted: (_) => setState(() => _loading = true),
          onPageFinished: (_) => setState(() => _loading = false),
          onNavigationRequest: (req) {
            final tokens = _tokensFromCallbackUrl(req.url);
            if (tokens != null) {
              Navigator.of(context).pop(tokens);
              return NavigationDecision.prevent;
            }
            return NavigationDecision.navigate;
          },
        ),
      )
      ..loadRequest(Uri.parse(widget.authorizeUrl));
  }

  static Map<String, String>? _tokensFromCallbackUrl(String url) {
    if (!url.contains('/auth/callback')) return null;
    final uri = Uri.parse(url);
    final fragment = uri.fragment;
    if (fragment.isEmpty) return null;
    final params = Uri.splitQueryString(fragment);
    final access = params['access_token'];
    final refresh = params['refresh_token'];
    if (access == null || access.isEmpty) return null;
    return {
      'access_token': access,
      if (refresh != null) 'refresh_token': refresh,
    };
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(context.l10n.signInWithGoogle),
        leading: IconButton(
          icon: const Icon(Icons.close),
          onPressed: () => Navigator.of(context).pop(),
        ),
      ),
      body: Stack(
        children: [
          WebViewWidget(controller: _controller),
          if (_loading) const Center(child: CircularProgressIndicator()),
        ],
      ),
    );
  }
}

/// Parse tokens from a deep-link URI (`/auth/callback#…`).
Map<String, String>? parseOAuthCallbackUri(Uri uri) {
  if (!uri.path.contains('/auth/callback')) return null;
  final fragment = uri.fragment;
  if (fragment.isEmpty) return null;
  final params = Uri.splitQueryString(fragment);
  final access = params['access_token'];
  if (access == null || access.isEmpty) return null;
  final refresh = params['refresh_token'];
  return {
    'access_token': access,
    if (refresh != null) 'refresh_token': refresh,
  };
}
