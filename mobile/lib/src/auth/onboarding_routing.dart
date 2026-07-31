/// Post-login routing for professional signup onboarding (mirrors web).

String? onboardingRedirectPath(Map<String, dynamic>? user) {
  if (user == null) return null;
  switch (user['onboarding_status'] as String?) {
    case 'profile_required':
      return '/onboarding/org-profile';
    case 'pending_approval':
    case 'rejected':
      return '/onboarding/pending';
    default:
      return null;
  }
}

/// First meaningful action for new BYOT citizens after signup.
String postSignupLandingRoute(Map<String, dynamic>? user) {
  final onboarding = onboardingRedirectPath(user);
  if (onboarding != null) return onboarding;

  final category = user?['pending_program_code'] as String?;
  if (category != null &&
      category != 'byot' &&
      (user?['onboarding_status'] as String?) == 'active_byot') {
    return '/home';
  }

  final trees = user?['enrolled_program_codes'] as List<dynamic>?;
  if (trees == null || trees.isEmpty) {
    return '/trees/new';
  }
  return '/home';
}
