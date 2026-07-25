/// Post-invite navigation paths for mobile (mirrors frontend/lib/invite-landing.ts).
library;

String inviteLandingRoute(String? orgRole) {
  switch (orgRole) {
    case 'manager':
      return '/home';
    case 'supervisor':
      return '/projects';
    case 'worker':
      return '/projects';
    case 'viewer':
      return '/trees';
    default:
      return '/home';
  }
}

String inviteErrorMessage(String code) {
  const map = {
    'invite_not_found': 'This invite link is invalid or has already been used.',
    'invite_expired': 'This invite has expired. Ask your org admin to send a new one.',
    'invite_revoked': 'This invite was revoked by your organization admin.',
    'invite_contact_mismatch':
        'Sign in with the email or phone that received the invite, then try again.',
    'user_in_other_org': 'Your account is already linked to another organization.',
    'invite_already_accepted': 'This invite was already accepted.',
  };
  return map[code] ?? code;
}
