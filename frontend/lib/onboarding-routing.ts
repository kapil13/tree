/** Post-login routing for professional signup onboarding. */

import type { User } from "@/lib/api";

export function onboardingRedirectPath(user: User | null | undefined): string | null {
  if (!user) return null;
  switch (user.onboarding_status) {
    case "profile_required":
      if (user.audience_onboarding_required) {
        return "/onboarding/audience";
      }
      return "/onboarding/org-profile";
    case "pending_approval":
      return "/onboarding/pending";
    case "rejected":
      return "/onboarding/pending";
    default:
      break;
  }
  if (user.audience_onboarding_required) {
    return "/onboarding/audience";
  }
  return null;
}
