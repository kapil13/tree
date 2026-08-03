"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Download } from "lucide-react";
import { PlatformShell } from "@/components/platform/platform-shell";
import { OrgFeatureFlagsPanel } from "@/components/platform/org-feature-flags-panel";
import { OrgSuspendModal } from "@/components/platform/org-suspend-modal";
import { StepUpModal } from "@/components/platform/step-up-modal";
import { errorMessage } from "@/lib/api";
import { platformAdmin } from "@/lib/platform-api";
import { isFullPlatformAdmin } from "@/lib/platform-access";
import { useAuth } from "@/lib/auth-store";
import { downloadBlob } from "@/lib/download-blob";

export default function PlatformOrganizationDetailPage() {
  const params = useParams<{ id: string }>();
  const orgId = params.id;
  const qc = useQueryClient();
  const { user } = useAuth();
  const fullAdmin = isFullPlatformAdmin(user);
  const [message, setMessage] = useState<string | null>(null);
  const [transferOwnerId, setTransferOwnerId] = useState("");
  const [stepUpOpen, setStepUpOpen] = useState(false);
  const [suspendOpen, setSuspendOpen] = useState(false);

  const { data: org, isLoading } = useQuery({
    queryKey: ["platform-organization", orgId],
    queryFn: () => platformAdmin.getOrganization(orgId),
  });

  const { data: members } = useQuery({
    queryKey: ["platform-org-members", orgId],
    queryFn: () => platformAdmin.listOrgMembers(orgId, { page_size: 50 }),
    enabled: Boolean(orgId),
  });

  const { data: projects } = useQuery({
    queryKey: ["platform-org-projects", orgId],
    queryFn: () => platformAdmin.listOrgProjects(orgId, { page_size: 50 }),
    enabled: Boolean(orgId),
  });

  const transferOwnership = useMutation({
    mutationFn: (password: string) =>
      platformAdmin.updateOrganization(orgId, {
        owner_user_id: transferOwnerId,
        password_confirm: password,
      }),
    onSuccess: () => {
      setStepUpOpen(false);
      setMessage("Organization owner updated.");
      qc.invalidateQueries({ queryKey: ["platform-organization", orgId] });
      qc.invalidateQueries({ queryKey: ["platform-org-members", orgId] });
    },
    onError: (err) => setMessage(errorMessage(err)),
  });

  const updateOrg = useMutation({
    mutationFn: (payload: {
      is_active?: boolean;
      reason?: string;
      revoke_member_sessions?: boolean;
      password_confirm?: string;
    }) => platformAdmin.updateOrganization(orgId, payload),
    onSuccess: () => {
      setSuspendOpen(false);
      setMessage("Organization updated.");
      qc.invalidateQueries({ queryKey: ["platform-organization", orgId] });
      qc.invalidateQueries({ queryKey: ["platform-organizations"] });
    },
    onError: (err) => setMessage(errorMessage(err)),
  });

  const exportMembers = useMutation({
    mutationFn: () => platformAdmin.exportOrgMembers(orgId),
    onSuccess: (blob) => {
      downloadBlob(blob, `org-${orgId}-members.csv`);
      setMessage("Members exported.");
    },
    onError: (err) => setMessage(errorMessage(err)),
  });

  if (isLoading || !org) {
    return (
      <PlatformShell>
        <p className="text-sm text-stone-500">Loading organization…</p>
      </PlatformShell>
    );
  }

  const owner = members?.items.find((m) => m.id === org.owner_user_id);
  const eligibleOwners = (members?.items ?? []).filter((m) => m.is_active);

  return (
    <PlatformShell>
      <div className="space-y-6">
        <div>
          <Link href="/platform/organizations" className="text-sm text-forest-700 hover:underline">
            ← Organizations
          </Link>
          <h2 className="mt-2 text-2xl font-semibold">{org.name}</h2>
          <p className="text-sm text-stone-500">
            {org.slug} · {org.type} · {org.is_active ? "Active" : "Suspended"}
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <Stat label="Members" value={String(org.member_count)} />
          <Stat label="Projects" value={String(org.project_count)} />
          <Stat
            label="Created"
            value={new Date(org.created_at).toLocaleDateString()}
          />
        </div>

        {fullAdmin ? (
          <section className="rounded-2xl border border-stone-200 bg-white p-4 dark:border-stone-800 dark:bg-stone-900">
            <h3 className="text-lg font-semibold">Organization status</h3>
            <p className="mt-1 text-sm text-stone-600">
              {org.is_active
                ? "This organization is active. Suspend to block member access."
                : "This organization is suspended. Members cannot sign in."}
            </p>
            <div className="mt-3">
              {org.is_active ? (
                <button
                  type="button"
                  className="btn-secondary text-rose-700"
                  onClick={() => setSuspendOpen(true)}
                >
                  Suspend organization
                </button>
              ) : (
                <button
                  type="button"
                  className="btn-primary"
                  disabled={updateOrg.isPending}
                  onClick={() => updateOrg.mutate({ is_active: true })}
                >
                  Reactivate organization
                </button>
              )}
            </div>
          </section>
        ) : null}

        {fullAdmin ? (
          <section className="rounded-2xl border border-stone-200 bg-white p-4 dark:border-stone-800 dark:bg-stone-900">
            <h3 className="text-lg font-semibold">Feature flags</h3>
            <p className="mt-1 text-sm text-stone-600">
              Toggle capabilities for this organization. Disabled features return a permission error
              for org members.
            </p>
            <div className="mt-4">
              <OrgFeatureFlagsPanel orgId={orgId} />
            </div>
          </section>
        ) : null}

        {fullAdmin ? (
          <section className="rounded-2xl border border-stone-200 bg-white p-4 dark:border-stone-800 dark:bg-stone-900">
            <h3 className="text-lg font-semibold">Ownership</h3>
            <p className="mt-1 text-sm text-stone-600">
              Current owner:{" "}
              {owner ? `${owner.full_name} (${owner.email})` : "Not assigned"}
            </p>
            <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-end">
              <label className="flex-1 text-sm">
                <span className="mb-1 block text-stone-600">Transfer to member</span>
                <select
                  className="input w-full"
                  value={transferOwnerId}
                  onChange={(e) => setTransferOwnerId(e.target.value)}
                >
                  <option value="">Select member…</option>
                  {eligibleOwners.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.full_name} ({member.email})
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                className="btn-primary"
                disabled={
                  !transferOwnerId ||
                  transferOwnerId === org.owner_user_id ||
                  transferOwnership.isPending
                }
                onClick={() => setStepUpOpen(true)}
              >
                Transfer ownership
              </button>
            </div>
          </section>
        ) : null}

        <section className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-lg font-semibold">Members</h3>
            <button
              type="button"
              className="btn-secondary inline-flex items-center gap-2 text-xs"
              disabled={exportMembers.isPending}
              onClick={() => exportMembers.mutate()}
            >
              <Download className="h-4 w-4" />
              Export CSV
            </button>
          </div>
          <div className="overflow-x-auto rounded-2xl border border-stone-200 bg-white dark:border-stone-800 dark:bg-stone-900">
            <table className="min-w-full text-sm">
              <thead className="bg-stone-50 text-left text-stone-600 dark:bg-stone-950">
                <tr>
                  <th className="px-4 py-3 font-medium">User</th>
                  <th className="px-4 py-3 font-medium">Platform role</th>
                  <th className="px-4 py-3 font-medium">Org role</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {(members?.items ?? []).map((member) => (
                  <tr key={member.id} className="border-t border-stone-100 dark:border-stone-800">
                    <td className="px-4 py-3">
                      <div className="font-medium">
                        {member.full_name}
                        {member.id === org.owner_user_id ? (
                          <span className="ml-2 text-xs text-forest-700">Owner</span>
                        ) : null}
                      </div>
                      <div className="text-xs text-stone-500">{member.email}</div>
                    </td>
                    <td className="px-4 py-3">{member.role}</td>
                    <td className="px-4 py-3">
                      {member.org_role ?? "—"}
                      {member.is_org_admin ? " (admin)" : ""}
                    </td>
                    <td className="px-4 py-3">{member.is_active ? "Active" : "Inactive"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="space-y-3">
          <h3 className="text-lg font-semibold">Planting projects</h3>
          {(projects?.items ?? []).length === 0 ? (
            <p className="text-sm text-stone-500">No projects linked to this organization.</p>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-stone-200 bg-white dark:border-stone-800 dark:bg-stone-900">
              <table className="min-w-full text-sm">
                <thead className="bg-stone-50 text-left text-stone-600 dark:bg-stone-950">
                  <tr>
                    <th className="px-4 py-3 font-medium">Project</th>
                    <th className="px-4 py-3 font-medium">Segment</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Program</th>
                  </tr>
                </thead>
                <tbody>
                  {(projects?.items ?? []).map((project) => (
                    <tr key={project.id} className="border-t border-stone-100 dark:border-stone-800">
                      <td className="px-4 py-3">
                        <div className="font-medium">{project.name}</div>
                        <div className="text-xs text-stone-500">{project.code}</div>
                      </td>
                      <td className="px-4 py-3">{project.segment}</td>
                      <td className="px-4 py-3">{project.status}</td>
                      <td className="px-4 py-3">{project.program_code ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {message ? <p className="text-sm text-stone-600">{message}</p> : null}
      </div>

      <OrgSuspendModal
        open={suspendOpen}
        orgName={org.name}
        suspending
        busy={updateOrg.isPending}
        onClose={() => setSuspendOpen(false)}
        onConfirm={(password, reason, revokeMemberSessions) =>
          updateOrg.mutate({
            is_active: false,
            reason,
            revoke_member_sessions: revokeMemberSessions,
            password_confirm: password,
          })
        }
      />

      <StepUpModal
        open={stepUpOpen}
        title="Transfer organization ownership"
        description="Re-enter your password to assign a new owner. The new owner becomes an org admin."
        confirmLabel="Transfer ownership"
        busy={transferOwnership.isPending}
        onClose={() => setStepUpOpen(false)}
        onConfirm={(password) => transferOwnership.mutate(password)}
      />
    </PlatformShell>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-4 dark:border-stone-800 dark:bg-stone-900">
      <div className="text-xs uppercase tracking-wide text-stone-500">{label}</div>
      <div className="mt-2 text-2xl font-semibold">{value}</div>
    </div>
  );
}
