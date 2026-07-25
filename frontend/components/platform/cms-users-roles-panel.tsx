"use client";

import Link from "next/link";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Shield, Users } from "lucide-react";
import { errorMessage } from "@/lib/api";
import { platformAdmin } from "@/lib/platform-api";
import { canManagePlatformUsers } from "@/lib/platform-access";
import { useAuth } from "@/lib/auth-store";

const WEBSITE_CMS_MODULE = "website_cms";

export function CmsUsersRolesPanel() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const [message, setMessage] = useState<string | null>(null);
  const isUsersAdmin = canManagePlatformUsers(user);

  const { data: roles } = useQuery({
    queryKey: ["platform-roles"],
    queryFn: () => platformAdmin.roles(),
  });

  const { data: modules, isLoading: modulesLoading } = useQuery({
    queryKey: ["platform-modules"],
    queryFn: () => platformAdmin.listModules(),
  });

  const cmsModule = modules?.find((m) => m.module_key === WEBSITE_CMS_MODULE);

  const updateModule = useMutation({
    mutationFn: (allowed_roles: string[]) =>
      platformAdmin.updateModule(WEBSITE_CMS_MODULE, { allowed_roles }),
    onSuccess: () => {
      setMessage("CMS access roles updated. Affected users must sign in again.");
      qc.invalidateQueries({ queryKey: ["platform-modules"] });
    },
    onError: (err) => setMessage(errorMessage(err)),
  });

  function toggleCmsRole(roleValue: string) {
    if (!cmsModule) return;
    const current = cmsModule.allowed_roles ?? [];
    const next = current.includes(roleValue)
      ? current.filter((r) => r !== roleValue)
      : [...current, roleValue];
    if (!next.includes("admin")) next.push("admin");
    updateModule.mutate(next);
  }

  return (
    <div className="space-y-8">
      <div className="rounded-2xl border border-stone-200 bg-white p-6 dark:border-stone-800 dark:bg-stone-900">
        <div className="mb-4 flex items-center gap-2">
          <Shield className="h-5 w-5 text-forest-700" />
          <h2 className="text-lg font-semibold">Website CMS access by role</h2>
        </div>
        <p className="mb-4 text-sm text-stone-600 dark:text-stone-300">
          Choose which workspace roles can open the Website CMS. Platform admins always have access.
        </p>
        {modulesLoading ? (
          <p className="text-sm text-stone-500">Loading module rules…</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {(roles ?? []).map((role) => {
              const checked = cmsModule?.allowed_roles?.includes(role.value) ?? false;
              const locked = role.value === "admin";
              return (
                <button
                  key={role.value}
                  type="button"
                  disabled={locked || updateModule.isPending}
                  onClick={() => toggleCmsRole(role.value)}
                  className={
                    checked
                      ? "rounded-full bg-forest-600 px-3 py-1.5 text-xs font-medium text-white"
                      : "rounded-full border border-stone-300 px-3 py-1.5 text-xs font-medium text-stone-600"
                  }
                >
                  {role.label}
                  {locked ? " (always)" : ""}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {isUsersAdmin ? (
        <div className="rounded-2xl border border-stone-200 bg-white p-6 dark:border-stone-800 dark:bg-stone-900">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-forest-700" />
            <h2 className="text-lg font-semibold">User directory</h2>
          </div>
          <p className="mt-2 text-sm text-stone-600 dark:text-stone-300">
            Search users, change roles, and activate or deactivate accounts from the dedicated users
            console.
          </p>
          <Link href="/platform/users" className="btn-primary mt-4 inline-flex">
            Open user management
          </Link>
        </div>
      ) : (
        <p className="text-sm text-stone-500">
          Only platform admins can manage individual user accounts.
        </p>
      )}

      {message ? <p className="text-sm text-stone-600 dark:text-stone-300">{message}</p> : null}
    </div>
  );
}
