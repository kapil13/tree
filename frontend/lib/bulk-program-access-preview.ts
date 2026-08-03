import type { ProgramAccessRequestAdmin } from "@/lib/platform-api";

export function inferBulkApproveOrgName(request: ProgramAccessRequestAdmin): string {
  const profile = request.org_profile;
  const orgName = profile?.organization_name;
  if (typeof orgName === "string" && orgName.trim()) {
    return orgName.trim();
  }
  return `${request.user_full_name} — ${request.program_name}`;
}

export function inferBulkApprovePlatformRole(programCode: string): string {
  const code = programCode.toLowerCase();
  if (code.includes("corporate") || code.includes("esg")) return "corporate";
  if (code.includes("ngo")) return "ngo";
  return "government";
}

export type BulkApprovePreviewRow = {
  id: string;
  userEmail: string;
  userName: string;
  programName: string;
  orgName: string;
  platformRole: string;
};

export function buildBulkApprovePreview(
  requests: ProgramAccessRequestAdmin[],
  selectedIds: Set<string>,
): BulkApprovePreviewRow[] {
  return requests
    .filter((r) => selectedIds.has(r.id))
    .map((request) => ({
      id: request.id,
      userEmail: request.user_email,
      userName: request.user_full_name,
      programName: request.program_name,
      orgName: inferBulkApproveOrgName(request),
      platformRole: inferBulkApprovePlatformRole(request.program_code),
    }));
}
