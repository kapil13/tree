/// Human-readable auth error messages (mirrors web signup wizard).

String humanizeAuthError(String code) {
  const map = {
    'email_taken': 'This email is already registered. Try signing in.',
    'phone_taken': 'This phone number is already registered.',
    'invalid_phone': 'Enter a valid 10-digit Indian mobile number starting with 6–9.',
    'invalid_otp': 'Invalid code. Please try again.',
    'signup_session_expired': 'Your signup session expired. Please start again.',
    'email_send_failed': 'Could not send the verification email. Please try again shortly.',
    'email_otp_not_configured':
        'Email OTP is not configured yet. Use password sign-in or contact support.',
    'email_dependencies_missing':
        'Email OTP is not configured yet. Use password sign-in or contact support.',
    'gmail_not_configured':
        'Email OTP is not configured yet. Use password sign-in or contact support.',
    'sms_not_configured':
        'SMS is not live yet. Use email sign-in, or try again after SMS is enabled on the server.',
    'sms_send_failed': 'Could not send the SMS code. Please try again shortly.',
    'captcha_required': 'Complete the security check below, then try again.',
    'captcha_failed': 'Security check failed. Please try again.',
    'rate_limited': 'Too many attempts. Please wait a moment and try again.',
    'rate_limit_unavailable': 'Sign-up is temporarily unavailable. Please try again later.',
    'invalid_credentials': 'Invalid email or password.',
    'user_not_found': 'No account found for this email. Create an account to continue.',
    'google_oauth_not_configured': 'Google sign-in is not configured on this server.',
    'registration_required': 'No account for this phone. Create an account first.',
  };
  return map[code] ?? code.replaceAll('_', ' ');
}

String extractApiErrorCode(Object err) {
  // Used with DioException detail strings from backend.
  return err.toString();
}
