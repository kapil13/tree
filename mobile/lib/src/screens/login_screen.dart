import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../api/api_client.dart';
import '../providers.dart';

class LoginScreen extends ConsumerStatefulWidget {
  const LoginScreen({super.key});
  @override
  ConsumerState<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends ConsumerState<LoginScreen> {
  final _email = TextEditingController(text: 'demo@byot.earth');
  final _pwd = TextEditingController(text: 'byotdemo1234!');
  final _apiUrl = TextEditingController();
  String? _err;
  bool _busy = false;
  bool _loaded = false;

  @override
  void initState() {
    super.initState();
    _loadApiUrl();
  }

  Future<void> _loadApiUrl() async {
    final url = await ApiClient.loadBaseUrl();
    _apiUrl.text = url;
    if (mounted) setState(() => _loaded = true);
  }

  String _friendlyError(Object e) {
    final msg = e.toString();
    if (msg.contains('connection timeout') || msg.contains('Connection timed out')) {
      return 'Cannot reach the API. Use your Mac Wi-Fi IP (not localhost), e.g. http://192.168.1.42:8000 — phone and Mac must be on the same Wi-Fi, and run make dev-start on the Mac.';
    }
    if (msg.contains('Connection refused') || msg.contains('Failed host lookup')) {
      return 'Cannot connect to server. Check API URL and that make dev-start is running on your Mac.';
    }
    return msg;
  }

  Future<void> _submit() async {
    setState(() {
      _busy = true;
      _err = null;
    });
    try {
      await ApiClient.saveBaseUrl(_apiUrl.text);
      ref.invalidate(apiClientProvider);
      final api = await ref.read(apiClientProvider.future);
      final tokens = await api.login(_email.text.trim(), _pwd.text);
      await api.setToken(tokens['access_token'] as String);
      if (!mounted) return;
      context.go('/home');
    } catch (e) {
      setState(() => _err = _friendlyError(e));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  void dispose() {
    _email.dispose();
    _pwd.dispose();
    _apiUrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const SizedBox(height: 48),
              const Text('🌳', style: TextStyle(fontSize: 48)),
              const SizedBox(height: 8),
              const Text('BYOT', style: TextStyle(fontSize: 28, fontWeight: FontWeight.bold)),
              const Text('Bring Your Own Tree'),
              const SizedBox(height: 32),
              TextField(
                controller: _apiUrl,
                enabled: _loaded && !_busy,
                keyboardType: TextInputType.url,
                autocorrect: false,
                decoration: const InputDecoration(
                  labelText: 'API server',
                  hintText: 'http://192.168.1.42:8000',
                  helperText: 'Mac IP + port 8000. Same Wi-Fi as phone. Not localhost.',
                ),
              ),
              const SizedBox(height: 12),
              TextField(controller: _email, decoration: const InputDecoration(labelText: 'Email')),
              const SizedBox(height: 12),
              TextField(
                controller: _pwd,
                obscureText: true,
                decoration: const InputDecoration(labelText: 'Password'),
              ),
              const SizedBox(height: 16),
              if (_err != null)
                Text(_err!, style: const TextStyle(color: Colors.red)),
              const SizedBox(height: 8),
              FilledButton(
                onPressed: _busy || !_loaded ? null : _submit,
                child: Text(_busy ? 'Signing in…' : 'Sign in'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
