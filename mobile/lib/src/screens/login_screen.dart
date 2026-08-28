import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../api/api_client.dart';
import '../api/api_errors.dart';
import '../auth/google_oauth.dart';
import '../auth/login_remember.dart';
import '../auth_session.dart';
import '../pending_invite.dart';
import '../providers.dart';
import '../theme.dart';
import '../widgets/auth_light_scope.dart';
import '../widgets/auth_scaffold.dart';
import '../widgets/mobile_auth_security.dart';
import 'auth_flow_screens.dart';

enum _LoginMode { email, phone }

/// Unified sign-in — email/password, phone OTP, Google, forgot password.
class LoginScreen extends ConsumerStatefulWidget {
  const LoginScreen({super.key});

  @override
  ConsumerState<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends ConsumerState<LoginScreen> {
  _LoginMode _mode = _LoginMode.email;
  final _email = TextEditingController();
  final _pwd = TextEditingController();
  final _apiUrl = TextEditingController();

  String? _err;
  bool _busy = false;
  bool _loaded = false;
  bool _inviteLoaded = false;
  String? _invitePreview;
  bool _rememberMe = true;
  bool _obscurePassword = true;

  @override
  void initState() {
    super.initState();
    _bootstrap();
  }

  Future<void> _bootstrap() async {
    await Future.wait([_loadRemembered(), _loadApiUrl()]);
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (!_inviteLoaded) {
      _inviteLoaded = true;
      _loadInvitePreview();
    }
  }

  Future<void> _loadRemembered() async {
    final saved = await LoginRemember.load();
    if (!mounted) return;
    setState(() {
      _rememberMe = saved.remember;
      if (kDebugMode && saved.email.isEmpty) {
        _email.text = 'demo@byot.earth';
        _pwd.text = 'byotdemo1234!';
      } else {
        _email.text = saved.email;
        _pwd.text = saved.password;
      }
    });
  }

  Future<void> _loadApiUrl() async {
    if (allowCustomApiBase) {
      final url = await ApiClient.loadBaseUrl();
      _apiUrl.text = url;
    }
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
    } catch (_) {}
  }

  Future<void> _persistRememberChoice() async {
    await LoginRemember.save(
      remember: _rememberMe,
      email: _email.text,
      password: _pwd.text,
    );
  }

