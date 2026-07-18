"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Building2,
  KeyRound,
  Layers,
  ScrollText,
  Shield,
  Users,
} from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/lib/auth-store";
import { adminApi, errorMessage } from "@/lib/api";
import { isPlatformAdmin, isSuperadmin } from "@/lib/auth-utils";
import { cn } from "@/lib/cn";

type Tab = "overview" | "users" | "roles" | "modules" | "orgs" | "audit";

const TABS: { id: Tab; label: string; icon: typeof Users }[] = [
  { id: "overview", label: "Overview", icon: Layers },
  { id: "users", label: "Users", icon: Users },
  { id: "roles", label: "Roles", icon: Shield },
  { id: "modules", label: "Modules", icon: KeyRound },
  { id: "orgs", label: "Organizations", icon: Building2 },
  { id: "audit", label: "Audit log", icon: ScrollText },
];

const ALL_ROLES = [
  "user",
  "farmer",
  "ngo",
  "corporate",
  "government",
  "admin",
  "superadmin",
];

function StatCard({ label, value, hint }: { label: string; value: number | string; hint?: string }) {
  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-4 dark:border-stone-800 dark:bg-stone-900">
      <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold">{value}</p>
      {hint ? <p className="mt-1 text-xs text-stone-500">{hint}</p> : null}
    </div>
  );
}

