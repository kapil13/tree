"use client";

import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Copy, Loader2, RefreshCw, UserPlus, Users, X } from "lucide-react";
import { errorMessage } from "@/lib/api";
import { organizations, type OrgBulkInviteRowError, type OrgMember } from "@/lib/organizations-api";
import { useAuth } from "@/lib/auth-store";
import { isOrgAdmin } from "@/lib/nav-access";

const ORG_ROLES = [
  { value: "manager", label: "Program manager" },
  { value: "supervisor", label: "Field supervisor" },
  { value: "worker", label: "Field worker" },
  { value: "viewer", label: "Viewer / auditor" },
] as const;

const ERROR_LABELS: Record<string, string> = {
  email_or_phone_required: "Email or phone required",
  invalid_org_role: "Invalid role",
  invalid_phone: "Invalid phone number",
  user_in_other_org: "User belongs to another organization",
};

export function OrgTeamPanel() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const admin = isOrgAdmin(user);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [orgRole, setOrgRole] = useState<(typeof ORG_ROLES)[number]["value"]>("worker");
  const [csvText, setCsvText] = useState("");
  const [rowErrors, setRowErrors] = useState<OrgBulkInviteRowError[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["org-members"],
    queryFn: () => organizations.members(),
    enabled: Boolean(user?.organization_id),
  });

  const { data: activity } = useQuery({
    queryKey: ["org-team-activity"],
    queryFn: () => organizations.teamActivity(1, 20),
    enabled: admin,
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
      const link = res.delivery?.invite_link ?? inviteLink(res.invite?.invite_token);
      const deliveryNote =
        res.delivery?.sms_sent || res.delivery?.email_sent
          ? ` (${res.delivery.sms_sent ? "SMS sent" : ""}${res.delivery.sms_sent && res.delivery.email_sent ? ", " : ""}${res.delivery.email_sent ? "email sent" : ""})`
          : " (share link manually — SMS/email pending API keys)";
      setMessage(
        res.status === "added"
          ? `${fullName} was added to your organization.`
          : `Invite created for ${email || phone}.${deliveryNote} Link: ${link}`,
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
      setRowErrors(res.row_errors ?? []);
      setMessage(`Bulk import: ${res.added} added, ${res.invited} invited, ${res.errors} errors.`);
      if (res.errors === 0) setCsvText("");
      qc.invalidateQueries({ queryKey: ["org-members"] });
    },
    onError: (err) => setMessage(errorMessage(err)),
  });

  const resendInvite = useMutation({
    mutationFn: (inviteId: string) => organizations.resendInvite(inviteId),
    onSuccess: (res) => {
      const note =
        res.delivery?.sms_sent || res.delivery?.email_sent
          ? "Notification resent."
          : "Invite link refreshed — share manually until SMS/email keys are configured.";
      setMessage(note);
      qc.invalidateQueries({ queryKey: ["org-members"] });
    },
    onError: (err) => setMessage(errorMessage(err)),
  });

  const revokeInvite = useMutation({
    mutationFn: (inviteId: string) => organizations.revokeInvite(inviteId),
    onSuccess: () => {
      setMessage("Invite revoked.");
      qc.invalidateQueries({ queryKey: ["org-members"] });
    },
    onError: (err) => setMessage(errorMessage(err)),
  });

  async function downloadCsvExport() {
    try {
      const csv = await organizations.exportMembersCsv();
      const blob = new Blob([csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${data?.organization.slug ?? "team"}-export.csv`;
      a.click();
      URL.revokeObjectURL(url);
      setMessage("Team roster exported.");
    } catch (err) {
      setMessage(errorMessage(err));
    }
  }

  const transferOwnership = useMutation({
    mutationFn: (memberId: string) => organizations.transferOwnership(memberId),
    onSuccess: () => {
      setMessage("Organization ownership transferred.");
      qc.invalidateQueries({ queryKey: ["org-members"] });
      qc.invalidateQueries({ queryKey: ["org-team-activity"] });
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

  async function copyInviteLink(token: string) {
    const link = inviteLink(token);
    try {
      await navigator.clipboard.writeText(link);
      setCopiedToken(token);
      setTimeout(() => setCopiedToken(null), 2000);
    } catch {
      setMessage(`Copy this link: ${link}`);
    }
  }

  function handleCsvFile(file: File | null) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setCsvText(String(reader.result ?? ""));
      setRowErrors([]);
    };
    reader.readAsText(file);
  }

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
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <UserPlus className="h-4 w-4 text-forest-700" />
              <h3 className="font-medium">Invite team member</h3>
            </div>
            <button type="button" className="btn-secondary text-xs" onClick={() => void downloadCsvExport()}>
              Export roster CSV
            </button>
          </div>
          <p className="text-xs text-stone-500">
            SMS and email delivery use MSG91/Gmail when API keys are configured. Until then, copy the invite link
            from pending invites below.
          </p>
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
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => handleCsvFile(e.target.files?.[0] ?? null)}
            />
            <div className="mb-2 flex flex-wrap gap-2">
              <button type="button" className="btn-secondary text-xs" onClick={() => fileInputRef.current?.click()}>
                Upload CSV file
              </button>
              {csvText ? (
                <span className="self-center text-xs text-stone-500">{parseCsv(csvText).length} rows loaded</span>
              ) : null}
            </div>
            <textarea
              className="input min-h-[100px] font-mono text-xs"
              value={csvText}
              onChange={(e) => {
                setCsvText(e.target.value);
                setRowErrors([]);
              }}
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
            {rowErrors.length > 0 ? (
              <div className="mt-3 overflow-x-auto rounded-lg border border-rose-200">
                <table className="w-full text-xs">
                  <thead className="bg-rose-50 text-left text-rose-900">
                    <tr>
                      <th className="px-3 py-2">Row</th>
                      <th className="px-3 py-2">Name</th>
                      <th className="px-3 py-2">Contact</th>
                      <th className="px-3 py-2">Error</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rowErrors.map((row) => (
                      <tr key={row.row} className="border-t border-rose-100">
                        <td className="px-3 py-2">{row.row}</td>
                        <td className="px-3 py-2">{row.full_name}</td>
                        <td className="px-3 py-2">{row.email || row.phone || "—"}</td>
                        <td className="px-3 py-2 text-rose-800">{ERROR_LABELS[row.error] ?? row.error}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}
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
                onTransferOwner={
                  admin && member.id !== user?.id
                    ? () => transferOwnership.mutate(member.id)
                    : undefined
                }
              />
            ))}
          </tbody>
        </table>
      </div>

      {admin && activity && activity.items.length > 0 ? (
        <div className="card space-y-2">
          <h3 className="font-medium">Recent team activity</h3>
          <ul className="space-y-2 text-sm">
            {activity.items.map((row) => (
              <li key={row.id} className="rounded-lg border border-stone-200 px-3 py-2 dark:border-stone-700">
                <span className="font-mono text-xs text-forest-800">{row.action}</span>
                <span className="ml-2 text-xs text-stone-500">
                  {new Date(row.created_at).toLocaleString()}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {admin && data.pending_invites.length > 0 ? (
        <div className="card space-y-3">
          <h3 className="font-medium">Pending invites</h3>
          {data.pending_invites.map((inv) => (
            <div
              key={inv.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-stone-200 px-3 py-2 text-sm dark:border-stone-700"
            >
              <span>
                {inv.full_name} · {inv.email || inv.phone} · {inv.org_role}
              </span>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  className="btn-ghost inline-flex items-center gap-1 text-xs"
                  onClick={() => void copyInviteLink(inv.invite_token)}
                >
                  {copiedToken === inv.invite_token ? (
                    <Check className="h-3.5 w-3.5 text-forest-700" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                  Copy link
                </button>
                <button
                  type="button"
                  className="btn-ghost inline-flex items-center gap-1 text-xs"
                  disabled={resendInvite.isPending}
                  onClick={() => resendInvite.mutate(inv.id)}
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  Resend
                </button>
                <button
                  type="button"
                  className="btn-ghost inline-flex items-center gap-1 text-xs text-rose-700"
                  disabled={revokeInvite.isPending}
                  onClick={() => revokeInvite.mutate(inv.id)}
                >
                  <X className="h-3.5 w-3.5" />
                  Revoke
                </button>
              </div>
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
  onTransferOwner,
}: {
  member: OrgMember;
  admin: boolean;
  currentUserId?: string;
  onUpdate: (payload: { org_role?: string; is_active?: boolean; is_org_admin?: boolean }) => void;
  onTransferOwner?: () => void;
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
              {onTransferOwner ? (
                <button type="button" className="btn-ghost text-xs" onClick={onTransferOwner}>
                  Make owner
                </button>
              ) : null}
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
