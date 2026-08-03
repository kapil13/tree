import { api } from "@/lib/api";

export type PlatformUser = {
  id: string;
  email: string;
  full_name: string;
  role: string;
  organization_id: string | null;
  organization_name?: string | null;
  org_role?: string | null;
  is_org_admin?: boolean;
  is_active: boolean;
  is_verified: boolean;
  phone?: string | null;
  email_verified_at?: string | null;
  sessions_invalidated_at?: string | null;
  created_at: string;
  last_login_at: string | null;
  enrolled_program_codes?: string[];
};

export type PlatformOverview = {
  users: { total: number; active: number; inactive: number; admins: number };
  organizations: { total: number };
  program_access: { pending: number };
};

export type PlatformUserPage = {
  items: PlatformUser[];
  total: number;
  page: number;
  page_size: number;
};

export type PlatformRole = {
  value: string;
  label: string;
};

export type PlatformModuleRule = {
  module_key: string;
  label: string;
  description: string;
  enabled: boolean;
  allowed_roles: string[];
  config: Record<string, unknown>;
  updated_at: string | null;
};

export type ProgramAccessRequestAdmin = {
  id: string;
  program_code: string;
  program_name: string;
  status: string;
  message: string | null;
  org_profile?: Record<string, unknown> | null;
  admin_note: string | null;
  created_at: string;
  reviewed_at: string | null;
  user_id: string;
  user_email: string;
  user_full_name: string;
  user_phone?: string | null;
};

export type PlatformOrganization = {
  id: string;
  name: string;
  slug: string;
  type: string;
  is_active: boolean;
  member_count: number;
  created_at: string;
};

export type PlatformOrganizationDetail = PlatformOrganization & {
  owner_user_id: string | null;
  project_count: number;
};

export type PlatformOrganizationPage = {
  items: PlatformOrganization[];
  total: number;
  page: number;
  page_size: number;
};

export type PermissionMatrix = {
  permissions: string[];
  roles: Record<string, string[]>;
};

export type PlatformBillingSummary = {
  payments_enabled: boolean;
  orders: { total: number; paid: number; failed: number; pending: number };
  revenue_paise: number;
  credits_sold: number;
  wallets: { users_with_balance: number; total_purchased_balance: number };
};

export type PlatformPaymentOrder = {
  id: string;
  user_id: string;
  user_email: string;
  user_full_name: string;
  sku: string;
  credits_granted: number;
  amount_paise: number;
  currency: string;
  status: string;
  paid_at: string | null;
  created_at: string;
};

export type PlatformPaymentOrderPage = {
  items: PlatformPaymentOrder[];
  total: number;
  page: number;
  page_size: number;
};

export type PlatformOpsSummary = {
  status: string;
  workers: {
    status: string;
    celery: { reachable: boolean; workers: string[]; error?: string | null };
    bioacoustic?: Record<string, unknown>;
    failed_job_count: number;
  };
  integrations: { status: string; integrations: Record<string, { status: string; label?: string }> };
  jobs: {
    total_recorded: number;
    recent_count: number;
    recent_by_status: Record<string, number>;
    recent: Array<{
      job_name: string;
      status: string;
      finished_at: string | null;
      error?: string | null;
    }>;
  };
};

export type PlatformSchemeSummary = {
  scheme_count: number;
  tagged_project_count: number;
  untagged_project_count: number;
  by_scheme: Array<{
    scheme_code: string;
    scheme_label: string;
    ministry: string | null;
    project_count: number;
    tree_count: number;
    kpi_targets: Record<string, number>;
  }>;
};

export type CampaApoImportResult = {
  imported: number;
  unmatched: string[];
  parse_errors: string[];
  applied: Array<{ project_id: string; project_code: string; pca_number?: string }>;
};

export type PlatformAuditLog = {
  id: string;
  actor_user_id: string | null;
  actor_email: string | null;
  actor_full_name: string | null;
  organization_id: string | null;
  action: string;
  resource_type: string | null;
  resource_id: string | null;
  ip: string | null;
  user_agent: string | null;
  diff: Record<string, unknown> | null;
  created_at: string;
};

export type UserPlatformGrants = {
  user_id: string;
  role: string;
  role_modules: Record<string, boolean>;
  user_grants: string[];
  effective_access: Record<string, boolean>;
};

export type PlatformAuditPage = {
  items: PlatformAuditLog[];
  total: number;
  page: number;
  page_size: number;
};

export type OrgMemberAdmin = {
  id: string;
  email: string;
  full_name: string;
  role: string;
  org_role: string | null;
  is_org_admin: boolean;
  is_active: boolean;
  last_login_at: string | null;
  created_at: string;
};

export type OrgProjectAdmin = {
  id: string;
  code: string;
  name: string;
  status: string;
  segment: string;
  program_code: string | null;
  created_at: string;
};

export type PlatformSettings = {
  app_env: string;
  app_version: string;
  payments_enabled: boolean;
  captcha_enabled: boolean;
  sms_auth_configured: boolean;
  google_oauth_configured: boolean;
  razorpay_configured: boolean;
  sentinel_configured: boolean;
  bhoonidhi_configured: boolean;
  bioacoustic_pipeline: string;
  bioacoustic_perch_enabled: boolean;
  iucn_configured: boolean;
};

