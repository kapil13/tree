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
    'captcha_required': 'Please complete the security check.',
    'captcha_failed': 'Security check failed. Please try again.',
    'rate_limited': 'Too many attempts. Please wait a moment and try again.',
    'rate_limit_unavailable': 'Sign-up is temporarily unavailable. Please try again later.',
    'invalid_credentials': 'Invalid email or password.',
    'user_not_found': 'No account found for this email. Create an account to continue.',
    'google_oauth_not_configured': 'Google sign-in is not configured on this server.',
    'registration_required': 'No account for this phone. Create an account first.',
    'no_satellite_records':
        'No satellite NDVI yet. Tap Rescan NDVI first (professional accounts).',
    'professional_access_required':
        'Satellite rescan needs an approved professional program. Request access in Profile.',
    'viewer_read_only': 'Your role is view-only. Ask an admin for write access.',
    'request_already_pending': 'An access request for this program is already pending.',
    'already_enrolled': 'You already have access to this program.',
    'default_program_open': 'BYOT Public is already active on every account.',
    'program_not_found': 'That registration program was not found.',
    'forbidden': 'You do not have permission for this action.',
  };
  return map[code] ?? code.replaceAll('_', ' ');
}

String extractApiErrorCode(Object err) {
  // Used with DioException detail strings from backend.
  return err.toString();
}
