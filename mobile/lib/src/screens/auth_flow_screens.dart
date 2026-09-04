import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../api/api_errors.dart';
import '../auth/google_oauth.dart';
import '../auth/phone_utils.dart';
import '../auth/post_auth_redirect.dart';
import '../auth_session.dart';
import '../providers.dart';
import '../theme.dart';
import '../widgets/auth_light_scope.dart';
import '../widgets/auth_scaffold.dart';
import '../widgets/otp_input.dart';
import '../widgets/turnstile_captcha.dart';
import '../widgets/mobile_auth_security.dart';
import '../l10n/l10n_ext.dart';

/// Handles deep links: `https://aranyix.tech/auth/callback#access_token=…`
class AuthCallbackScreen extends ConsumerStatefulWidget {
  const AuthCallbackScreen({super.key, required this.uri});

  final Uri uri;

  @override
  ConsumerState<AuthCallbackScreen> createState() => _AuthCallbackScreenState();
}

class _AuthCallbackScreenState extends ConsumerState<AuthCallbackScreen> {
  String? _error;

  @override
  void initState() {
    super.initState();
    Future.microtask(_complete);
  }

  Future<void> _complete() async {
    final tokens = parseOAuthCallbackUri(widget.uri);
    if (tokens == null) {
      setState(() => _error = 'Google sign-in did not return tokens.');
      return;
    }
    try {
      final api = await ref.read(apiClientProvider.future);
      await api.setTokens(
        accessToken: tokens['access_token']!,
        refreshToken: tokens['refresh_token'],
      );
      final landing = await completeAuthSession(
        ref,
        postAuthNext: sanitizePostAuthPath(
          GoRouterState.of(context).uri.queryParameters['next'],
        ),
      );
      if (!mounted) return;
      context.go(landing);
    } catch (e) {
      setState(() => _error = apiErrorMessage(e));
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    return Scaffold(
      body: Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              if (_error == null) ...[
                const CircularProgressIndicator(),
                const SizedBox(height: 16),
                Text(l10n.completingSignIn),
              ] else ...[
                Text(_error!, textAlign: TextAlign.center),
                const SizedBox(height: 16),
                FilledButton(
                  onPressed: () => context.go('/login'),
                  child: Text(l10n.backToSignIn),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}

/// Two-step password reset (email OTP → new password).
class ForgotPasswordScreen extends ConsumerStatefulWidget {
  const ForgotPasswordScreen({super.key});

  @override
  ConsumerState<ForgotPasswordScreen> createState() => _ForgotPasswordScreenState();
}

class _ForgotPasswordScreenState extends ConsumerState<ForgotPasswordScreen> {
  final _email = TextEditingController();
  final _password = TextEditingController();
  String _otp = '';
  bool _step2 = false;
  bool _busy = false;
  String? _error;
  String? _devHint;

  Future<void> _requestCode() async {
    if (!_email.text.contains('@')) {
      setState(() => _error = 'Enter a valid email address.');
      return;
    }
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      final api = await ref.read(apiClientProvider.future);
      final res = await api.requestPasswordReset(
        email: _email.text.trim(),
      );
      setState(() {
        if (kDebugMode) {
          _devHint = res['dev_hint'] as String?;
        }
        _step2 = true;
      });
    } catch (e) {
      setState(() => _error = apiErrorMessage(e));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _confirmReset() async {
    if (_otp.length < 4) {
      setState(() => _error = 'Enter the verification code from your email.');
      return;
    }
    if (_password.text.length < 12) {
      setState(() => _error = 'Password must be at least 12 characters.');
      return;
    }
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      final api = await ref.read(apiClientProvider.future);
      final tokens = await api.confirmPasswordReset(
        email: _email.text.trim(),
        code: _otp,
        password: _password.text,
      );
      await api.setTokens(
        accessToken: tokens['access_token'] as String,
        refreshToken: tokens['refresh_token'] as String?,
      );
      final landing = await completeAuthSession(
        ref,
        postAuthNext: sanitizePostAuthPath(
          GoRouterState.of(context).uri.queryParameters['next'],
        ),
      );
      if (!mounted) return;
      context.go(landing);
    } catch (e) {
      setState(() => _error = apiErrorMessage(e));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  void dispose() {
    _email.dispose();
    _password.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    return AuthLightScope(
      child: AuthScaffold(
      title: _step2 ? l10n.passwordLabel : l10n.forgotPassword,
      subtitle: _step2
          ? 'Enter the code sent to ${_email.text.trim()} and choose a new password.'
          : 'We will email you a one-time code to reset your password.',
      leading: IconButton(
        icon: const Icon(Icons.arrow_back),
        onPressed: _busy ? null : () => context.pop(),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          if (!_step2) ...[
            TextField(
              controller: _email,
              keyboardType: TextInputType.emailAddress,
              decoration: InputDecoration(labelText: l10n.emailLabel),
            ),
          ] else ...[
            OtpInput(length: 6, enabled: !_busy, onChanged: (v) => setState(() => _otp = v)),
            const SizedBox(height: 16),
            TextField(
              controller: _password,
              obscureText: true,
              decoration: InputDecoration(
                labelText: l10n.passwordLabel,
                helperText: 'At least 12 characters',
              ),
            ),
          ],
          if (_error != null) ...[
            const SizedBox(height: 12),
            AuthErrorBanner(message: _error!),
          ],
          if (_devHint != null && kDebugMode) ...[
            const SizedBox(height: 8),
            Text(l10n.devHint(_devHint!), style: Theme.of(context).textTheme.bodySmall),
          ],
          const SizedBox(height: 20),
          FilledButton(
            onPressed: _busy ? null : (_step2 ? _confirmReset : _requestCode),
            child: Text(_busy
                ? 'Please wait…'
                : _step2
                    ? 'Update password'
                    : 'Send reset code'),
          ),
        ],
      ),
    ),
    );
  }
}

/// Phone OTP sign-in — works when SMS API is live; shows clear message when not.
class PhoneOtpLoginPanel extends ConsumerStatefulWidget {
  const PhoneOtpLoginPanel({
    super.key,
    required this.onSwitchToEmail,
    this.captchaEnabled = false,
    this.skipCaptchaForMobile = false,
    this.captchaSiteKey,
    this.captchaToken,
    this.onCaptchaToken,
    this.onCaptchaError,
    this.postAuthNext,
  });

  final VoidCallback onSwitchToEmail;
  final bool captchaEnabled;
  final bool skipCaptchaForMobile;
  final String? captchaSiteKey;
  final String? captchaToken;
  final ValueChanged<String>? onCaptchaToken;
  final VoidCallback? onCaptchaError;
  final String? postAuthNext;

  bool get _needsCaptchaToken => captchaEnabled && !skipCaptchaForMobile;

  @override
  ConsumerState<PhoneOtpLoginPanel> createState() => _PhoneOtpLoginPanelState();
}

class _PhoneOtpLoginPanelState extends ConsumerState<PhoneOtpLoginPanel> {
  final _phone = TextEditingController();
  String _otp = '';
  bool _codeSent = false;
  bool _busy = false;
  String? _error;
  String? _devHint;

  Future<void> _sendCode() async {
    if (!isValidIndianMobile(_phone.text)) {
      setState(() => _error = 'Enter a valid 10-digit Indian mobile number.');
      return;
    }
    if (widget._needsCaptchaToken &&
        (widget.captchaToken == null || widget.captchaToken!.isEmpty)) {
      setState(() => _error = 'Complete the security check before continuing.');
      return;
    }
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      final api = await ref.read(apiClientProvider.future);
      final res = await api.requestOtp(
        phone: phoneForApi(_phone.text),
        captchaToken: widget.captchaToken,
      );
      setState(() {
        _codeSent = true;
        if (kDebugMode) {
          _devHint = res['dev_hint'] as String?;
        }
      });
    } catch (e) {
      setState(() => _error = apiErrorMessage(e));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _verify() async {
    if (_otp.length < 4) {
      setState(() => _error = 'Enter the code from your SMS.');
      return;
    }
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      final api = await ref.read(apiClientProvider.future);
      final tokens = await api.verifyOtp(
        phone: phoneForApi(_phone.text),
        code: _otp,
      );
      await api.setTokens(
        accessToken: tokens['access_token'] as String,
        refreshToken: tokens['refresh_token'] as String?,
      );
      final landing = await completeAuthSession(
        ref,
        postAuthNext: widget.postAuthNext,
      );
      if (!mounted) return;
      context.go(landing);
    } catch (e) {
      setState(() => _error = apiErrorMessage(e));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  void dispose() {
    _phone.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        if (!_codeSent) ...[
          TextField(
            controller: _phone,
            keyboardType: TextInputType.phone,
            decoration: const InputDecoration(
              labelText: 'Mobile (+91)',
              hintText: '10-digit number',
            ),
            onChanged: (v) {
              final d = sanitizePhoneDigits(v);
              if (d != v) {
                _phone.value = TextEditingValue(
                  text: d,
                  selection: TextSelection.collapsed(offset: d.length),
                );
              }
            },
          ),
          const SizedBox(height: 8),
          Text(
            'SMS OTP will work once your server has MSG91/SMS configured. Until then, use email sign-in.',
            style: Theme.of(context).textTheme.bodySmall?.copyWith(
                  color: AranyixColors.onSurfaceMuted,
                ),
          ),
        ] else ...[
          Text(
            'Code sent to ${formatPhoneDisplay(_phone.text)}',
            style: Theme.of(context).textTheme.bodyMedium,
          ),
          const SizedBox(height: 16),
          OtpInput(length: 6, enabled: !_busy, onChanged: (v) => setState(() => _otp = v)),
        ],
        if (_error != null) ...[
          const SizedBox(height: 12),
          AuthErrorBanner(message: _error!),
        ],
        if (_devHint != null && kDebugMode) ...[
          const SizedBox(height: 8),
          Text(l10n.devHint(_devHint!), style: Theme.of(context).textTheme.bodySmall),
        ],
        if (widget.captchaEnabled && widget.skipCaptchaForMobile)
          const MobileAuthSecurityNote()
        else if (widget._needsCaptchaToken && widget.captchaSiteKey != null) ...[
          const SizedBox(height: 12),
          TurnstileCaptcha(
            siteKey: widget.captchaSiteKey!,
            onToken: (token) => widget.onCaptchaToken?.call(token),
            onError: widget.onCaptchaError,
            onExpired: widget.onCaptchaError,
          ),
        ],
        const SizedBox(height: 16),
        FilledButton(
          onPressed: _busy ? null : (_codeSent ? _verify : _sendCode),
          child: Text(_busy
              ? l10n.saving
              : _codeSent
                  ? l10n.signIn
                  : 'Send SMS code'),
        ),
        TextButton(
          onPressed: _busy ? null : widget.onSwitchToEmail,
          child: Text(l10n.useEmailInstead),
        ),
      ],
    );
  }
}
