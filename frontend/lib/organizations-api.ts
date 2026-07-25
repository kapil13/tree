import { api } from "@/lib/api";

export type Organization = {
  id: string;
  name: string;
  slug: string;
  type: string;
  program_codes: string[];
};

export type OrgMember = {
  id: string;
  email: string;
  full_name: string;
  role: string;
  org_role: string | null;
  is_org_admin: boolean;
  is_active: boolean;
  phone: string | null;
  created_at: string;
};

export type OrgInvite = {
  id: string;
  email: string | null;
  phone: string | null;
  full_name: string;
  org_role: string;
  platform_role: string;
  status: string;
  invite_token: string;
  expires_at: string;
  created_at: string;
};

export type OrgMembersResponse = {
  organization: Organization;
  members: OrgMember[];
  pending_invites: OrgInvite[];
};

export type InvitePreview = {
  organization_name: string;
  org_role: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  expires_at: string;
};

export const organizations = {
  async previewInvite(invite_token: string) {
    return (
      await api.get<InvitePreview>("/v1/organizations/invites/preview", {
        params: { token: invite_token },
      })
    ).data;
  },
  async me() {
    return (await api.get<Organization>("/v1/organizations/me")).data;
  },
  async members() {
    return (await api.get<OrgMembersResponse>("/v1/organizations/me/members")).data;
  },
  async invite(payload: {
    full_name: string;
    email?: string;
    phone?: string;
    org_role: "manager" | "supervisor" | "worker" | "viewer";
  }) {
    return (
      await api.post<{ status: string; member?: OrgMember; invite?: OrgInvite }>(
        "/v1/organizations/me/members/invite",
        payload,
      )
    ).data;
  },
  async bulkInvite(rows: Array<{ full_name: string; email?: string; phone?: string; org_role?: string }>) {
    return (
      await api.post<{ added: number; invited: number; errors: number }>(
        "/v1/organizations/me/members/bulk-invite",
        { rows },
      )
    ).data;
  },
  async updateMember(
    memberId: string,
    payload: { org_role?: string; is_active?: boolean; is_org_admin?: boolean },
  ) {
    return (await api.patch<OrgMember>(`/v1/organizations/me/members/${memberId}`, payload)).data;
  },
  async acceptInvite(invite_token: string) {
    return (await api.post<OrgMember>("/v1/organizations/invites/accept", { invite_token })).data;
  },
};
