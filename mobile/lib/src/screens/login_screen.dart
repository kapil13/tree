import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../api/api_client.dart';
import '../api/api_errors.dart';
import '../auth/google_oauth.dart';
import '../auth_session.dart';
import '../pending_invite.dart';
import '../providers.dart';
import '../theme.dart';
import '../widgets/auth_light_scope.dart';
import '../widgets/auth_scaffold.dart';
import '../widgets/turnstile_captcha.dart';
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
  final _email = TextEditingController(
    text: kDebugMode ? 'demo@byot.earth' : '',
  );
  final _pwd = TextEditingController(
    text: kDebugMode ? 'byotdemo1234!' : '',
  );
  final _apiUrl = TextEditingController();
  final _captchaKey = GlobalKey<TurnstileCaptchaState>();

  String? _err;
  bool _busy = false;
  bool _loaded = false;
  bool _inviteLoaded = false;
  String? _invitePreview;

  bool _captchaEnabled = false;
  String? _captchaSiteKey;
  String? _captchaToken;

  @override
  void initState() {
    super.initState();
    _loadApiUrl();
    _loadCaptcha();
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (!_inviteLoaded) {
      _inviteLoaded = true;
      _loadInvitePreview();
    }
  }

  Future<void> _loadCaptcha() async {
    try {
      final api = await ref.read(apiClientProvider.future);
      final cfg = await api.captchaConfig();
      if (!mounted) return;
      setState(() {
        _captchaEnabled = cfg['enabled'] == true;
        _captchaSiteKey = cfg['site_key'] as String?;
      });
    } catch (_) {}
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

  Future<void> _submitEmail() async {
    if (_captchaEnabled && (_captchaToken == null || _captchaToken!.isEmpty)) {
      setState(() => _err = 'Please complete the security check below.');
      return;
    }
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
        captchaToken: _captchaToken,
      );
      await api.setTokens(
        accessToken: tokens['access_token'] as String,
        refreshToken: tokens['refresh_token'] as String?,
      );
      if (!mounted) return;
      final inviteToken = GoRouterState.of(context).uri.queryParameters['invite'];
      final landing = await completeAuthSession(ref, inviteToken: inviteToken);
      if (!mounted) return;
      context.go(landing);
    } on InviteAcceptException catch (e) {
      setState(() => _err = e.message);
    } catch (e) {
      setState(() {
        _err = apiErrorMessage(e);
        _captchaToken = null;
      });
      _captchaKey.currentState?.reset();
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
    return AuthLightScope(
      child: AuthScaffold(
        title: 'Welcome back',
        subtitle: 'Sign in to your Aranyix account',
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: _busy ? null : () => context.go('/welcome'),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
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
            Container(
              padding: const EdgeInsets.all(4),
              decoration: BoxDecoration(
                color: const Color(0xFFE8F3EA),
                borderRadius: BorderRadius.circular(AranyixRadii.button),
              ),
              child: SegmentedButton<_LoginMode>(
                style: ButtonStyle(
                  visualDensity: VisualDensity.compact,
                  backgroundColor: WidgetStateProperty.resolveWith((states) {
                    if (states.contains(WidgetState.selected)) return Colors.white;
                    return Colors.transparent;
                  }),
                ),
                segments: const [
                  ButtonSegment(value: _LoginMode.email, label: Text('Email')),
                  ButtonSegment(value: _LoginMode.phone, label: Text('Phone OTP')),
                ],
                selected: {_mode},
                onSelectionChanged: _busy
                    ? null
                    : (s) => setState(() => _mode = s.first),
              ),
            ),
            const SizedBox(height: 20),
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
                decoration: const InputDecoration(labelText: 'Email'),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: _pwd,
                obscureText: true,
                decoration: const InputDecoration(labelText: 'Password'),
              ),
              Align(
                alignment: Alignment.centerRight,
                child: TextButton(
                  onPressed: _busy ? null : () => context.push('/forgot-password'),
                  child: const Text('Forgot password?'),
                ),
              ),
              if (_captchaEnabled && _captchaSiteKey != null) ...[
                const SizedBox(height: 4),
                TurnstileCaptcha(
                  key: _captchaKey,
                  siteKey: _captchaSiteKey!,
                  onToken: (t) => setState(() {
                    _captchaToken = t;
                    _err = null;
                  }),
                  onError: () => setState(() => _captchaToken = null),
                  onExpired: () => setState(() => _captchaToken = null),
                ),
                const SizedBox(height: 12),
              ],
              if (_err != null) ...[
                AuthErrorBanner(message: _err!),
                const SizedBox(height: 12),
              ],
              FilledButton(
                onPressed: _busy || !_loaded ? null : _submitEmail,
                child: Text(_busy ? 'Signing in…' : 'Sign in'),
              ),
            ] else
              PhoneOtpLoginPanel(
                onSwitchToEmail: () => setState(() => _mode = _LoginMode.email),
              ),
            const SizedBox(height: 20),
            const AuthOrDivider(),
            const SizedBox(height: 16),
            OutlinedButton.icon(
              onPressed: _busy ? null : _googleSignIn,
              icon: const Icon(Icons.g_mobiledata, size: 28),
              label: const Text('Continue with Google'),
            ),
            const SizedBox(height: 10),
            OutlinedButton(
              onPressed: _busy ? null : () => context.push('/signup'),
              child: const Text('Create an account'),
            ),
          ],
        ),
      ),
    );
  }
}
