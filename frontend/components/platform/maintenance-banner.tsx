"use client";

import { useQuery } from "@tanstack/react-query";
import { AlertTriangle } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-store";
import { isFullPlatformAdmin } from "@/lib/platform-access";

export type GovernanceStatus = {
  maintenance_mode: boolean;
  maintenance_message: string | null;
  registration_enabled: boolean;
};

export async function fetchGovernanceStatus(): Promise<GovernanceStatus> {
  return (await api.get<GovernanceStatus>("/v1/platform/governance/status")).data;
}

export function MaintenanceBanner() {
  const { user } = useAuth();
  const { data } = useQuery({
    queryKey: ["governance-status"],
    queryFn: fetchGovernanceStatus,
    staleTime: 60_000,
  });

  if (!data?.maintenance_mode) return null;

  const fullAdmin = isFullPlatformAdmin(user);

  return (
    <div className="border-b border-amber-300 bg-amber-50 px-4 py-2 text-sm text-amber-950 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100">
      <div className="mx-auto flex max-w-6xl items-start gap-2">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
        <div>
          <strong>Maintenance mode is active.</strong>{" "}
          {data.maintenance_message || "Non-admin write access is temporarily disabled."}
          {fullAdmin ? (
            <span className="ml-1 text-amber-800">
              You have admin access and can still make changes.
            </span>
          ) : null}
        </div>
      </div>
    </div>
  );
}
