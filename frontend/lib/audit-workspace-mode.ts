import type { User } from "@/lib/api";
import rbacPolicy from "@/lib/rbac-policy.json";
import { auditAttestationEnabled } from "@/lib/audit-portfolio-status";
import { isOrgViewer, userHasProfessionalAccess } from "@/lib/nav-access";
import { AUDIT_PHASES, defaultAuditPhase, type AuditPhase } from "@/lib/audit-workspace";

export type AuditWorkspaceMode = "full" | "field" | "review";

const FIELD_WORKER_ROLES = new Set<string>(rbacPolicy.field_worker_roles);

const MODE_PHASES: Record<AuditWorkspaceMode, AuditPhase[]> = {
  full: [...AUDIT_PHASES],
  field: ["sampling", "reconciliation"],
  review: ["risk", "reconciliation", "export", "attestation"],
};

/** Resolve audit UI density from org role and platform role. */
export function resolveAuditWorkspaceMode(user: User | null | undefined): AuditWorkspaceMode {
  if (!user) return "full";
  if (isOrgViewer(user)) return "review";
  if (FIELD_WORKER_ROLES.has(user.role) && !userHasProfessionalAccess(user)) {
    return "field";
  }
  return "full";
}

export function auditPhasesForMode(mode: AuditWorkspaceMode): AuditPhase[] {
  return MODE_PHASES[mode];
}

export function isAuditPhaseVisibleInMode(phase: AuditPhase, mode: AuditWorkspaceMode): boolean {
  return MODE_PHASES[mode].includes(phase);
}

export function defaultAuditPhaseForMode(status: string, mode: AuditWorkspaceMode): AuditPhase {
  if (mode === "field") return "sampling";
  if (mode === "review") {
    if (auditAttestationEnabled(status)) return "attestation";
    if (status === "field_verified") return "export";
    return "reconciliation";
  }
  return defaultAuditPhase(status);
}

export function coerceAuditPhaseForMode(
  phase: AuditPhase,
  status: string,
  mode: AuditWorkspaceMode,
): AuditPhase {
  const allowed = auditPhasesForMode(mode);
  if (allowed.includes(phase)) return phase;
  return defaultAuditPhaseForMode(status, mode);
}