export const platformAdmin = {
  async overview() {
    return (await api.get<PlatformOverview>("/v1/platform/overview")).data;
  },
  async roles() {
    return (await api.get<PlatformRole[]>("/v1/platform/roles")).data;
  },
  async listUsers(params?: {
    search?: string;
    role?: string;
    is_active?: boolean;
    page?: number;
    page_size?: number;
  }) {
    return (await api.get<PlatformUserPage>("/v1/platform/users", { params })).data;
  },
  async getUser(id: string) {
    return (await api.get<PlatformUser>(`/v1/platform/users/${id}`)).data;
  },
  async updateUser(
    id: string,
    payload: { role: string; is_active?: boolean; password_confirm?: string },
  ) {
    return (await api.patch<PlatformUser>(`/v1/platform/users/${id}`, payload)).data;
  },
  async getUserGrants(id: string) {
    return (await api.get<UserPlatformGrants>(`/v1/platform/users/${id}/platform-grants`)).data;
  },
  async updateUserGrants(id: string, payload: { module_keys: string[]; password: string }) {
    return (
      await api.put<UserPlatformGrants>(`/v1/platform/users/${id}/platform-grants`, payload)
    ).data;
  },
  async listModules() {
    return (await api.get<PlatformModuleRule[]>("/v1/platform/modules")).data;
  },
  async updateModule(moduleKey: string, payload: { enabled?: boolean; allowed_roles?: string[] }) {
    return (await api.patch<PlatformModuleRule>(`/v1/platform/modules/${moduleKey}`, payload)).data;
  },
  async listProgramAccessRequests(status = "pending") {
    return (
      await api.get<ProgramAccessRequestAdmin[]>(
        `/v1/platform/program-access-requests?status=${encodeURIComponent(status)}`,
      )
    ).data;
  },
  async reviewProgramAccessRequest(
    id: string,
    payload: {
      action: "approve" | "reject";
      admin_note?: string;
      organization_name?: string;
      organization_slug?: string;
      organization_id?: string;
      platform_role?: "government" | "corporate" | "ngo";
      make_org_admin?: boolean;
    },
  ) {
    return (
      await api.patch<ProgramAccessRequestAdmin>(
        `/v1/platform/program-access-requests/${id}`,
        payload,
      )
    ).data;
  },
  async listOrganizations(params?: {
    search?: string;
    is_active?: boolean;
    page?: number;
    page_size?: number;
  }) {
    return (await api.get<PlatformOrganizationPage>("/v1/platform/organizations", { params })).data;
  },
  async getOrganization(id: string) {
    return (await api.get<PlatformOrganizationDetail>(`/v1/platform/organizations/${id}`)).data;
  },
  async updateOrganization(
    id: string,
    payload: {
      name?: string;
      is_active?: boolean;
      owner_user_id?: string;
      reason?: string;
      revoke_member_sessions?: boolean;
      password_confirm?: string;
    },
  ) {
    return (
      await api.patch<PlatformOrganizationDetail>(`/v1/platform/organizations/${id}`, payload)
    ).data;
  },
  async permissionsMatrix() {
    return (await api.get<PermissionMatrix>("/v1/platform/permissions")).data;
  },
  async billingSummary() {
    return (await api.get<PlatformBillingSummary>("/v1/platform/billing/summary")).data;
  },
  async listPaymentOrders(params?: { status?: string; page?: number; page_size?: number }) {
    return (await api.get<PlatformPaymentOrderPage>("/v1/platform/billing/orders", { params }))
      .data;
  },
  async opsSummary() {
    return (await api.get<PlatformOpsSummary>("/v1/platform/ops/summary")).data;
  },
  async schemeSummary() {
    return (
      await api.get<PlatformSchemeSummary>("/v1/platform/schemes/summary")
    ).data;
  },
  async importCampaApo(csvText: string) {
    return (
      await api.post<CampaApoImportResult>("/v1/platform/schemes/apo-import", {
        csv_text: csvText,
      })
    ).data;
  },
  async settings() {
    return (await api.get<PlatformSettings>("/v1/platform/settings")).data;
  },
  async auditLogs(params?: {
    page?: number;
    page_size?: number;
    action_prefix?: string;
    resource_type?: string;
    resource_id?: string;
    organization_id?: string;
    actor_user_id?: string;
    date_from?: string;
    date_to?: string;
    search?: string;
  }) {
    return (await api.get<PlatformAuditPage>("/v1/platform/audit/logs", { params })).data;
  },
  async exportAudit(params?: {
    action_prefix?: string;
    resource_type?: string;
    resource_id?: string;
    organization_id?: string;
    actor_user_id?: string;
    date_from?: string;
    date_to?: string;
    search?: string;
  }) {
    const response = await api.get("/v1/platform/audit/export", {
      params,
      responseType: "blob",
    });
    return response.data as Blob;
  },
  async listOrgMembers(orgId: string, params?: { page?: number; page_size?: number }) {
    return (
      await api.get<{ items: OrgMemberAdmin[]; total: number; page: number; page_size: number }>(
        `/v1/platform/organizations/${orgId}/members`,
        { params },
      )
    ).data;
  },
  async listOrgProjects(orgId: string, params?: { page?: number; page_size?: number }) {
    return (
      await api.get<{ items: OrgProjectAdmin[]; total: number; page: number; page_size: number }>(
        `/v1/platform/organizations/${orgId}/projects`,
        { params },
      )
    ).data;
  },
  async impersonateUser(
    userId: string,
    payload: { password: string; reason?: string; read_only?: boolean },
  ) {
    return (
      await api.post<{
        access_token: string;
        refresh_token: string;
        expires_in: number;
        impersonated_by_id: string;
        impersonated_by_email: string;
        read_only: boolean;
        target_user: PlatformUser;
      }>(`/v1/platform/users/${userId}/impersonate`, payload)
    ).data;
  },
  async forcePasswordReset(userId: string, password: string) {
    return (
      await api.post<{ status: string; dev_hint?: string | null }>(
        `/v1/platform/users/${userId}/force-password-reset`,
        { password },
      )
    ).data;
  },
  async resendVerification(
    userId: string,
    payload: { password: string; mark_verified?: boolean },
  ) {
    return (
      await api.post<{ status: string; dev_hint?: string | null }>(
        `/v1/platform/users/${userId}/resend-verification`,
        payload,
      )
    ).data;
  },
  async revokeSessions(userId: string, password: string) {
    return (
      await api.post<{ status: string }>(`/v1/platform/users/${userId}/revoke-sessions`, {
        password,
      })
    ).data;
  },
  async bulkUserAction(payload: {
    user_ids: string[];
    action: "activate" | "deactivate" | "revoke_sessions";
    password: string;
  }) {
    return (
      await api.post<{
        processed: number;
        skipped: number;
        sessions_revoked?: number;
        details: Array<Record<string, unknown>>;
      }>("/v1/platform/users/bulk-action", payload)
    ).data;
  },
  async bulkOrgAction(payload: {
    org_ids: string[];
    is_active: boolean;
    reason?: string;
    revoke_member_sessions?: boolean;
    password?: string;
  }) {
    return (
      await api.post<{
        processed: number;
        skipped: number;
        sessions_revoked?: number;
        details: Array<Record<string, unknown>>;
      }>("/v1/platform/organizations/bulk-action", payload)
    ).data;
  },
  async exportUsers(params?: { search?: string; role?: string; is_active?: boolean }) {
    const response = await api.get("/v1/platform/users/export", {
      params,
      responseType: "blob",
    });
    return response.data as Blob;
  },
  async exportOrganizations(params?: { search?: string; is_active?: boolean }) {
    const response = await api.get("/v1/platform/organizations/export", {
      params,
      responseType: "blob",
    });
    return response.data as Blob;
  },
  async exportOrgMembers(orgId: string) {
    const response = await api.get(`/v1/platform/organizations/${orgId}/members/export`, {
      responseType: "blob",
    });
    return response.data as Blob;
  },
  async stopImpersonation() {
    return (
      await api.post<{ access_token: string; refresh_token: string; expires_in: number }>(
        "/v1/platform/impersonation/stop",
      )
    ).data;
  },
  async getGovernance() {
    return (
      await api.get<{
        maintenance_mode: boolean;
        maintenance_message: string;
        registration_enabled: boolean;
        updated_at: string | null;
        updated_by_user_id: string | null;
      }>("/v1/platform/governance")
    ).data;
  },
  async updateGovernance(payload: {
    maintenance_mode?: boolean;
    maintenance_message?: string;
    registration_enabled?: boolean;
    password: string;
  }) {
    return (
      await api.patch<{
        maintenance_mode: boolean;
        maintenance_message: string;
        registration_enabled: boolean;
      }>("/v1/platform/governance", payload)
    ).data;
  },
  async getOrgFeatureFlags(orgId: string) {
    return (
      await api.get<{
        organization_id: string;
        flags: Array<{ key: string; label: string; enabled: boolean }>;
      }>(`/v1/platform/organizations/${orgId}/feature-flags`)
    ).data;
  },
  async updateOrgFeatureFlags(
    orgId: string,
    payload: { flags: Record<string, boolean>; password_confirm: string },
  ) {
    return (
      await api.patch<{
        organization_id: string;
        flags: Array<{ key: string; label: string; enabled: boolean }>;
      }>(`/v1/platform/organizations/${orgId}/feature-flags`, payload)
    ).data;
  },
  async bulkReviewProgramAccess(payload: {
    request_ids: string[];
    action: "approve" | "reject";
    admin_note?: string;
    password: string;
  }) {
    return (
      await api.post<{
        processed: number;
        skipped: number;
        details: Array<Record<string, unknown>>;
      }>("/v1/platform/program-access-requests/bulk-review", payload)
    ).data;
  },
};
