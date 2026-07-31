import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../api/api_errors.dart';
import '../auth/auth_messages.dart';
import '../auth/phone_utils.dart';
import '../auth/signup_catalog.dart';
import '../auth_session.dart';
import '../providers.dart';
import '../theme.dart';
import '../widgets/auth_scaffold.dart';
import '../widgets/otp_input.dart';
import '../widgets/turnstile_captcha.dart';

enum _SignupStep { category, details, verifyPhone, verifyEmail }

/// In-app registration — mirrors web signup wizard (category → details → OTPs).
class SignupScreen extends ConsumerStatefulWidget {
  const SignupScreen({super.key});

  @override
  ConsumerState<SignupScreen> createState() => _SignupScreenState();
}

class _SignupScreenState extends ConsumerState<SignupScreen> {
  _SignupStep _step = _SignupStep.category;
  bool _busy = false;
  String? _error;
  String? _devHint;

  String _category = 'byot';
  final _name = TextEditingController();
  final _email = TextEditingController();
  final _phone = TextEditingController();
  final _password = TextEditingController();
  bool _acceptedTerms = false;

  String _signupToken = '';
  String _phoneOtp = '';
  String _emailOtp = '';

  bool _captchaEnabled = false;
  String? _captchaSiteKey;
  String? _captchaToken;

  @override
  void initState() {
    super.initState();
    _loadCaptchaConfig();
  }

  Future<void> _loadCaptchaConfig() async {
    try {
      final api = await ref.read(apiClientProvider.future);
      final cfg = await api.captchaConfig();
      if (!mounted) return;
      setState(() {
        _captchaEnabled = cfg['enabled'] == true;
        _captchaSiteKey = cfg['site_key'] as String?;
      });
    } catch (_) {
      // Optional — signup may work without captcha in dev.
    }
  }

  double get _progress {
    return switch (_step) {
      _SignupStep.category => 0.25,
      _SignupStep.details => 0.5,
      _SignupStep.verifyPhone => 0.75,
      _SignupStep.verifyEmail => 1.0,
    };
  }

  String get _stepLabel {
    return switch (_step) {
      _SignupStep.category => 'Step 1 of 4',
      _SignupStep.details => 'Step 2 of 4',
      _SignupStep.verifyPhone => 'Step 3 of 4',
      _SignupStep.verifyEmail => 'Step 4 of 4',
    };
  }