  Future<void> _submitEmail() async {
    setState(() {
      _busy = true;
      _err = null;
    });
    try {
      if (allowCustomApiBase) {
        try {
          await ApiClient.saveBaseUrl(_apiUrl.text);
        } on FormatException catch (e) {
          setState(() => _err = e.message);
          return;
        }
        ref.invalidate(apiClientProvider);
      }
      final api = await ref.read(apiClientProvider.future);
      final tokens = await api.login(
        _email.text.trim(),
        _pwd.text,
      );
      await api.setTokens(
        accessToken: tokens['access_token'] as String,
        refreshToken: tokens['refresh_token'] as String?,
      );
      await _persistRememberChoice();
      if (!mounted) return;
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

  Future<void> _googleSignIn() async {
    setState(() {
      _busy = true;
      _err = null;
    });
    try {
      final api = await ref.read(apiClientProvider.future);
      final auth = await api.googleAuthorize();
      final url = auth['authorize_url'] as String;
      if (!mounted) return;
      final tokens = await GoogleOAuthWebView.open(context, url);
      if (tokens == null) return;
      await api.setTokens(
        accessToken: tokens['access_token']!,
        refreshToken: tokens['refresh_token'],
      );
      if (!mounted) return;
      final inviteToken = GoRouterState.of(context).uri.queryParameters['invite'];
      final landing = await completeAuthSession(ref, inviteToken: inviteToken);
      if (!mounted) return;
      context.go(landing);
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
    final sessionExpired = GoRouterState.of(context).uri.queryParameters['session'] == 'expired';
    return AuthLightScope(
      child: AuthScaffold(
        compact: true,
        title: 'Welcome back',
        subtitle: 'Sign in to continue mapping trees, biodiversity, and compliance evidence.',
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: _busy ? null : () => context.go('/welcome'),
        ),
        footer: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          mainAxisSize: MainAxisSize.min,
          children: [
            const AuthOrDivider(),
            const SizedBox(height: 12),
            OutlinedButton.icon(
              onPressed: _busy ? null : _googleSignIn,
              icon: const Icon(Icons.g_mobiledata, size: 28),
              label: const Text('Continue with Google'),
            ),
            const SizedBox(height: 8),
            OutlinedButton(
              onPressed: _busy ? null : () => context.push('/signup'),
              child: const Text('Create an account'),
            ),
          ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          mainAxisSize: MainAxisSize.min,
          children: [
            if (sessionExpired) ...[
              Container(
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: AranyixColors.warningContainer,
                  borderRadius: BorderRadius.circular(AranyixRadii.chip),
                  border: Border.all(color: const Color(0xFFFCD34D)),
                ),
                child: const Row(
                  children: [
                    Icon(Icons.info_outline, color: AranyixColors.warningOnContainer, size: 20),
                    SizedBox(width: 10),
                    Expanded(
                      child: Text(
                        'Your session expired. Sign in again to continue where you left off.',
                        style: TextStyle(fontSize: 13, color: AranyixColors.warningOnContainer, height: 1.35),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 16),
            ],
            if (_invitePreview != null) ...[
              Container(
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: AranyixColors.forestLight,
                  borderRadius: BorderRadius.circular(AranyixRadii.chip),
                  border: Border.all(color: AranyixColors.forestMuted.withValues(alpha: 0.5)),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.mail_outline, color: AranyixColors.forest, size: 20),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Text(
                        _invitePreview!,
                        style: const TextStyle(fontSize: 14, color: AranyixColors.forestDark),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 20),
            ],
            AuthModeTabs<_LoginMode>(
              values: const [_LoginMode.email, _LoginMode.phone],
              labels: const ['Email', 'Phone OTP'],
              selected: _mode,
              onChanged: _busy ? (_) {} : (mode) => setState(() => _mode = mode),
            ),
            const SizedBox(height: 16),
            if (_mode == _LoginMode.email) ...[
              if (allowCustomApiBase) ...[
                TextField(
                  controller: _apiUrl,
                  enabled: _loaded && !_busy,
                  keyboardType: TextInputType.url,
                  decoration: const InputDecoration(
                    labelText: 'API server',
                    hintText: 'https://api.aranyix.tech',
                  ),
                ),
                const SizedBox(height: 12),
              ],
              TextField(
                controller: _email,
                keyboardType: TextInputType.emailAddress,
                autocorrect: false,
                textInputAction: TextInputAction.next,
                decoration: const InputDecoration(
                  labelText: 'Email',
                  prefixIcon: Icon(Icons.mail_outline, size: 20),
                ),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: _pwd,
                obscureText: _obscurePassword,
                textInputAction: TextInputAction.done,
                onSubmitted: (_) {
                  if (!_busy && _loaded) _submitEmail();
                },
                decoration: InputDecoration(
                  labelText: 'Password',
                  prefixIcon: const Icon(Icons.lock_outline, size: 20),
                  suffixIcon: IconButton(
                    onPressed: () => setState(() => _obscurePassword = !_obscurePassword),
                    icon: Icon(
                      _obscurePassword
                          ? Icons.visibility_outlined
                          : Icons.visibility_off_outlined,
                      size: 20,
                    ),
                  ),
                ),
              ),
              const SizedBox(height: 4),
              Row(
                children: [
                  Expanded(
                    child: InkWell(
                      onTap: _busy
                          ? null
                          : () => setState(() => _rememberMe = !_rememberMe),
                      borderRadius: BorderRadius.circular(10),
                      child: Padding(
                        padding: const EdgeInsets.symmetric(vertical: 6),
                        child: Row(
                          children: [
                            SizedBox(
                              width: 24,
                              height: 24,
                              child: Checkbox(
                                value: _rememberMe,
                                onChanged: _busy
                                    ? null
                                    : (v) => setState(() => _rememberMe = v ?? false),
                                materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
                              ),
                            ),
                            const SizedBox(width: 8),
                            const Text(
                              'Remember me',
                              style: TextStyle(
                                fontSize: 14,
                                fontWeight: FontWeight.w600,
                                color: AranyixColors.onSurface,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
                  TextButton(
                    onPressed: _busy ? null : () => context.push('/forgot-password'),
                    child: const Text('Forgot password?'),
                  ),
                ],
              ),
              const SizedBox(height: 10),
              const MobileAuthSecurityNote(),
              if (_err != null) ...[
                const SizedBox(height: 10),
                AuthErrorBanner(message: _err!),
              ],
              const SizedBox(height: 12),
              FilledButton(
                onPressed: _busy || !_loaded ? null : _submitEmail,
                child: Text(_busy ? 'Signing in…' : 'Sign in'),
              ),
              const SizedBox(height: 10),
              Wrap(
                spacing: 6,
                runSpacing: 6,
                children: const [
                  _LoginTrustChip(icon: Icons.gps_fixed, label: 'GPS-verified'),
                  _LoginTrustChip(icon: Icons.cloud_off, label: 'Offline sync'),
                ],
              ),
            ] else
              PhoneOtpLoginPanel(
                onSwitchToEmail: () => setState(() => _mode = _LoginMode.email),
              ),
          ],
        ),
      ),
    );
  }
}

class _LoginTrustChip extends StatelessWidget {
  const _LoginTrustChip({required this.icon, required this.label});

  final IconData icon;
  final String label;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: AranyixColors.forestLight,
        borderRadius: BorderRadius.circular(999),
        border: Border.all(color: AranyixColors.forestMuted.withValues(alpha: 0.35)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 14, color: AranyixColors.forest),
          const SizedBox(width: 6),
          Text(label, style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: AranyixColors.forestDark)),
        ],
      ),
    );
  }
}
