"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { PlatformShell } from "@/components/platform/platform-shell";
import { platformAdmin } from "@/lib/platform-api";

export default function PlatformOrganizationDetailPage() {
  const params = useParams<{ id: string }>();
  const orgId = params.id;

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

  if (isLoading || !org) {
    return (
      <PlatformShell>
        <p className="text-sm text-stone-500">Loading organization…</p>
      </PlatformShell>
    );
  }

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

        <section className="space-y-3">
          <h3 className="text-lg font-semibold">Members</h3>
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
                      <div className="font-medium">{member.full_name}</div>
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
      </div>
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
