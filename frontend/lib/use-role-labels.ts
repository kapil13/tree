"use client";

import { useTranslations } from "next-intl";

const PLATFORM_ROLE_KEYS: Record<string, string> = {
  user: "platformUser",
  farmer: "platformFarmer",
  ngo: "platformNgo",
  corporate: "platformCorporate",
  government: "platformGovernment",
  field_worker: "platformFieldWorker",
  field_supervisor: "platformFieldSupervisor",
  admin: "platformAdmin",
};

const ORG_ROLE_KEYS: Record<string, string> = {
  manager: "orgManager",
  supervisor: "orgSupervisor",
  worker: "orgWorker",
  viewer: "orgViewer",
};

export function useRoleLabels() {
  const t = useTranslations("roles");

  function formatPlatformRole(role: string | null | undefined): string {
    if (!role) return t("member");
    const key = PLATFORM_ROLE_KEYS[role];
    return key ? t(key) : role.replace(/_/g, " ");
  }

  function formatOrgRole(orgRole: string | null | undefined): string {
    if (!orgRole) return "";
    const key = ORG_ROLE_KEYS[orgRole];
    return key ? t(key) : orgRole.replace(/_/g, " ");
  }

  return { formatPlatformRole, formatOrgRole };
}
