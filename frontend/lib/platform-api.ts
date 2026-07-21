import { api } from "@/lib/api";

export type PlatformUser = {
  id: string;
  email: string;
  full_name: string;
  role: string;
  organization_id: string | null;
  is_active: boolean;
  is_verified: boolean;
  created_at: string;
  last_login_at: string | null;
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

export const platformAdmin = {
  async roles() {
    return (await api.get<PlatformRole[]>("/v1/platform/roles")).data;
  },
  async listUsers() {
    return (await api.get<PlatformUser[]>("/v1/platform/users")).data;
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
};
