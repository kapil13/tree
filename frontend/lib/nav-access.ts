import type { User } from "@/lib/api";

export type NavAudience =
  | "all"
  | "professional"
  | "field_worker"
  | "field_supervisor"
  | "org_admin"
  | "byot"
  | "can_write";

const PROFESSIONAL_ROLES = new Set(["government", "corporate", "ngo", "field_supervisor"]);
const FIELD_WORKER_ROLES = new Set(["field_worker"]);

export function userHasProfessionalAccess(user: User | null | undefined): boolean {
  if (!user) return false;
  if (user.has_professional_program) return true;
  return PROFESSIONAL_ROLES.has(user.role);
}

export function isOrgAdmin(user: User | null | undefined): boolean {
  return Boolean(user?.is_org_admin && user.organization_id);
}

export function isOrgViewer(user: User | null | undefined): boolean {
  return user?.org_role === "viewer";
}

export function canWriteInApp(user: User | null | undefined): boolean {
  if (!user) return false;
  if (user.role === "admin") return true;
  return !isOrgViewer(user);
}

export function viewerReadOnlyMessage(context: "trees" | "general" = "general"): string {
  if (context === "trees") {
    return "Your viewer role is read-only. Ask your program manager to change your access if you need to register or update trees.";
  }
  return "Your viewer role is read-only. Contact your program manager if you need write access.";
}

export function canGenerateReports(user: User | null | undefined): boolean {
  return canWriteInApp(user) && (userHasProfessionalAccess(user) || user?.role === "field_supervisor");
}

export function canSeeNavItem(
  user: User | null | undefined,
  audience: NavAudience | NavAudience[],
  options?: { excludeViewers?: boolean },
): boolean {
  if (!user) return false;
  const audiences = Array.isArray(audience) ? audience : [audience];
  if (audiences.includes("all")) return true;

  if (options?.excludeViewers && isOrgViewer(user)) return false;

  const professional = userHasProfessionalAccess(user);
  const fieldWorker = FIELD_WORKER_ROLES.has(user.role);
  const supervisor = user.role === "field_supervisor" || user.org_role === "supervisor";
  const orgAdmin = isOrgAdmin(user);

  return audiences.some((a) => {
    switch (a) {
      case "byot":
        return !professional;
      case "professional":
        return professional;
      case "field_worker":
        return fieldWorker || supervisor || professional;
      case "field_supervisor":
        return supervisor || professional;
      case "org_admin":
        return orgAdmin || user.role === "admin";
      case "can_write":
        return canWriteInApp(user);
      default:
        return true;
    }
  });
}
