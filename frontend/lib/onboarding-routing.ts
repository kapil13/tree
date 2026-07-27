/** Post-login routing for professional signup onboarding. */

import type { User } from "@/lib/api";

export function onboardingRedirectPath(user: User | null | undefined): string | null {
  if (!user) return null;
  switch (user.onboarding_status) {
    case "profile_required":
      return "/onboarding/org-profile";
    case "pending_approval":
      return "/onboarding/pending";
    case "rejected":
      return "/onboarding/pending";
    default:
      return null;
  }
}
