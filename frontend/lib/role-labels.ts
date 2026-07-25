const ROLE_LABELS: Record<string, string> = {
  user: "Citizen",
  farmer: "Farmer",
  ngo: "NGO",
  corporate: "Corporate / ESG",
  government: "Government / NHAI",
  field_worker: "Field worker",
  field_supervisor: "Field supervisor",
  admin: "Platform admin",
};

const ORG_ROLE_LABELS: Record<string, string> = {
  manager: "Program manager",
  supervisor: "Field supervisor",
  worker: "Field worker",
  viewer: "Viewer / auditor",
};

export function formatPlatformRole(role: string | null | undefined): string {
  if (!role) return "Member";
  return ROLE_LABELS[role] ?? role.replace(/_/g, " ");
}

export function formatOrgRole(orgRole: string | null | undefined): string {
  if (!orgRole) return "";
  return ORG_ROLE_LABELS[orgRole] ?? orgRole.replace(/_/g, " ");
}
