import type { User } from "@/lib/api";

export type NavAudience =
  | "all"
  | "professional"
  | "field_worker"
  | "field_supervisor"
  | "org_admin"
  | "byot";

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

export function canSeeNavItem(
  user: User | null | undefined,
  audience: NavAudience | NavAudience[],
): boolean {
  if (!user) return false;
  const audiences = Array.isArray(audience) ? audience : [audience];
  if (audiences.includes("all")) return true;

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
      default:
        return true;
    }
  });
}
