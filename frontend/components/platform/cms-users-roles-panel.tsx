"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Shield, Users } from "lucide-react";
import { errorMessage } from "@/lib/api";
import { platformAdmin } from "@/lib/platform-api";
import { useAuth } from "@/lib/auth-store";
import { canManagePlatformUsers } from "@/lib/platform-access";

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

  const { data: users, isLoading: usersLoading } = useQuery({
    queryKey: ["platform-users"],
    queryFn: () => platformAdmin.listUsers(),
    enabled: isUsersAdmin,
  });

  const { data: modules, isLoading: modulesLoading } = useQuery({
    queryKey: ["platform-modules"],
    queryFn: () => platformAdmin.listModules(),
  });

  const cmsModule = modules?.find((m) => m.module_key === WEBSITE_CMS_MODULE);

  const updateUser = useMutation({
    mutationFn: ({ id, role }: { id: string; role: string }) =>
      platformAdmin.updateUser(id, { role }),
    onSuccess: () => {
      setMessage("User role updated.");
      qc.invalidateQueries({ queryKey: ["platform-users"] });
    },
    onError: (err) => setMessage(errorMessage(err)),
  });

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
        <div className="rounded-2xl border border-stone-200 bg-white dark:border-stone-800 dark:bg-stone-900">
          <div className="border-b border-stone-200 p-6 dark:border-stone-800">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-forest-700" />
              <h2 className="text-lg font-semibold">User roles</h2>
            </div>
            <p className="mt-1 text-sm text-stone-500">
              Assign workspace roles. Users need a role allowed above (or admin) to use the CMS.
            </p>
          </div>
          {usersLoading ? (
            <p className="p-6 text-sm text-stone-500">Loading users…</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-stone-50 text-left text-stone-600 dark:bg-stone-950">
                  <tr>
                    <th className="px-4 py-3 font-medium">User</th>
                    <th className="px-4 py-3 font-medium">Email</th>
                    <th className="px-4 py-3 font-medium">Role</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {(users ?? []).map((row) => (
                    <tr key={row.id} className="border-t border-stone-100 dark:border-stone-800">
                      <td className="px-4 py-3 font-medium">{row.full_name}</td>
                      <td className="px-4 py-3 text-stone-600">{row.email}</td>
                      <td className="px-4 py-3">
                        <select
                          className="input"
                          value={row.role}
                          disabled={updateUser.isPending || row.id === user?.id}
                          onChange={(e) =>
                            updateUser.mutate({ id: row.id, role: e.target.value })
                          }
                        >
                          {(roles ?? []).map((role) => (
                            <option key={role.value} value={role.value}>
                              {role.label}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={
                            row.is_active
                              ? "rounded-full bg-emerald-100 px-2 py-0.5 text-xs text-emerald-800"
                              : "rounded-full bg-stone-100 px-2 py-0.5 text-xs text-stone-600"
                          }
                        >
                          {row.is_active ? "Active" : "Inactive"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        <p className="text-sm text-stone-500">
          Only platform admins can change individual user roles. You can still manage which roles have
          CMS access above.
        </p>
      )}

      {message ? <p className="text-sm text-stone-600 dark:text-stone-300">{message}</p> : null}
    </div>
  );
}
