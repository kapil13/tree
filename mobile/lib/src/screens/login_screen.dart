import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:webview_flutter/webview_flutter.dart';

import '../api/api_client.dart';
import '../api/api_errors.dart';
import '../auth_session.dart';
import '../pending_invite.dart';
import '../providers.dart';
import '../theme.dart';
import '../widgets/turnstile_captcha.dart';

enum _AuthMethod { email, phone }
enum _AuthView { signin, forgot }

class LoginScreen extends ConsumerStatefulWidget {
  const LoginScreen({super.key});
  @override
  ConsumerState<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends ConsumerState<LoginScreen> {
  final _email = TextEditingController();
  final _pwd = TextEditingController();
  final _phone = TextEditingController();
  final _otp = TextEditingController();
  final _resetCode = TextEditingController();
  final _resetPwd = TextEditingController();
  final _resetPwd2 = TextEditingController();
  final _apiUrl = TextEditingController();

  final GlobalKey<TurnstileCaptchaState> _captchaKey = GlobalKey();

  _AuthMethod _method = _AuthMethod.email;
  _AuthView _view = _AuthView.signin;
  bool _otpSent = false;
  bool _resetConfirm = false;
  bool _showPassword = false;
  bool _busy = false;
  bool _loaded = false;
  bool _inviteLoaded = false;
  String? _err;
  String? _devHint;
  String? _invitePreview;
  String _captchaToken = '';
  Map<String, dynamic>? _captchaConfig;

  bool get _captchaEnabled =>
      _captchaConfig?['enabled'] == true &&
      (_captchaConfig?['site_key'] as String?)?.isNotEmpty == true;

  String? get _siteKey => _captchaConfig?['site_key'] as String?;

  @override
  void initState() {
    super.initState();
    _bootstrap();
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (!_inviteLoaded) {
      _inviteLoaded = true;
      _loadInvitePreview();
    }
  }

  Future<void> _bootstrap() async {
    final url = await ApiClient.loadBaseUrl();
    _apiUrl.text = url;
    if (mounted) setState(() => _loaded = true);
    await _loadCaptchaConfig();
  }

  Future<void> _loadCaptchaConfig() async {
    try {
      await ApiClient.saveBaseUrl(_apiUrl.text);
      ref.invalidate(apiClientProvider);
      final api = await ref.read(apiClientProvider.future);
      final cfg = await api.captchaConfig();
      if (mounted) setState(() => _captchaConfig = cfg);
    } catch (_) {
      if (mounted) setState(() => _captchaConfig = {'enabled': false});
    }
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

  void _resetCaptcha() {
    _captchaToken = '';
    _captchaKey.currentState?.reset();
  }

  bool _requireCaptcha() {
    if (!_captchaEnabled) return true;
    if (_captchaToken.isEmpty) {
      setState(() => _err = 'Please complete the security check.');
      return false;
    }
    return true;
  }

  String _humanize(String msg) {
    switch (msg) {
      case 'captcha_required':
      case 'captcha_failed':
        return 'Security check failed. Please try again.';
      case 'captcha_verification_unavailable':
        return 'Security check is temporarily unavailable. Please try again later.';
      case 'sms_not_configured':
      case 'sms_send_failed':
        return 'Phone OTP is temporarily unavailable. Sign in with email and password.';
      case 'invalid_credentials':
        return 'Incorrect email or password.';
      case 'inactive_user':
        return 'This account is inactive. Contact support.';
      case 'organization_suspended':
        return 'Your organization is suspended. Contact your administrator.';
      case 'rate_limited':
      case 'rate_limit_unavailable':
        return 'Too many attempts. Please wait a moment and try again.';
      case 'invalid_phone':
        return 'Enter a valid 10-digit Indian mobile number starting with 6–9.';
      case 'registration_required':
        return 'No account found for this number. Create an account on the web.';
      case 'google_oauth_not_configured':
        return 'Google sign-in is not configured on this server yet.';
      default:
        return msg;
    }
  }

  String _digitsOnly(String v) => v.replaceAll(RegExp(r'\D'), '');

  bool _validIndianMobile(String phone) {
    final d = _digitsOnly(phone);
    return RegExp(r'^[6-9]\d{9}$').hasMatch(d);
  }

  String _phoneForApi(String phone) => _digitsOnly(phone);

  Future<void> _finishLogin() async {
    final inviteToken = GoRouterState.of(context).uri.queryParameters['invite'];
    final landing = await completeAuthSession(ref, inviteToken: inviteToken);
    if (!mounted) return;
    context.go(landing);
  }

  Future<void> _emailSignIn() async {
    if (!_requireCaptcha()) return;
    setState(() {
      _busy = true;
      _err = null;
    });
    try {
      await ApiClient.saveBaseUrl(_apiUrl.text);
      ref.invalidate(apiClientProvider);
      final api = await ref.read(apiClientProvider.future);
      final tokens = await api.login(
        _email.text.trim(),
        _pwd.text,
        captchaToken: _captchaToken.isEmpty ? null : _captchaToken,
      );
      await api.setTokens(
        accessToken: tokens['access_token'] as String,
        refreshToken: tokens['refresh_token'] as String?,
      );
      await _finishLogin();
    } on InviteAcceptException catch (e) {
      setState(() => _err = e.message);
      _resetCaptcha();
    } catch (e) {
      setState(() => _err = _humanize(apiErrorMessage(e)));
      _resetCaptcha();
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _sendOtp() async {
    if (!_validIndianMobile(_phone.text)) {
      setState(() => _err = 'Enter a valid 10-digit Indian mobile number starting with 6–9.');
      return;
    }
    if (!_requireCaptcha()) return;
    setState(() {
      _busy = true;
      _err = null;
      _devHint = null;
    });
    try {
      await ApiClient.saveBaseUrl(_apiUrl.text);
      ref.invalidate(apiClientProvider);
      final api = await ref.read(apiClientProvider.future);
      final res = await api.requestOtp(
        phone: _phoneForApi(_phone.text),
        captchaToken: _captchaToken.isEmpty ? null : _captchaToken,
      );
      setState(() {
        _otpSent = true;
        _devHint = res['dev_hint'] as String?;
      });
      _resetCaptcha();
    } catch (e) {
      setState(() => _err = _humanize(apiErrorMessage(e)));
      _resetCaptcha();
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _verifyOtp() async {
    setState(() {
      _busy = true;
      _err = null;
    });
    try {
      final api = await ref.read(apiClientProvider.future);
      final tokens = await api.verifyOtp(
        phone: _phoneForApi(_phone.text),
        code: _otp.text.trim(),
      );
      await api.setTokens(
        accessToken: tokens['access_token'] as String,
        refreshToken: tokens['refresh_token'] as String?,
      );
      await _finishLogin();
    } on InviteAcceptException catch (e) {
      setState(() => _err = e.message);
    } catch (e) {
      setState(() => _err = _humanize(apiErrorMessage(e)));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _sendReset() async {
    if (_email.text.trim().isEmpty) {
      setState(() => _err = 'Enter your email address.');
      return;
    }
    if (!_requireCaptcha()) return;
    setState(() {
      _busy = true;
      _err = null;
      _devHint = null;
    });
    try {
      await ApiClient.saveBaseUrl(_apiUrl.text);
      ref.invalidate(apiClientProvider);
      final api = await ref.read(apiClientProvider.future);
      final res = await api.requestPasswordReset(
        _email.text.trim(),
        captchaToken: _captchaToken.isEmpty ? null : _captchaToken,
      );
      setState(() {
        _resetConfirm = true;
        _devHint = res['dev_hint'] as String?;
      });
      _resetCaptcha();
    } catch (e) {
      setState(() => _err = _humanize(apiErrorMessage(e)));
      _resetCaptcha();
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _confirmReset() async {
    if (_resetPwd.text.length < 12) {
      setState(() => _err = 'Password must be at least 12 characters.');
      return;
    }
    if (_resetPwd.text != _resetPwd2.text) {
      setState(() => _err = 'Passwords do not match.');
      return;
    }
    if (!_requireCaptcha()) return;
    setState(() {
      _busy = true;
      _err = null;
    });
    try {
      final api = await ref.read(apiClientProvider.future);
      final tokens = await api.confirmPasswordReset(
        email: _email.text.trim(),
        code: _resetCode.text.trim(),
        password: _resetPwd.text,
        captchaToken: _captchaToken.isEmpty ? null : _captchaToken,
      );
      await api.setTokens(
        accessToken: tokens['access_token'] as String,
        refreshToken: tokens['refresh_token'] as String?,
      );
      await _finishLogin();
    } catch (e) {
      setState(() => _err = _humanize(apiErrorMessage(e)));
      _resetCaptcha();
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
      await ApiClient.saveBaseUrl(_apiUrl.text);
      ref.invalidate(apiClientProvider);
      final api = await ref.read(apiClientProvider.future);
      final inviteToken = GoRouterState.of(context).uri.queryParameters['invite'];
      if (inviteToken != null) await storePendingInviteToken(inviteToken);
      final res = await api.googleAuthorize();
      final authorizeUrl = res['authorize_url'] as String?;
      if (authorizeUrl == null || authorizeUrl.isEmpty) {
        throw Exception('google_oauth_not_configured');
      }
      if (!mounted) return;
      final nav = Navigator.of(context);
      final tokens = await nav.push<Map<String, String>>(
        MaterialPageRoute(
          builder: (_) => _GoogleOAuthWebView(authorizeUrl: authorizeUrl),
        ),
      );
      if (tokens == null) {
        setState(() => _busy = false);
        return;
      }
      await api.setTokens(
        accessToken: tokens['access_token']!,
        refreshToken: tokens['refresh_token'],
      );
      await _finishLogin();
    } catch (e) {
      setState(() => _err = _humanize(apiErrorMessage(e)));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  void dispose() {
    _email.dispose();
    _pwd.dispose();
    _phone.dispose();
    _otp.dispose();
    _resetCode.dispose();
    _resetPwd.dispose();
    _resetPwd2.dispose();
    _apiUrl.dispose();
    super.dispose();
  }

  Widget _captchaSlot() {
    if (!_captchaEnabled || _siteKey == null) return const SizedBox.shrink();
    return Padding(
      padding: const EdgeInsets.only(top: 8, bottom: 4),
      child: TurnstileCaptcha(
        key: _captchaKey,
        siteKey: _siteKey!,
        onTokenChange: (t) => setState(() => _captchaToken = t),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final title = _view == _AuthView.forgot
        ? (_resetConfirm ? 'Set new password' : 'Reset password')
        : 'Welcome back';
    final subtitle = _view == _AuthView.forgot
        ? (_resetConfirm
            ? 'Enter the code from your email and choose a new password.'
            : 'We will email you a verification code.')
        : (_method == _AuthMethod.phone
            ? (_otpSent
                ? 'Enter the 6-digit code sent to your phone.'
                : 'Sign in securely with a one-time password.')
            : 'Use your email and password to access the platform.');

    return Scaffold(
      backgroundColor: const Color(0xFFF4FAF6),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.fromLTRB(20, 16, 20, 32),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Center(
                child: Image.asset(
                  'assets/brand/aranyix-logo.png',
                  height: 88,
                  fit: BoxFit.contain,
                ),
              ),
              const SizedBox(height: 20),
              Container(
                padding: const EdgeInsets.all(22),
                decoration: BoxDecoration(
                  color: Colors.white.withValues(alpha: 0.95),
                  borderRadius: BorderRadius.circular(28),
                  border: Border.all(color: Colors.white),
                  boxShadow: [
                    BoxShadow(
                      color: const Color(0xFF052E1F).withValues(alpha: 0.12),
                      blurRadius: 40,
                      offset: const Offset(0, 18),
                    ),
                  ],
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    if (_invitePreview != null) ...[
                      Container(
                        padding: const EdgeInsets.all(12),
                        margin: const EdgeInsets.only(bottom: 14),
                        decoration: BoxDecoration(
                          color: AranyixColors.forestLight,
                          borderRadius: BorderRadius.circular(14),
                        ),
                        child: Text(_invitePreview!, style: const TextStyle(fontSize: 13)),
                      ),
                    ],
                    const Text(
                      'SECURE ACCESS',
                      style: TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.w700,
                        letterSpacing: 2.2,
                        color: AranyixColors.forest,
                      ),
                    ),
                    const SizedBox(height: 6),
                    Text(
                      title,
                      style: const TextStyle(
                        fontSize: 24,
                        fontWeight: FontWeight.w700,
                        color: Color(0xFF0C0A09),
                      ),
                    ),
                    const SizedBox(height: 6),
                    Text(
                      subtitle,
                      style: const TextStyle(fontSize: 14, color: Color(0xFF57534E), height: 1.4),
                    ),
                    const SizedBox(height: 18),
                    if (_view == _AuthView.forgot)
                      _forgotBody()
                    else
                      _signinBody(),
                    if (_devHint != null) ...[
                      const SizedBox(height: 10),
                      Container(
                        padding: const EdgeInsets.all(10),
                        decoration: BoxDecoration(
                          color: const Color(0xFFFFFBEB),
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: Text(
                          'Dev hint: $_devHint',
                          style: const TextStyle(fontSize: 12, color: Color(0xFF78350F)),
                        ),
                      ),
                    ],
                    if (_err != null) ...[
                      const SizedBox(height: 10),
                      Text(_err!, style: const TextStyle(color: Color(0xFFB91C1C), fontSize: 13)),
                    ],
                  ],
                ),
              ),
              const SizedBox(height: 16),
              Theme(
                data: Theme.of(context).copyWith(dividerColor: Colors.transparent),
                child: ExpansionTile(
                  tilePadding: EdgeInsets.zero,
                  title: const Text('Advanced · API server', style: TextStyle(fontSize: 13)),
                  children: [
                    TextField(
                      controller: _apiUrl,
                      enabled: _loaded && !_busy,
                      keyboardType: TextInputType.url,
                      autocorrect: false,
                      decoration: const InputDecoration(
                        labelText: 'API server',
                        hintText: 'https://api.aranyix.tech',
                      ),
                      onEditingComplete: _loadCaptchaConfig,
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _signinBody() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        OutlinedButton.icon(
          onPressed: _busy ? null : _googleSignIn,
          icon: const Icon(Icons.g_mobiledata, size: 28),
          label: const Text('Continue with Google'),
          style: OutlinedButton.styleFrom(
            padding: const EdgeInsets.symmetric(vertical: 14),
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          ),
        ),
        const SizedBox(height: 14),
        const Row(
          children: [
            Expanded(child: Divider(color: Color(0xFFE7E5E4))),
            Padding(
              padding: EdgeInsets.symmetric(horizontal: 10),
              child: Text('OR', style: TextStyle(fontSize: 11, letterSpacing: 2, color: Colors.grey)),
            ),
            Expanded(child: Divider(color: Color(0xFFE7E5E4))),
          ],
        ),
        const SizedBox(height: 12),
        Container(
          padding: const EdgeInsets.all(4),
          decoration: BoxDecoration(
            color: const Color(0xFFF5F5F4),
            borderRadius: BorderRadius.circular(16),
          ),
          child: Row(
            children: [
              _methodTab('Phone OTP', _AuthMethod.phone, Icons.phone_outlined),
              _methodTab('Email', _AuthMethod.email, Icons.mail_outline),
            ],
          ),
        ),
        Align(
          alignment: Alignment.centerRight,
          child: TextButton(
            onPressed: _busy
                ? null
                : () => setState(() {
                      _view = _AuthView.forgot;
                      _err = null;
                      _resetConfirm = false;
                      _resetCaptcha();
                    }),
            child: const Text('Forgot password?'),
          ),
        ),
        if (_method == _AuthMethod.email) ...[
          TextField(
            controller: _email,
            keyboardType: TextInputType.emailAddress,
            autocorrect: false,
            decoration: const InputDecoration(labelText: 'Email'),
          ),
          const SizedBox(height: 10),
          TextField(
            controller: _pwd,
            obscureText: !_showPassword,
            decoration: InputDecoration(
              labelText: 'Password',
              suffixIcon: IconButton(
                icon: Icon(_showPassword ? Icons.visibility_off : Icons.visibility),
                onPressed: () => setState(() => _showPassword = !_showPassword),
              ),
            ),
          ),
          _captchaSlot(),
          const SizedBox(height: 12),
          FilledButton(
            onPressed: _busy || !_loaded ? null : _emailSignIn,
            style: FilledButton.styleFrom(
              padding: const EdgeInsets.symmetric(vertical: 14),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
            ),
            child: Text(_busy ? 'Signing in…' : 'Sign in'),
          ),
        ] else ...[
          TextField(
            controller: _phone,
            enabled: !_otpSent && !_busy,
            keyboardType: TextInputType.phone,
            decoration: const InputDecoration(
              labelText: 'Mobile number',
              prefixText: '+91  ',
              helperText: '10-digit mobile. Do not include +91.',
            ),
          ),
          if (_otpSent) ...[
            const SizedBox(height: 10),
            TextField(
              controller: _otp,
              keyboardType: TextInputType.number,
              maxLength: 6,
              textAlign: TextAlign.center,
              style: const TextStyle(letterSpacing: 8, fontSize: 18),
              decoration: const InputDecoration(labelText: 'One-time password', counterText: ''),
            ),
          ] else
            _captchaSlot(),
          const SizedBox(height: 12),
          FilledButton(
            onPressed: _busy || !_loaded
                ? null
                : (_otpSent ? _verifyOtp : _sendOtp),
            style: FilledButton.styleFrom(
              padding: const EdgeInsets.symmetric(vertical: 14),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
            ),
            child: Text(
              _busy
                  ? 'Please wait…'
                  : (_otpSent ? 'Verify & sign in' : 'Send OTP'),
            ),
          ),
          if (_otpSent)
            TextButton(
              onPressed: _busy
                  ? null
                  : () => setState(() {
                        _otpSent = false;
                        _otp.clear();
                        _devHint = null;
                        _resetCaptcha();
                      }),
              child: const Text('Use a different number'),
            ),
        ],
      ],
    );
  }

  Widget _forgotBody() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Align(
          alignment: Alignment.centerLeft,
          child: TextButton.icon(
            onPressed: _busy
                ? null
                : () => setState(() {
                      _view = _AuthView.signin;
                      _resetConfirm = false;
                      _err = null;
                      _devHint = null;
                      _resetCaptcha();
                    }),
            icon: const Icon(Icons.arrow_back, size: 18),
            label: const Text('Back to sign in'),
          ),
        ),
        TextField(
          controller: _email,
          enabled: !_resetConfirm,
          keyboardType: TextInputType.emailAddress,
          decoration: const InputDecoration(labelText: 'Email'),
        ),
        if (_resetConfirm) ...[
          const SizedBox(height: 10),
          TextField(
            controller: _resetCode,
            keyboardType: TextInputType.number,
            decoration: const InputDecoration(labelText: 'Verification code'),
          ),
          const SizedBox(height: 10),
          TextField(
            controller: _resetPwd,
            obscureText: true,
            decoration: const InputDecoration(
              labelText: 'New password',
              helperText: 'At least 12 characters',
            ),
          ),
          const SizedBox(height: 10),
          TextField(
            controller: _resetPwd2,
            obscureText: true,
            decoration: const InputDecoration(labelText: 'Confirm password'),
          ),
        ],
        _captchaSlot(),
        const SizedBox(height: 12),
        FilledButton(
          onPressed: _busy || !_loaded
              ? null
              : (_resetConfirm ? _confirmReset : _sendReset),
          style: FilledButton.styleFrom(
            padding: const EdgeInsets.symmetric(vertical: 14),
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          ),
          child: Text(
            _busy
                ? 'Please wait…'
                : (_resetConfirm ? 'Update password & sign in' : 'Send reset code'),
          ),
        ),
      ],
    );
  }

  Widget _methodTab(String label, _AuthMethod method, IconData icon) {
    final active = _method == method;
    return Expanded(
      child: Material(
        color: active ? Colors.white : Colors.transparent,
        borderRadius: BorderRadius.circular(12),
        child: InkWell(
          borderRadius: BorderRadius.circular(12),
          onTap: _busy
              ? null
              : () => setState(() {
                    _method = method;
                    _otpSent = false;
                    _otp.clear();
                    _err = null;
                    _devHint = null;
                    _resetCaptcha();
                  }),
          child: Padding(
            padding: const EdgeInsets.symmetric(vertical: 10),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(icon, size: 16, color: active ? AranyixColors.forestDark : Colors.grey),
                const SizedBox(width: 6),
                Text(
                  label,
                  style: TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w600,
                    color: active ? const Color(0xFF1C1917) : Colors.grey,
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

/// In-app Google OAuth; intercepts web callback hash tokens.
class _GoogleOAuthWebView extends StatefulWidget {
  const _GoogleOAuthWebView({required this.authorizeUrl});
  final String authorizeUrl;

  @override
  State<_GoogleOAuthWebView> createState() => _GoogleOAuthWebViewState();
}

class _GoogleOAuthWebViewState extends State<_GoogleOAuthWebView> {
  late final WebViewController _controller;

  @override
  void initState() {
    super.initState();
    _controller = WebViewController()
      ..setJavaScriptMode(JavaScriptMode.unrestricted)
      ..setNavigationDelegate(
        NavigationDelegate(
          onNavigationRequest: (request) {
            final uri = Uri.tryParse(request.url);
            if (uri != null && uri.path.contains('/auth/callback')) {
              final fragment = uri.fragment;
              final params = Uri.splitQueryString(fragment);
              final access = params['access_token'];
              if (access != null && access.isNotEmpty) {
                Navigator.of(context).pop({
                  'access_token': access,
                  if (params['refresh_token'] != null) 'refresh_token': params['refresh_token']!,
                });
                return NavigationDecision.prevent;
              }
            }
            return NavigationDecision.navigate;
          },
          onUrlChange: (change) {
            final url = change.url;
            if (url == null) return;
            final uri = Uri.tryParse(url);
            if (uri == null || !uri.path.contains('/auth/callback')) return;
            final params = Uri.splitQueryString(uri.fragment);
            final access = params['access_token'];
            if (access != null && access.isNotEmpty && mounted) {
              Navigator.of(context).pop({
                'access_token': access,
                if (params['refresh_token'] != null) 'refresh_token': params['refresh_token']!,
              });
            }
          },
        ),
      )
      ..loadRequest(Uri.parse(widget.authorizeUrl));
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Google sign-in'),
        leading: IconButton(
          icon: const Icon(Icons.close),
          onPressed: () => Navigator.of(context).pop(),
        ),
      ),
      body: WebViewWidget(controller: _controller),
    );
  }
}
