import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../api/api_client.dart';
import '../api/api_errors.dart';
import '../auth_session.dart';
import '../pending_invite.dart';
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
  bool _inviteLoaded = false;
  String? _invitePreview;

  @override
  void initState() {
    super.initState();
    _loadApiUrl();
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (!_inviteLoaded) {
      _inviteLoaded = true;
      _loadInvitePreview();
    }
  }

  Future<void> _loadApiUrl() async {
    final url = await ApiClient.loadBaseUrl();
    _apiUrl.text = url;
    if (mounted) setState(() => _loaded = true);
  }

  Future<void> _loadInvitePreview() async {
    final inviteToken = GoRouterState.of(context).uri.queryParameters['invite'];
    if (inviteToken == null || inviteToken.isEmpty) return;
    await storePendingInviteToken(inviteToken);
    try {
      final api = await ApiClient.create();
      final preview = await api.previewOrgInvite(inviteToken);
      if (mounted) {
        setState(() {
          _invitePreview =
              'Invited to ${preview['organization_name']} as ${preview['org_role']}';
        });
      }
    } catch (_) {
      // Preview is optional — accept may still work after login.
    }
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
      await api.setTokens(
        accessToken: tokens['access_token'] as String,
        refreshToken: tokens['refresh_token'] as String?,
      );
      final inviteToken = GoRouterState.of(context).uri.queryParameters['invite'];
      final landing = await completeAuthSession(ref, inviteToken: inviteToken);
      if (!mounted) return;
      context.go(landing);
    } on InviteAcceptException catch (e) {
      setState(() => _err = e.message);
    } catch (e) {
      setState(() => _err = apiErrorMessage(e));
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
              const Text('Aranyix', style: TextStyle(fontSize: 28, fontWeight: FontWeight.bold)),
              const Text('Field & forest intelligence'),
              if (_invitePreview != null) ...[
                const SizedBox(height: 16),
                Container(
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    color: const Color(0xFFE8F5E9),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: const Color(0xFFA7D7B5)),
                  ),
                  child: Text(_invitePreview!, style: const TextStyle(fontSize: 14)),
                ),
              ],
              const SizedBox(height: 32),
              TextField(
                controller: _apiUrl,
                enabled: _loaded && !_busy,
                keyboardType: TextInputType.url,
                autocorrect: false,
                decoration: const InputDecoration(
                  labelText: 'API server',
                  hintText: 'https://api.aranyix.tech',
                  helperText: 'Production: https://api.aranyix.tech — local dev: http://YOUR_MAC_IP:8000',
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
