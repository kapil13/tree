/// Human-readable auth error messages (mirrors web signup wizard).

String humanizeAuthError(String code) {
  const map = {
    'email_taken': 'This email is already registered. Try signing in.',
    'phone_taken': 'This phone number is already registered.',
    'invalid_phone': 'Enter a valid 10-digit Indian mobile number starting with 6–9.',
    'invalid_otp': 'Invalid code. Please try again.',
    'signup_session_expired': 'Your signup session expired. Please start again.',
    'email_send_failed': 'Could not send the verification email. Please try again shortly.',
    'gmail_not_configured': 'Email verification is not configured yet. Contact support.',
    'sms_not_configured':
        'Phone verification is temporarily unavailable. Please try again later.',
    'sms_send_failed': 'Could not send the SMS code. Please try again shortly.',
    'captcha_required': 'Please complete the security check.',
    'captcha_failed': 'Security check failed. Please try again.',
    'rate_limited': 'Too many attempts. Please wait a moment and try again.',
    'rate_limit_unavailable': 'Sign-up is temporarily unavailable. Please try again later.',
    'invalid_credentials': 'Invalid email or password.',
    'user_not_found': 'No account found for this email. Create an account to continue.',
  };
  return map[code] ?? code.replaceAll('_', ' ');
}

String extractApiErrorCode(Object err) {
  // Used with DioException detail strings from backend.
  return err.toString();
}