  Future<void> _startSignup() async {
    if (_name.text.trim().length < 2) {
      setState(() => _error = 'Please enter your full name.');
      return;
    }
    if (!_email.text.contains('@')) {
      setState(() => _error = 'Please enter a valid email address.');
      return;
    }
    if (!isValidIndianMobile(_phone.text)) {
      setState(() => _error = humanizeAuthError('invalid_phone'));
      return;
    }
    if (_password.text.length < 12) {
      setState(() => _error = 'Password must be at least 12 characters.');
      return;
    }
    if (!_acceptedTerms) {
      setState(() => _error = 'Please accept the terms to create an account.');
      return;
    }
    if (_captchaEnabled && (_captchaToken == null || _captchaToken!.isEmpty)) {
      setState(() => _error = humanizeAuthError('captcha_required'));
      return;
    }

    setState(() {
      _busy = true;
      _error = null;
      _devHint = null;
    });
    try {
      final api = await ref.read(apiClientProvider.future);
      final res = await api.signupStart(
        fullName: _name.text.trim(),
        email: _email.text.trim(),
        phone: phoneForApi(_phone.text),
        password: _password.text,
        signupCategory: _category,
        captchaToken: _captchaToken,
      );
      setState(() {
        _signupToken = res['signup_token'] as String;
        _devHint = res['dev_hint'] as String?;
        _step = _SignupStep.verifyPhone;
      });
    } catch (e) {
      setState(() => _error = apiErrorMessage(e));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _verifyPhone() async {
    if (_phoneOtp.length < 4) {
      setState(() => _error = 'Enter the code sent to your phone.');
      return;
    }
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      final api = await ref.read(apiClientProvider.future);
      await api.signupVerifyPhone(signupToken: _signupToken, code: _phoneOtp);
      final emailRes = await api.signupSendEmailOtp(_signupToken);
      setState(() {
        _devHint = emailRes['dev_hint'] as String?;
        _step = _SignupStep.verifyEmail;
        _emailOtp = '';
      });
    } catch (e) {
      setState(() => _error = apiErrorMessage(e));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _completeSignup() async {
    if (_emailOtp.length < 4) {
      setState(() => _error = 'Enter the code sent to your email.');
      return;
    }
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      final api = await ref.read(apiClientProvider.future);
      final tokens = await api.signupComplete(signupToken: _signupToken, code: _emailOtp);
      await api.setTokens(
        accessToken: tokens['access_token'] as String,
        refreshToken: tokens['refresh_token'] as String?,
      );
      final landing = await completeAuthSession(ref, afterSignup: true);
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
    _name.dispose();
    _email.dispose();
    _phone.dispose();
    _password.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AuthScaffold(
      title: switch (_step) {
        _SignupStep.category => 'Join Aranyix',
        _SignupStep.details => 'Your details',
        _SignupStep.verifyPhone => 'Verify phone',
        _SignupStep.verifyEmail => 'Verify email',
      },
      subtitle: switch (_step) {
        _SignupStep.category => 'Choose how you will use the platform.',
        _SignupStep.details => 'We will send OTP codes to verify your phone and email.',
        _SignupStep.verifyPhone => 'Enter the 6-digit code sent to ${formatPhoneDisplay(_phone.text)}.',
        _SignupStep.verifyEmail => 'Enter the code sent to ${_email.text.trim()}.',
      },
      stepLabel: _stepLabel,
      stepProgress: _progress,
      leading: IconButton(
        icon: const Icon(Icons.arrow_back),
        onPressed: _busy
            ? null
            : () {
                if (_step == _SignupStep.category) {
                  context.pop();
                } else {
                  setState(() {
                    _error = null;
                    _step = switch (_step) {
                      _SignupStep.details => _SignupStep.category,
                      _SignupStep.verifyPhone => _SignupStep.details,
                      _SignupStep.verifyEmail => _SignupStep.verifyPhone,
                      _ => _SignupStep.category,
                    };
                  });
                }
              },
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          if (_step == _SignupStep.category) _buildCategoryStep(),
          if (_step == _SignupStep.details) _buildDetailsStep(),
          if (_step == _SignupStep.verifyPhone) _buildPhoneOtpStep(),
          if (_step == _SignupStep.verifyEmail) _buildEmailOtpStep(),
          if (_error != null) ...[
            const SizedBox(height: 12),
            Text(_error!, style: const TextStyle(color: Colors.red)),
          ],
          if (_devHint != null) ...[
            const SizedBox(height: 8),
            Text(
              'Dev hint: $_devHint',
              style: const TextStyle(fontSize: 12, color: AranyixColors.onSurfaceMuted),
            ),
          ],
          const SizedBox(height: 20),
          if (_step == _SignupStep.category)
            FilledButton(
              onPressed: _busy ? null : () => setState(() => _step = _SignupStep.details),
              child: const Text('Continue'),
            )
          else if (_step == _SignupStep.details)
            FilledButton(
              onPressed: _busy ? null : _startSignup,
              child: Text(_busy ? 'Creating account…' : 'Send verification codes'),
            )
          else if (_step == _SignupStep.verifyPhone)
            FilledButton(
              onPressed: _busy ? null : _verifyPhone,
              child: Text(_busy ? 'Verifying…' : 'Verify phone'),
            )
          else
            FilledButton(
              onPressed: _busy ? null : _completeSignup,
              child: Text(_busy ? 'Finishing…' : 'Complete registration'),
            ),
          const SizedBox(height: 12),
          TextButton(
            onPressed: _busy ? null : () => context.go('/login'),
            child: const Text('Already have an account? Sign in'),
          ),
        ],
      ),
    );
  }

  Widget _buildCategoryStep() {
    return Column(
      children: [
        for (final cat in signupCategories) ...[
          _CategoryCard(
            category: cat,
            selected: _category == cat.code,
            onTap: () => setState(() => _category = cat.code),
          ),
          const SizedBox(height: 10),
        ],
      ],
    );
  }

  Widget _buildDetailsStep() {
    return Column(
      children: [
        TextField(
          controller: _name,
          textCapitalization: TextCapitalization.words,
          decoration: const InputDecoration(labelText: 'Full name'),
        ),
        const SizedBox(height: 12),
        TextField(
          controller: _email,
          keyboardType: TextInputType.emailAddress,
          autocorrect: false,
          decoration: const InputDecoration(labelText: 'Work or personal email'),
        ),
        const SizedBox(height: 12),
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
        const SizedBox(height: 12),
        TextField(
          controller: _password,
          obscureText: true,
          decoration: const InputDecoration(
            labelText: 'Password',
            helperText: 'At least 12 characters',
          ),
        ),
        const SizedBox(height: 12),
        CheckboxListTile(
          value: _acceptedTerms,
          onChanged: (v) => setState(() => _acceptedTerms = v ?? false),
          contentPadding: EdgeInsets.zero,
          controlAffinity: ListTileControlAffinity.leading,
          title: const Text(
            'I agree to Aranyix terms and privacy policy',
            style: TextStyle(fontSize: 14),
          ),
        ),
        if (_captchaEnabled && _captchaSiteKey != null) ...[
          const SizedBox(height: 8),
          TurnstileCaptcha(
            siteKey: _captchaSiteKey!,
            onToken: (t) => setState(() => _captchaToken = t),
            onError: () => setState(() => _captchaToken = null),
          ),
        ],
      ],
    );
  }

  Widget _buildPhoneOtpStep() {
    return Column(
      children: [
        OtpInput(
          length: 6,
          enabled: !_busy,
          onChanged: (v) => setState(() => _phoneOtp = v),
        ),
      ],
    );
  }

  Widget _buildEmailOtpStep() {
    return Column(
      children: [
        OtpInput(
          length: 6,
          enabled: !_busy,
          onChanged: (v) => setState(() => _emailOtp = v),
        ),
      ],
    );
  }
}

class _CategoryCard extends StatelessWidget {
  const _CategoryCard({
    required this.category,
    required this.selected,
    required this.onTap,
  });

  final SignupCategory category;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: selected ? AranyixColors.forestLight : AranyixColors.surfaceContainer,
      borderRadius: BorderRadius.circular(AranyixRadii.card),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(AranyixRadii.card),
        child: Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(AranyixRadii.card),
            border: Border.all(
              color: selected ? AranyixColors.forest : Colors.black.withValues(alpha: 0.06),
              width: selected ? 2 : 1,
            ),
          ),
          child: Row(
            children: [
              Text(category.emoji, style: const TextStyle(fontSize: 28)),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(category.title, style: const TextStyle(fontWeight: FontWeight.w600)),
                    const SizedBox(height: 2),
                    Text(category.subtitle, style: Theme.of(context).textTheme.bodySmall),
                    const SizedBox(height: 4),
                    Text(
                      category.audience,
                      style: const TextStyle(fontSize: 11, color: AranyixColors.onSurfaceMuted),
                    ),
                  ],
                ),
              ),
              if (selected)
                const Icon(Icons.check_circle, color: AranyixColors.forest),
            ],
          ),
        ),
      ),
    );
  }
}
