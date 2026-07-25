const PENDING_INVITE_KEY = "aranyix_pending_invite";

export function storePendingInviteToken(token: string) {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(PENDING_INVITE_KEY, token);
}

export function consumePendingInviteToken(): string | null {
  if (typeof window === "undefined") return null;
  const token = sessionStorage.getItem(PENDING_INVITE_KEY);
  if (token) sessionStorage.removeItem(PENDING_INVITE_KEY);
  return token;
}

/** Default landing path after accepting an org invite, based on org role. */
export function inviteLandingPath(orgRole: string | null | undefined): string {
  switch (orgRole) {
    case "manager":
      return "/dashboard";
    case "supervisor":
      return "/field-ops";
    case "worker":
      return "/projects";
    case "viewer":
      return "/reports";
    default:
      return "/dashboard";
  }
}

export function inviteErrorMessage(code: string): string {
  const map: Record<string, string> = {
    invite_not_found: "This invite link is invalid or has already been used.",
    invite_expired: "This invite has expired. Ask your org admin to send a new one.",
    invite_revoked: "This invite was revoked by your organization admin.",
    invite_contact_mismatch:
      "Sign in with the email or phone number that received the invite, then try again.",
    user_in_other_org: "Your account is already linked to another organization.",
    invite_already_accepted: "This invite was already accepted.",
  };
  return map[code] ?? code;
}
