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
import '../widgets/auth_light_scope.dart';
import '../widgets/auth_scaffold.dart';
import '../widgets/mobile_auth_security.dart';
import '../widgets/otp_input.dart';
import '../widgets/turnstile_captcha.dart';

enum _SignupStep { account, verifyPhone, verifyEmail }

/// Lightweight registration — account details → phone OTP → email OTP.
class SignupScreen extends ConsumerStatefulWidget {
  const SignupScreen({super.key});

  @override
  ConsumerState<SignupScreen> createState() => _SignupScreenState();
}

class _SignupScreenState extends ConsumerState<SignupScreen> {
  _SignupStep _step = _SignupStep.account;
  bool _busy = false;
  String? _error;
  String? _devHint;

  String _category = 'byot';
  final _name = TextEditingController();
  final _email = TextEditingController();
  final _phone = TextEditingController();
  final _password = TextEditingController();
  bool _acceptedTerms = false;
  bool _obscurePassword = true;

  String _signupToken = '';
  String _phoneOtp = '';
  String _emailOtp = '';

  bool _captchaEnabled = false;
  bool _skipCaptchaForMobile = false;
  String? _captchaSiteKey;
  String? _captchaToken;
  final _captchaKey = GlobalKey<TurnstileCaptchaState>();

  bool get _needsCaptchaWidget => _captchaEnabled && !_skipCaptchaForMobile;

