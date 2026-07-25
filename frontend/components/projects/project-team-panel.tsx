"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Trash2, UserPlus } from "lucide-react";
import { errorMessage, plantingProjects } from "@/lib/api";
import { organizations } from "@/lib/organizations-api";

type WorkArea = { id: string; name: string };

export function ProjectTeamPanel({
  projectId,
  workAreas,
}: {
  projectId: string;
  workAreas: WorkArea[];
}) {
  const qc = useQueryClient();
  const [userId, setUserId] = useState("");
  const [role, setRole] = useState<"field_supervisor" | "field_worker">("field_worker");
  const [contractorName, setContractorName] = useState("");
  const [workAreaIds, setWorkAreaIds] = useState<string[]>([]);
  const [message, setMessage] = useState<string | null>(null);

  const { data: members = [], isLoading } = useQuery({
    queryKey: ["project-members", projectId],
    queryFn: () => plantingProjects.listMembers(projectId),
  });

  const { data: orgData } = useQuery({
    queryKey: ["org-members"],
    queryFn: () => organizations.members(),
  });

  const addMember = useMutation({
    mutationFn: () =>
      plantingProjects.addMember(projectId, {
        user_id: userId,
        role,
        contractor_name: contractorName.trim() || undefined,
        work_area_ids: workAreaIds.length ? workAreaIds : undefined,
      }),
    onSuccess: () => {
      setMessage("Member assigned to project.");
      setUserId("");
      setContractorName("");
      setWorkAreaIds([]);
      qc.invalidateQueries({ queryKey: ["project-members", projectId] });
    },
    onError: (err) => setMessage(errorMessage(err)),
  });

  const removeMember = useMutation({
    mutationFn: (memberId: string) => plantingProjects.removeMember(projectId, memberId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["project-members", projectId] }),
    onError: (err) => setMessage(errorMessage(err)),
  });

  const orgMembers = (orgData?.members || []).filter(
    (m) => m.is_active && !members.some((pm) => pm.user_id === m.id),
  );

  function toggleWorkArea(id: string) {
    setWorkAreaIds((prev) => (prev.includes(id) ? prev.filter((w) => w !== id) : [...prev, id]));
  }

  return (
    <div className="space-y-6">
      {message ? (
        <p className="rounded-lg border border-stone-200 bg-stone-50 px-4 py-3 text-sm">{message}</p>
      ) : null}

      <div className="card space-y-4">
        <div className="flex items-center gap-2">
          <UserPlus className="h-4 w-4 text-forest-700" />
          <h3 className="font-medium">Add org member to project</h3>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="kpi-label">Organization member</label>
            <select className="input mt-1" value={userId} onChange={(e) => setUserId(e.target.value)}>
              <option value="">Select member…</option>
              {orgMembers.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.full_name} ({m.org_role || m.role})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="kpi-label">Project role</label>
            <select
              className="input mt-1"
              value={role}
              onChange={(e) => setRole(e.target.value as typeof role)}
            >
              <option value="field_supervisor">Field supervisor</option>
              <option value="field_worker">Field worker</option>
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="kpi-label">Contractor name (optional)</label>
            <input
              className="input mt-1"
              value={contractorName}
              onChange={(e) => setContractorName(e.target.value)}
              placeholder="ABC Contractors Pvt Ltd"
            />
          </div>
        </div>
        {workAreas.length > 0 ? (
          <div>
            <label className="kpi-label">Work areas (leave empty for all)</label>
            <div className="mt-2 flex flex-wrap gap-2">
              {workAreas.map((area) => (
                <label
                  key={area.id}
                  className="flex items-center gap-2 rounded-full border border-stone-200 px-3 py-1 text-sm"
                >
                  <input
                    type="checkbox"
                    checked={workAreaIds.includes(area.id)}
                    onChange={() => toggleWorkArea(area.id)}
                  />
                  {area.name}
                </label>
              ))}
            </div>
          </div>
        ) : null}
        <button
          type="button"
          className="btn-primary"
          disabled={!userId || addMember.isPending}
          onClick={() => addMember.mutate()}
        >
          {addMember.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Add to project
        </button>
      </div>

      <div className="card overflow-hidden p-0">
        <div className="border-b border-stone-200 px-4 py-3">
          <h3 className="font-medium">Project team</h3>
        </div>
        {isLoading ? (
          <p className="px-4 py-6 text-sm text-stone-500">Loading team…</p>
        ) : !members.length ? (
          <p className="px-4 py-6 text-sm text-stone-500">No members assigned yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-stone-50 text-left text-xs uppercase text-stone-500">
              <tr>
                <th className="px-4 py-2">Member</th>
                <th className="px-4 py-2">Role</th>
                <th className="px-4 py-2">Contractor</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody>
              {members.map((m) => (
                <tr key={m.id} className="border-t border-stone-100">
                  <td className="px-4 py-2">
                    <div className="font-medium">{m.user_name || "—"}</div>
                    <div className="text-xs text-stone-500">{m.user_email}</div>
                  </td>
                  <td className="px-4 py-2 capitalize">{m.role.replace(/_/g, " ")}</td>
                  <td className="px-4 py-2">{m.contractor_name || "—"}</td>
                  <td className="px-4 py-2 text-right">
                    <button
                      type="button"
                      className="btn-ghost text-rose-700"
                      onClick={() => removeMember.mutate(m.id)}
                      disabled={removeMember.isPending}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
