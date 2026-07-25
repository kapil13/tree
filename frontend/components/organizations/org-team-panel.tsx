"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, UserPlus, Users } from "lucide-react";
import { errorMessage } from "@/lib/api";
import { organizations, type OrgMember } from "@/lib/organizations-api";
import { useAuth } from "@/lib/auth-store";
import { isOrgAdmin } from "@/lib/nav-access";

const ORG_ROLES = [
  { value: "manager", label: "Program manager" },
  { value: "supervisor", label: "Field supervisor" },
  { value: "worker", label: "Field worker" },
  { value: "viewer", label: "Viewer / auditor" },
] as const;

export function OrgTeamPanel() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const admin = isOrgAdmin(user);

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [orgRole, setOrgRole] = useState<(typeof ORG_ROLES)[number]["value"]>("worker");
  const [csvText, setCsvText] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["org-members"],
    queryFn: () => organizations.members(),
    enabled: Boolean(user?.organization_id),
  });

  const invite = useMutation({
    mutationFn: () =>
      organizations.invite({
        full_name: fullName.trim(),
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
        org_role: orgRole,
      }),
    onSuccess: (res) => {
      setMessage(
        res.status === "added"
          ? `${fullName} was added to your organization.`
          : `Invite sent to ${email || phone}. Share link: ${inviteLink(res.invite?.invite_token)}`,
      );
      setFullName("");
      setEmail("");
      setPhone("");
      qc.invalidateQueries({ queryKey: ["org-members"] });
    },
    onError: (err) => setMessage(errorMessage(err)),
  });

  const bulkInvite = useMutation({
    mutationFn: () => {
      const rows = parseCsv(csvText);
      return organizations.bulkInvite(rows);
    },
    onSuccess: (res) => {
      setMessage(`Bulk import: ${res.added} added, ${res.invited} invited, ${res.errors} errors.`);
      setCsvText("");
      qc.invalidateQueries({ queryKey: ["org-members"] });
    },
    onError: (err) => setMessage(errorMessage(err)),
  });

  const updateMember = useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string;
      payload: { org_role?: string; is_active?: boolean; is_org_admin?: boolean };
    }) => organizations.updateMember(id, payload),
    onSuccess: () => {
      setMessage("Member updated.");
      qc.invalidateQueries({ queryKey: ["org-members"] });
    },
    onError: (err) => setMessage(errorMessage(err)),
  });

  if (!user?.organization_id) {
    return (
      <p className="rounded-lg border border-dashed border-stone-300 px-4 py-8 text-center text-sm text-stone-500">
        Your account is not linked to an organization yet. Request a professional program from{" "}
        <strong>Settings → Programs</strong> and ask an admin to approve with org onboarding.
      </p>
    );
  }

  if (isLoading || !data) {
    return <p className="text-sm text-stone-500">Loading team…</p>;
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-stone-200 bg-white p-5 dark:border-stone-800 dark:bg-stone-900">
        <div className="mb-3 flex items-center gap-2">
          <Users className="h-5 w-5 text-forest-700" />
          <h2 className="text-lg font-semibold">{data.organization.name}</h2>
        </div>
        <p className="text-sm text-stone-600 dark:text-stone-300">
          {data.organization.slug} · {data.organization.type} · Programs:{" "}
          {data.organization.program_codes.join(", ") || "—"}
        </p>
      </div>

      {message ? (
        <p className="rounded-lg border border-stone-200 bg-stone-50 px-4 py-3 text-sm dark:border-stone-700 dark:bg-stone-950">
          {message}
        </p>
      ) : null}

      {admin ? (
        <div className="card space-y-4">
          <div className="flex items-center gap-2">
            <UserPlus className="h-4 w-4 text-forest-700" />
            <h3 className="font-medium">Invite team member</h3>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="kpi-label">Full name</label>
              <input className="input mt-1" value={fullName} onChange={(e) => setFullName(e.target.value)} />
            </div>
            <div>
              <label className="kpi-label">Org role</label>
              <select
                className="input mt-1"
                value={orgRole}
                onChange={(e) => setOrgRole(e.target.value as typeof orgRole)}
              >
                {ORG_ROLES.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="kpi-label">Email</label>
              <input
                className="input mt-1"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="supervisor@agency.gov.in"
              />
            </div>
            <div>
              <label className="kpi-label">Phone (optional)</label>
              <input
                className="input mt-1"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="9876543210"
              />
            </div>
          </div>
          <button
            type="button"
            className="btn-primary"
            disabled={invite.isPending || !fullName.trim() || (!email.trim() && !phone.trim())}
            onClick={() => invite.mutate()}
          >
            {invite.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Send invite
          </button>

          <div className="border-t border-stone-200 pt-4 dark:border-stone-700">
            <label className="kpi-label">Bulk CSV import</label>
            <p className="mb-2 text-xs text-stone-500">
              One member per line: full_name, email, phone, org_role (header row optional)
            </p>
            <textarea
              className="input min-h-[100px] font-mono text-xs"
              value={csvText}
              onChange={(e) => setCsvText(e.target.value)}
              placeholder={"full_name,email,phone,org_role\nRavi Kumar,ravi@contractor.in,9876543210,worker"}
            />
            <button
              type="button"
              className="btn-secondary mt-2"
              disabled={bulkInvite.isPending || !csvText.trim()}
              onClick={() => bulkInvite.mutate()}
            >
              Import CSV
            </button>
          </div>
        </div>
      ) : null}

      <div className="card overflow-hidden p-0">
        <div className="border-b border-stone-200 px-4 py-3 dark:border-stone-700">
          <h3 className="font-medium">Members ({data.members.length})</h3>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-stone-50 text-left text-xs uppercase text-stone-500 dark:bg-stone-950">
            <tr>
              <th className="px-4 py-2">Name</th>
              <th className="px-4 py-2">Contact</th>
              <th className="px-4 py-2">Role</th>
              {admin ? <th className="px-4 py-2">Actions</th> : null}
            </tr>
          </thead>
          <tbody>
            {data.members.map((member) => (
              <MemberRow
                key={member.id}
                member={member}
                admin={admin}
                currentUserId={user?.id}
                onUpdate={(payload) => updateMember.mutate({ id: member.id, payload })}
              />
            ))}
          </tbody>
        </table>
      </div>

      {admin && data.pending_invites.length > 0 ? (
        <div className="card space-y-2">
          <h3 className="font-medium">Pending invites</h3>
          {data.pending_invites.map((inv) => (
            <div key={inv.id} className="flex flex-wrap items-center justify-between gap-2 text-sm">
              <span>
                {inv.full_name} · {inv.email || inv.phone} · {inv.org_role}
              </span>
              <code className="rounded bg-stone-100 px-2 py-1 text-xs dark:bg-stone-800">
                {inviteLink(inv.invite_token)}
              </code>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function MemberRow({
  member,
  admin,
  currentUserId,
  onUpdate,
}: {
  member: OrgMember;
  admin: boolean;
  currentUserId?: string;
  onUpdate: (payload: { org_role?: string; is_active?: boolean; is_org_admin?: boolean }) => void;
}) {
  return (
    <tr className="border-t border-stone-100 dark:border-stone-800">
      <td className="px-4 py-2">
        <div className="font-medium">{member.full_name}</div>
        {member.is_org_admin ? (
          <span className="text-xs text-forest-700">Org admin</span>
        ) : null}
        {!member.is_active ? <span className="text-xs text-rose-600">Inactive</span> : null}
      </td>
      <td className="px-4 py-2 text-stone-600">
        {member.email}
        {member.phone ? <div className="text-xs">{member.phone}</div> : null}
      </td>
      <td className="px-4 py-2">
        {admin ? (
          <select
            className="input py-1 text-xs"
            value={member.org_role || "worker"}
            onChange={(e) => onUpdate({ org_role: e.target.value })}
            disabled={member.id === currentUserId}
          >
            {ORG_ROLES.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
        ) : (
          <span>{member.org_role || member.role}</span>
        )}
      </td>
      {admin ? (
        <td className="px-4 py-2">
          {member.id !== currentUserId ? (
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="btn-ghost text-xs"
                onClick={() => onUpdate({ is_org_admin: !member.is_org_admin })}
              >
                {member.is_org_admin ? "Revoke admin" : "Make admin"}
              </button>
              <button
                type="button"
                className="btn-ghost text-xs text-rose-700"
                onClick={() => onUpdate({ is_active: !member.is_active })}
              >
                {member.is_active ? "Deactivate" : "Activate"}
              </button>
            </div>
          ) : (
            <span className="text-xs text-stone-400">You</span>
          )}
        </td>
      ) : null}
    </tr>
  );
}

function inviteLink(token?: string) {
  if (!token || typeof window === "undefined") return token ? `/auth?invite=${token}` : "";
  return `${window.location.origin}/auth?invite=${token}`;
}

function parseCsv(text: string) {
  const lines = text
    .trim()
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (!lines.length) return [];
  const start = lines[0].toLowerCase().includes("full_name") ? 1 : 0;
  return lines.slice(start).map((line) => {
    const [full_name, email, phone, org_role] = line.split(",").map((c) => c.trim());
    return {
      full_name: full_name || "Team member",
      email: email || undefined,
      phone: phone || undefined,
      org_role: (org_role || "worker").toLowerCase(),
    };
  });
}