  bool get _needsCaptchaToken => _captchaEnabled && !_skipCaptchaForMobile;

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
        _skipCaptchaForMobile = cfg['skip_for_mobile'] == true;
        _captchaSiteKey = cfg['site_key'] as String?;
      });
    } catch (_) {}
  }

  double get _progress {
    return switch (_step) {
      _SignupStep.account => 0.34,
      _SignupStep.verifyPhone => 0.67,
      _SignupStep.verifyEmail => 1.0,
    };
  }

  String get _stepLabel {
    return switch (_step) {
      _SignupStep.account => 'Step 1 of 3',
      _SignupStep.verifyPhone => 'Step 2 of 3',
      _SignupStep.verifyEmail => 'Step 3 of 3',
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
      setState(() => _error = 'Please accept the terms to continue.');
      return;
    }
    if (_needsCaptchaToken && (_captchaToken == null || _captchaToken!.isEmpty)) {
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
      setState(() {
        _error = apiErrorMessage(e);
        _captchaToken = null;
      });
      _captchaKey.currentState?.reset();
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
    return AuthLightScope(
      child: AuthScaffold(
        compact: true,
        title: switch (_step) {
          _SignupStep.account => 'Create account',
          _SignupStep.verifyPhone => 'Verify phone',
          _SignupStep.verifyEmail => 'Verify email',
        },
        subtitle: switch (_step) {
          _SignupStep.account => 'A few details — then quick OTP checks.',
          _SignupStep.verifyPhone =>
            'Code sent to ${formatPhoneDisplay(_phone.text)}',
          _SignupStep.verifyEmail => 'Code sent to ${_email.text.trim()}',
        },
        stepLabel: _stepLabel,
        stepProgress: _progress,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: _busy
              ? null
              : () {
                  if (_step == _SignupStep.account) {
                    context.pop();
                  } else {
                    setState(() {
                      _error = null;
                      _step = switch (_step) {
                        _SignupStep.verifyPhone => _SignupStep.account,
                        _SignupStep.verifyEmail => _SignupStep.verifyPhone,
                        _ => _SignupStep.account,
                      };
                    });
                  }
                },
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            if (_step == _SignupStep.account) ...[
              _buildAccountStep(),
              const SizedBox(height: 12),
              if (_captchaEnabled && _skipCaptchaForMobile)
                const MobileAuthSecurityNote()
              else if (_needsCaptchaWidget && _captchaSiteKey != null)
                TurnstileCaptcha(
                  key: _captchaKey,
                  siteKey: _captchaSiteKey!,
                  onToken: (token) => setState(() {
                    _captchaToken = token;
                    _error = null;
                  }),
                  onError: () => setState(() => _captchaToken = null),
                  onExpired: () => setState(() => _captchaToken = null),
                ),
            ],
            if (_step == _SignupStep.verifyPhone) _buildOtpStep(isPhone: true),
            if (_step == _SignupStep.verifyEmail) _buildOtpStep(isPhone: false),
            if (_error != null) ...[
              const SizedBox(height: 12),
              AuthErrorBanner(message: _error!),
            ],
            if (_devHint != null) ...[
              const SizedBox(height: 8),
              Text(
                'Dev hint: $_devHint',
                style: const TextStyle(fontSize: 12, color: AranyixColors.onSurfaceMuted),
              ),
            ],
            const SizedBox(height: 18),
            if (_step == _SignupStep.account)
              FilledButton(
                onPressed: _busy ? null : _startSignup,
                child: Text(_busy ? 'Creating…' : 'Continue'),
              )
            else if (_step == _SignupStep.verifyPhone)
              FilledButton(
                onPressed: _busy ? null : _verifyPhone,
                child: Text(_busy ? 'Verifying…' : 'Verify phone'),
              )
            else
              FilledButton(
                onPressed: _busy ? null : _completeSignup,
                child: Text(_busy ? 'Finishing…' : 'Finish'),
              ),
            const SizedBox(height: 8),
            TextButton(
              onPressed: _busy ? null : () => context.go('/login'),
              child: const Text('Already have an account? Sign in'),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildAccountStep() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Text(
          'I am joining as',
          style: Theme.of(context).textTheme.labelLarge?.copyWith(
                color: AranyixColors.onSurfaceMuted,
                fontWeight: FontWeight.w600,
              ),
        ),
        const SizedBox(height: 10),
        GridView.count(
          crossAxisCount: 2,
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          mainAxisSpacing: 8,
          crossAxisSpacing: 8,
          childAspectRatio: 2.35,
          children: [
            for (final cat in signupCategories)
              _CategoryChip(
                category: cat,
                selected: _category == cat.code,
                onTap: () => setState(() => _category = cat.code),
              ),
          ],
        ),
        const SizedBox(height: 18),
        TextField(
          controller: _name,
          textCapitalization: TextCapitalization.words,
          textInputAction: TextInputAction.next,
          decoration: const InputDecoration(
            labelText: 'Full name',
            prefixIcon: Icon(Icons.person_outline, size: 20),
          ),
        ),
        const SizedBox(height: 10),
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
        const SizedBox(height: 10),
        TextField(
          controller: _phone,
          keyboardType: TextInputType.phone,
          textInputAction: TextInputAction.next,
          decoration: const InputDecoration(
            labelText: 'Mobile',
            prefixText: '+91  ',
            hintText: '98765 43210',
            prefixIcon: Icon(Icons.phone_iphone, size: 20),
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
        const SizedBox(height: 10),
        TextField(
          controller: _password,
          obscureText: _obscurePassword,
          textInputAction: TextInputAction.done,
          decoration: InputDecoration(
            labelText: 'Password',
            helperText: 'Min. 12 characters',
            helperMaxLines: 1,
            prefixIcon: const Icon(Icons.lock_outline, size: 20),
            suffixIcon: IconButton(
              onPressed: () => setState(() => _obscurePassword = !_obscurePassword),
              icon: Icon(
                _obscurePassword ? Icons.visibility_outlined : Icons.visibility_off_outlined,
                size: 20,
              ),
            ),
          ),
        ),
        const SizedBox(height: 4),
        InkWell(
          onTap: () => setState(() => _acceptedTerms = !_acceptedTerms),
          borderRadius: BorderRadius.circular(10),
          child: Padding(
            padding: const EdgeInsets.symmetric(vertical: 6),
            child: Row(
              children: [
                SizedBox(
                  width: 24,
                  height: 24,
                  child: Checkbox(
                    value: _acceptedTerms,
                    onChanged: (v) => setState(() => _acceptedTerms = v ?? false),
                    materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
                  ),
                ),
                const SizedBox(width: 10),
                const Expanded(
                  child: Text(
                    'I agree to the Terms & Privacy Policy',
                    style: TextStyle(fontSize: 13.5, height: 1.3),
                  ),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildOtpStep({required bool isPhone}) {
    return Column(
      children: [
        Container(
          width: double.infinity,
          padding: const EdgeInsets.symmetric(vertical: 18, horizontal: 16),
          decoration: BoxDecoration(
            color: AranyixColors.forestLight,
            borderRadius: BorderRadius.circular(AranyixRadii.card),
          ),
          child: Column(
            children: [
              Icon(
                isPhone ? Icons.sms_outlined : Icons.mark_email_read_outlined,
                color: AranyixColors.forest,
                size: 36,
              ),
              const SizedBox(height: 10),
              Text(
                isPhone ? 'Enter the 6-digit SMS code' : 'Enter the 6-digit email code',
                textAlign: TextAlign.center,
                style: const TextStyle(
                  fontWeight: FontWeight.w600,
                  color: AranyixColors.forestDark,
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 20),
        OtpInput(
          length: 6,
          enabled: !_busy,
          onChanged: (v) => setState(() {
            if (isPhone) {
              _phoneOtp = v;
            } else {
              _emailOtp = v;
            }
          }),
        ),
      ],
    );
  }
}

class _CategoryChip extends StatelessWidget {
  const _CategoryChip({
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
      color: selected ? AranyixColors.forestLight : Colors.white,
      borderRadius: BorderRadius.circular(14),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(14),
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 160),
          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(14),
            border: Border.all(
              color: selected ? AranyixColors.forest : AranyixColors.border,
              width: selected ? 1.5 : 1,
            ),
          ),
          child: Row(
            children: [
              Icon(
                category.icon,
                size: 18,
                color: selected ? AranyixColors.forest : AranyixColors.onSurfaceMuted,
              ),
              const SizedBox(width: 8),
              Expanded(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      category.title,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(
                        fontWeight: FontWeight.w700,
                        fontSize: 13,
                        color: selected ? AranyixColors.forestDark : AranyixColors.onSurface,
                      ),
                    ),
                    Text(
                      category.hint,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(
                        fontSize: 11,
                        color: selected
                            ? AranyixColors.forest.withValues(alpha: 0.85)
                            : AranyixColors.onSurfaceMuted,
                      ),
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
}