export function AdminConsole() {
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>("overview");
  const qc = useQueryClient();
  const canAdmin = isPlatformAdmin(user?.role);
  const canSuper = isSuperadmin(user?.role);

  const overview = useQuery({
    queryKey: ["admin", "overview"],
    queryFn: () => adminApi.overview(),
    enabled: canAdmin,
  });
  const users = useQuery({
    queryKey: ["admin", "users"],
    queryFn: () => adminApi.users(),
    enabled: canAdmin && tab === "users",
  });
  const roles = useQuery({
    queryKey: ["admin", "roles"],
    queryFn: () => adminApi.roles(),
    enabled: canAdmin && tab === "roles",
  });
  const modules = useQuery({
    queryKey: ["admin", "modules"],
    queryFn: () => adminApi.moduleRules(),
    enabled: canAdmin && tab === "modules",
  });
  const orgs = useQuery({
    queryKey: ["admin", "orgs"],
    queryFn: () => adminApi.organizations(),
    enabled: canAdmin && tab === "orgs",
  });
  const audit = useQuery({
    queryKey: ["admin", "audit"],
    queryFn: () => adminApi.auditLogs(),
    enabled: canAdmin && tab === "audit",
  });

  const [userForm, setUserForm] = useState({
    email: "",
    password: "",
    full_name: "",
    role: "user",
  });
  const [message, setMessage] = useState<string | null>(null);
  const [passwordUserId, setPasswordUserId] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState("");

  const createUser = useMutation({
    mutationFn: () => adminApi.createUser(userForm),
    onSuccess: () => {
      setMessage("User created.");
      setUserForm({ email: "", password: "", full_name: "", role: "user" });
      qc.invalidateQueries({ queryKey: ["admin", "users"] });
      qc.invalidateQueries({ queryKey: ["admin", "overview"] });
    },
    onError: (err) => setMessage(errorMessage(err)),
  });

  const resetPassword = useMutation({
    mutationFn: () => adminApi.resetPassword(passwordUserId!, newPassword),
    onSuccess: () => {
      setMessage("Password reset.");
      setPasswordUserId(null);
      setNewPassword("");
    },
    onError: (err) => setMessage(errorMessage(err)),
  });

  const updateModule = useMutation({
    mutationFn: ({ key, enabled }: { key: string; enabled: boolean }) =>
      adminApi.updateModuleRule(key, { enabled }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "modules"] }),
    onError: (err) => setMessage(errorMessage(err)),
  });

  const updateUserRole = useMutation({
    mutationFn: ({ id, role, is_active }: { id: string; role?: string; is_active?: boolean }) =>
      adminApi.updateUser(id, { role, is_active }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "users"] });
      setMessage("User updated.");
    },
    onError: (err) => setMessage(errorMessage(err)),
  });

  if (!canAdmin) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-800">
        Platform admin access required.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">Platform</p>
          <h1 className="text-3xl font-semibold">Superadmin console</h1>
          <p className="mt-1 text-sm text-stone-600 dark:text-stone-300">
            Users, roles, module rules, organizations, and audit trail.
          </p>
        </div>
        <div className="rounded-full bg-stone-900 px-3 py-1 text-xs font-medium text-white dark:bg-stone-100 dark:text-stone-900">
          {user?.role}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={cn(
              "inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium",
              tab === id
                ? "bg-forest-700 text-white"
                : "bg-white text-stone-700 ring-1 ring-stone-200 dark:bg-stone-900 dark:text-stone-200 dark:ring-stone-700",
            )}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      {message ? (
        <p className="rounded-lg bg-stone-100 px-3 py-2 text-sm text-stone-700 dark:bg-stone-800 dark:text-stone-200">
          {message}
        </p>
      ) : null}

      {tab === "overview" && (
        <div className="space-y-4">
          {overview.isLoading ? (
            <p className="text-sm text-stone-500">Loading stats…</p>
          ) : overview.data ? (
            <>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <StatCard label="Users" value={overview.data.users_total} hint={`${overview.data.users_active} active`} />
                <StatCard label="Trees" value={overview.data.trees_total} />
                <StatCard label="Organizations" value={overview.data.organizations_total} />
                <StatCard label="Projects" value={overview.data.planting_projects_total} />
                <StatCard label="Plantations" value={overview.data.plantation_fences_total} />
                <StatCard label="Bioacoustic" value={overview.data.bioacoustic_recordings_total} />
                <StatCard label="Open violations" value={overview.data.compliance_violations_open} />
                <StatCard label="Audit (24h)" value={overview.data.audit_events_24h} />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-2xl border border-stone-200 bg-white p-4 dark:border-stone-800 dark:bg-stone-900">
                  <h3 className="font-semibold">Users by role</h3>
                  <ul className="mt-3 space-y-1 text-sm">
                    {Object.entries(overview.data.users_by_role).map(([role, count]) => (
                      <li key={role} className="flex justify-between">
                        <span className="capitalize">{role}</span>
                        <span>{count}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="rounded-2xl border border-stone-200 bg-white p-4 dark:border-stone-800 dark:bg-stone-900">
                  <h3 className="font-semibold">Trees by health</h3>
                  <ul className="mt-3 space-y-1 text-sm">
                    {Object.entries(overview.data.trees_by_status).map(([status, count]) => (
                      <li key={status} className="flex justify-between capitalize">
                        <span>{status}</span>
                        <span>{count}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </>
          ) : null}
        </div>
      )}

      {tab === "users" && (
        <div className="space-y-6">
          {canSuper ? (
            <div className="rounded-2xl border border-stone-200 bg-white p-4 dark:border-stone-800 dark:bg-stone-900">
              <h3 className="font-semibold">Create user</h3>
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <input
                  className="input"
                  placeholder="Email"
                  value={userForm.email}
                  onChange={(e) => setUserForm((f) => ({ ...f, email: e.target.value }))}
                />
                <input
                  className="input"
                  placeholder="Full name"
                  value={userForm.full_name}
                  onChange={(e) => setUserForm((f) => ({ ...f, full_name: e.target.value }))}
                />
                <input
                  className="input"
                  type="password"
                  placeholder="Password"
                  value={userForm.password}
                  onChange={(e) => setUserForm((f) => ({ ...f, password: e.target.value }))}
                />
                <select
                  className="input"
                  value={userForm.role}
                  onChange={(e) => setUserForm((f) => ({ ...f, role: e.target.value }))}
                >
                  {ALL_ROLES.map((role) => (
                    <option key={role} value={role}>
                      {role}
                    </option>
                  ))}
                </select>
              </div>
              <button
                type="button"
                className="btn-primary mt-3"
                disabled={createUser.isPending}
                onClick={() => createUser.mutate()}
              >
                Create user
              </button>
            </div>
          ) : null}

          <div className="overflow-x-auto rounded-2xl border border-stone-200 bg-white dark:border-stone-800 dark:bg-stone-900">
            <table className="min-w-full text-sm">
              <thead className="border-b border-stone-200 text-left text-xs uppercase text-stone-500 dark:border-stone-700">
                <tr>
                  <th className="px-4 py-3">User</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Org</th>
                  <th className="px-4 py-3">Status</th>
                  {canSuper ? <th className="px-4 py-3">Actions</th> : null}
                </tr>
              </thead>
              <tbody>
                {(users.data || []).map((u) => (
                  <tr key={u.id} className="border-b border-stone-100 dark:border-stone-800">
                    <td className="px-4 py-3">
                      <div className="font-medium">{u.full_name}</div>
                      <div className="text-xs text-stone-500">{u.email}</div>
                    </td>
                    <td className="px-4 py-3">
                      {canSuper ? (
                        <select
                          className="input py-1 text-xs"
                          value={u.role}
                          onChange={(e) =>
                            updateUserRole.mutate({ id: u.id, role: e.target.value })
                          }
                        >
                          {ALL_ROLES.map((role) => (
                            <option key={role} value={role}>
                              {role}
                            </option>
                          ))}
                        </select>
                      ) : (
                        u.role
                      )}
                    </td>
                    <td className="px-4 py-3">{u.organization_name || "—"}</td>
                    <td className="px-4 py-3">
                      {canSuper ? (
                        <button
                          type="button"
                          className="text-xs underline"
                          onClick={() =>
                            updateUserRole.mutate({ id: u.id, is_active: !u.is_active })
                          }
                        >
                          {u.is_active ? "Active" : "Inactive"}
                        </button>
                      ) : u.is_active ? (
                        "Active"
                      ) : (
                        "Inactive"
                      )}
                    </td>
                    {canSuper ? (
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          className="text-xs text-forest-700 underline"
                          onClick={() => setPasswordUserId(u.id)}
                        >
                          Reset password
                        </button>
                      </td>
                    ) : null}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {passwordUserId && canSuper ? (
            <div className="flex flex-wrap items-end gap-3 rounded-2xl border border-stone-200 bg-white p-4 dark:border-stone-800 dark:bg-stone-900">
              <input
                className="input"
                type="password"
                placeholder="New password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
              <button
                type="button"
                className="btn-primary"
                disabled={resetPassword.isPending || newPassword.length < 8}
                onClick={() => resetPassword.mutate()}
              >
                Save password
              </button>
              <button type="button" className="btn-ghost" onClick={() => setPasswordUserId(null)}>
                Cancel
              </button>
            </div>
          ) : null}
        </div>
      )}

      {tab === "roles" && (
        <div className="grid gap-4 md:grid-cols-2">
          {(roles.data || []).map((r) => (
            <div
              key={r.role}
              className="rounded-2xl border border-stone-200 bg-white p-4 dark:border-stone-800 dark:bg-stone-900"
            >
              <div className="flex items-center justify-between">
                <h3 className="font-semibold capitalize">{r.role}</h3>
                {r.is_platform_admin ? (
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-900">
                    Platform admin
                  </span>
                ) : null}
              </div>
              <ul className="mt-3 flex flex-wrap gap-1">
                {r.permissions.map((p) => (
                  <li
                    key={p}
                    className="rounded bg-stone-100 px-2 py-0.5 text-xs dark:bg-stone-800"
                  >
                    {p}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}

      {tab === "modules" && (
        <div className="space-y-3">
          {(modules.data || []).map((m) => (
            <div
              key={m.module_key}
              className="flex flex-col gap-3 rounded-2xl border border-stone-200 bg-white p-4 md:flex-row md:items-center md:justify-between dark:border-stone-800 dark:bg-stone-900"
            >
              <div>
                <p className="font-semibold">{m.label}</p>
                <p className="text-sm text-stone-500">{m.description}</p>
                <p className="mt-1 text-xs text-stone-500">
                  Roles: {m.allowed_roles.join(", ") || "none"}
                </p>
              </div>
              {canSuper ? (
                <button
                  type="button"
                  className={cn(
                    "rounded-full px-4 py-2 text-sm font-medium",
                    m.enabled ? "bg-forest-700 text-white" : "bg-stone-200 text-stone-700",
                  )}
                  onClick={() => updateModule.mutate({ key: m.module_key, enabled: !m.enabled })}
                >
                  {m.enabled ? "Enabled" : "Disabled"}
                </button>
              ) : (
                <span className="text-sm">{m.enabled ? "Enabled" : "Disabled"}</span>
              )}
            </div>
          ))}
        </div>
      )}

      {tab === "orgs" && (
        <div className="overflow-x-auto rounded-2xl border border-stone-200 bg-white dark:border-stone-800 dark:bg-stone-900">
          <table className="min-w-full text-sm">
            <thead className="border-b border-stone-200 text-left text-xs uppercase text-stone-500 dark:border-stone-700">
              <tr>
                <th className="px-4 py-3">Organization</th>
                <th className="px-4 py-3">Users</th>
                <th className="px-4 py-3">Trees</th>
                <th className="px-4 py-3">Plantations</th>
              </tr>
            </thead>
            <tbody>
              {(orgs.data || []).map((o) => (
                <tr key={o.id} className="border-b border-stone-100 dark:border-stone-800">
                  <td className="px-4 py-3">
                    <div className="font-medium">{o.name}</div>
                    <div className="text-xs text-stone-500">{o.slug}</div>
                  </td>
                  <td className="px-4 py-3">{o.user_count}</td>
                  <td className="px-4 py-3">{o.tree_count}</td>
                  <td className="px-4 py-3">{o.plantation_fence_count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === "audit" && (
        <div className="space-y-2">
          {(audit.data || []).map((log) => (
            <div
              key={log.id}
              className="rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm dark:border-stone-800 dark:bg-stone-900"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-medium">{log.action}</span>
                <span className="text-xs text-stone-500">
                  {new Date(log.created_at).toLocaleString()}
                </span>
              </div>
              <p className="text-xs text-stone-500">
                {log.actor_email || "system"} · {log.resource_type || "—"}
                {log.ip ? ` · ${log.ip}` : ""}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
