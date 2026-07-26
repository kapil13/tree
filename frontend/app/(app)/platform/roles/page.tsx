"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { KeyRound, Shield } from "lucide-react";
import { PlatformShell } from "@/components/platform/platform-shell";
import { errorMessage } from "@/lib/api";
import { platformAdmin } from "@/lib/platform-api";
import { isFullPlatformAdmin } from "@/lib/platform-access";
import { useAuth } from "@/lib/auth-store";

export default function PlatformRolesPage() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const fullAdmin = isFullPlatformAdmin(user);
  const [message, setMessage] = useState<string | null>(null);

  const { data: matrix, isLoading: matrixLoading } = useQuery({
    queryKey: ["platform-permissions-matrix"],
    queryFn: () => platformAdmin.permissionsMatrix(),
  });

  const { data: roles } = useQuery({
    queryKey: ["platform-roles"],
    queryFn: () => platformAdmin.roles(),
  });

  const { data: modules, isLoading: modulesLoading } = useQuery({
    queryKey: ["platform-modules"],
    queryFn: () => platformAdmin.listModules(),
    enabled: fullAdmin,
  });

  const updateModule = useMutation({
    mutationFn: ({
      moduleKey,
      allowed_roles,
    }: {
      moduleKey: string;
      allowed_roles: string[];
    }) => platformAdmin.updateModule(moduleKey, { allowed_roles }),
    onSuccess: () => {
      setMessage("Module access updated. Affected users must sign in again.");
      qc.invalidateQueries({ queryKey: ["platform-modules"] });
    },
    onError: (err) => setMessage(errorMessage(err)),
  });

  function toggleModuleRole(moduleKey: string, currentRoles: string[], roleValue: string) {
    const next = currentRoles.includes(roleValue)
      ? currentRoles.filter((r) => r !== roleValue)
      : [...currentRoles, roleValue];
    if (!next.includes("admin")) next.push("admin");
    updateModule.mutate({ moduleKey, allowed_roles: next });
  }

  const roleLabels = Object.fromEntries((roles ?? []).map((r) => [r.value, r.label]));

  return (
    <PlatformShell>
      <div className="space-y-8">
        <div className="rounded-2xl border border-stone-200 bg-white p-6 dark:border-stone-800 dark:bg-stone-900">
          <div className="mb-4 flex items-center gap-2">
            <KeyRound className="h-5 w-5 text-forest-700" />
            <h2 className="text-lg font-semibold">Workspace permission matrix</h2>
          </div>
          <p className="mb-4 text-sm text-stone-600 dark:text-stone-300">
            Read-only view of default workspace role permissions (trees, satellite, reports, etc.).
          </p>
          {matrixLoading || !matrix ? (
            <p className="text-sm text-stone-500">Loading permission matrix…</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-xs">
                <thead>
                  <tr className="border-b border-stone-200 text-left dark:border-stone-700">
                    <th className="px-2 py-2 font-medium">Role</th>
                    {matrix.permissions.map((perm) => (
                      <th key={perm} className="px-2 py-2 font-medium whitespace-nowrap">
                        {perm.replace(":", " ")}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(matrix.roles).map(([role, perms]) => (
                    <tr key={role} className="border-b border-stone-100 dark:border-stone-800">
                      <td className="px-2 py-2 font-medium">
                        {roleLabels[role] ?? role.replace("_", " ")}
                      </td>
                      {matrix.permissions.map((perm) => (
                        <td key={perm} className="px-2 py-2 text-center">
                          {perms.includes(perm) ? "✓" : "—"}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {fullAdmin ? (
          <div className="rounded-2xl border border-stone-200 bg-white p-6 dark:border-stone-800 dark:bg-stone-900">
            <div className="mb-4 flex items-center gap-2">
              <Shield className="h-5 w-5 text-forest-700" />
              <h2 className="text-lg font-semibold">Delegated platform modules</h2>
            </div>
            <p className="mb-6 text-sm text-stone-600 dark:text-stone-300">
              Grant non-admin roles access to specific platform console sections. Platform admins
              always retain full access.
            </p>
            {modulesLoading ? (
              <p className="text-sm text-stone-500">Loading module rules…</p>
            ) : (
              <div className="space-y-6">
                {(modules ?? []).map((mod) => (
                  <div key={mod.module_key} className="border-t border-stone-100 pt-4 dark:border-stone-800">
                    <h3 className="font-medium">{mod.label}</h3>
                    <p className="mt-1 text-xs text-stone-500">{mod.description}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {(roles ?? []).map((role) => {
                        const checked = mod.allowed_roles?.includes(role.value) ?? false;
                        const locked = role.value === "admin";
                        return (
                          <button
                            key={role.value}
                            type="button"
                            disabled={locked || updateModule.isPending}
                            onClick={() =>
                              toggleModuleRole(mod.module_key, mod.allowed_roles ?? [], role.value)
                            }
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
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <p className="text-sm text-stone-500">
            Only full platform admins can edit delegated module access.
          </p>
        )}

        {message ? <p className="text-sm text-stone-600 dark:text-stone-300">{message}</p> : null}
      </div>
    </PlatformShell>
  );
}
