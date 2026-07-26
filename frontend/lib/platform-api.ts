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
  admin_note: string | null;
  created_at: string;
  reviewed_at: string | null;
  user_id: string;
  user_email: string;
  user_full_name: string;
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
  async updateUser(id: string, payload: { role: string; is_active?: boolean }) {
    return (await api.patch<PlatformUser>(`/v1/platform/users/${id}`, payload)).data;
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
  async updateOrganization(id: string, payload: { name?: string; is_active?: boolean }) {
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
};
