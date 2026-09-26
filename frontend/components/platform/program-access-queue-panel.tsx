"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, ChevronDown, ChevronUp, Clock, XCircle } from "lucide-react";
import { BulkActionBar } from "@/components/platform/bulk-action-bar";
import { BulkProgramAccessPreviewModal } from "@/components/platform/bulk-program-access-preview-modal";
import { StepUpModal } from "@/components/platform/step-up-modal";
import { notifyPlatformAction, notifyPlatformError } from "@/lib/platform-admin-feedback";
import { buildBulkApprovePreview } from "@/lib/bulk-program-access-preview";
import { platformAdmin } from "@/lib/platform-api";
import { getProgramTheme } from "@/components/registration/program-theme";
import { cn } from "@/lib/cn";

type ApproveForm = {
  organization_name: string;
  organization_slug: string;
  organization_id: string;
  platform_role: "government" | "corporate" | "ngo";
  make_org_admin: boolean;
  use_existing_org: boolean;
};

const DEFAULT_APPROVE: ApproveForm = {
  organization_name: "",
  organization_slug: "",
  organization_id: "",
  platform_role: "government",
  make_org_admin: true,
  use_existing_org: false,
};

function roleForProgram(code: string): ApproveForm["platform_role"] {
  if (code.includes("corporate") || code.includes("esg")) return "corporate";
  if (code.includes("ngo")) return "ngo";
  return "government";
}

type SingleStepUp =
  | null
  | { kind: "approve"; id: string; approve: ApproveForm; note?: string }
  | { kind: "reject"; id: string; note?: string };

export function ProgramAccessQueuePanel() {
  const qc = useQueryClient();
  const [status, setStatus] = useState<"pending" | "approved" | "rejected">("pending");
  const [noteById, setNoteById] = useState<Record<string, string>>({});
  const [approveFormById, setApproveFormById] = useState<Record<string, ApproveForm>>({});
  const [expandedApprove, setExpandedApprove] = useState<Set<string>>(new Set());
  const [orgSearch, setOrgSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkPreview, setBulkPreview] = useState<null | "approve" | "reject">(null);
  const [bulkStepUp, setBulkStepUp] = useState<null | "approve" | "reject">(null);
  const [singleStepUp, setSingleStepUp] = useState<SingleStepUp>(null);

  const pendingQuery = useQuery({
    queryKey: ["platform-program-access", "pending"],
    queryFn: () => platformAdmin.listProgramAccessRequests("pending"),
  });
  const approvedQuery = useQuery({
    queryKey: ["platform-program-access", "approved"],
    queryFn: () => platformAdmin.listProgramAccessRequests("approved"),
  });
  const rejectedQuery = useQuery({
    queryKey: ["platform-program-access", "rejected"],
    queryFn: () => platformAdmin.listProgramAccessRequests("rejected"),
  });

  const requests =
    status === "pending"
      ? pendingQuery.data
      : status === "approved"
        ? approvedQuery.data
        : rejectedQuery.data;
  const isLoading =
    status === "pending"
      ? pendingQuery.isLoading
      : status === "approved"
        ? approvedQuery.isLoading
        : rejectedQuery.isLoading;

  const tabCounts = {
    pending: pendingQuery.data?.length ?? 0,
    approved: approvedQuery.data?.length ?? 0,
    rejected: rejectedQuery.data?.length ?? 0,
  };

  const { data: orgPage } = useQuery({
    queryKey: ["platform-organizations", orgSearch],
    queryFn: () => platformAdmin.listOrganizations({ search: orgSearch, page_size: 20 }),
    enabled: orgSearch.length >= 2,
  });
  const orgOptions = orgPage?.items ?? [];

  const review = useMutation({
    mutationFn: ({
      id,
      action,
      admin_note,
      approve,
      password,
    }: {
      id: string;
      action: "approve" | "reject";
      admin_note?: string;
      approve?: ApproveForm;
      password?: string;
    }) =>
      platformAdmin.reviewProgramAccessRequest(id, {
        action,
        admin_note,
        password,
        ...(action === "approve" && approve
          ? {
              organization_name: approve.use_existing_org ? undefined : approve.organization_name,
              organization_slug: approve.use_existing_org ? undefined : approve.organization_slug,
              organization_id: approve.use_existing_org ? approve.organization_id : undefined,
              platform_role: approve.platform_role,
              make_org_admin: approve.make_org_admin,
            }
          : {}),
      }),
    onSuccess: (_, vars) => {
      setSingleStepUp(null);
      notifyPlatformAction(
        vars.action === "approve"
          ? "Request approved and organization onboarded."
          : "Request rejected.",
        { audit: { actionPrefix: "platform.program_access." } },
      );
      qc.invalidateQueries({ queryKey: ["platform-program-access"] });
      qc.invalidateQueries({ queryKey: ["planting-programs"] });
      qc.invalidateQueries({ queryKey: ["platform-overview"] });
      qc.invalidateQueries({ queryKey: ["platform-audit-recent"] });
    },
    onError: (err) => notifyPlatformError(err),
  });

  const bulkReview = useMutation({
    mutationFn: ({
      action,
      password,
      admin_note,
    }: {
      action: "approve" | "reject";
      password: string;
      admin_note?: string;
    }) =>
      platformAdmin.bulkReviewProgramAccess({
        request_ids: Array.from(selectedIds),
        action,
        password,
        admin_note,
      }),
    onSuccess: (result) => {
      setBulkStepUp(null);
      setSelectedIds(new Set());
      notifyPlatformAction(
        `Bulk review complete: ${result.processed} processed, ${result.skipped} skipped.`,
        { audit: { actionPrefix: "platform.program_access.bulk_" } },
      );
      qc.invalidateQueries({ queryKey: ["platform-program-access"] });
      qc.invalidateQueries({ queryKey: ["planting-programs"] });
      qc.invalidateQueries({ queryKey: ["platform-overview"] });
      qc.invalidateQueries({ queryKey: ["platform-audit-recent"] });
    },
    onError: (err) => notifyPlatformError(err),
  });

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    const ids = (requests ?? []).map((r) => r.id);
    const allSelected = ids.length > 0 && ids.every((id) => selectedIds.has(id));
    setSelectedIds(allSelected ? new Set() : new Set(ids));
  }

  function getApproveForm(
    requestId: string,
    programCode: string,
    userName: string,
    orgProfile?: Record<string, unknown> | null,
  ): ApproveForm {
    const profileName = typeof orgProfile?.organization_name === "string" ? orgProfile.organization_name : "";
    return (
      approveFormById[requestId] ?? {
        ...DEFAULT_APPROVE,
        organization_name:
          profileName || `${userName} — ${programCode.replace(/_/g, " ")}`,
        platform_role: roleForProgram(programCode),
      }
    );
  }

  function setApproveField(
    requestId: string,
    programCode: string,
    userName: string,
    orgProfile: Record<string, unknown> | null | undefined,
    patch: Partial<ApproveForm>,
  ) {
    setApproveFormById((prev) => ({
      ...prev,
      [requestId]: { ...getApproveForm(requestId, programCode, userName, orgProfile), ...patch },
    }));
  }

  function toggleApproveExpanded(id: string) {
    setExpandedApprove((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const previewRows = buildBulkApprovePreview(requests ?? [], selectedIds);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Program access status">
        {(["pending", "approved", "rejected"] as const).map((value) => (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={status === value}
            className={status === value ? "btn-primary" : "btn-ghost"}
            onClick={() => {
              setStatus(value);
              setSelectedIds(new Set());
            }}
          >
            {value.charAt(0).toUpperCase() + value.slice(1)}
            <span
              className={cn(
                "ml-1.5 rounded-full px-1.5 py-0.5 text-[10px] font-semibold",
                status === value
                  ? "bg-white/20 text-white"
                  : "bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-300",
              )}
            >
              {tabCounts[value]}
            </span>
          </button>
        ))}
      </div>

      {status === "pending" ? (
        <BulkActionBar selectedCount={selectedIds.size} onClear={() => setSelectedIds(new Set())}>
          <button
            type="button"
            className="btn-secondary text-xs"
            onClick={() => setBulkPreview("approve")}
          >
            Approve selected
          </button>
          <button
            type="button"
            className="btn-ghost text-xs text-rose-700"
            onClick={() => setBulkPreview("reject")}
          >
            Reject selected
          </button>
        </BulkActionBar>
      ) : null}

      {isLoading ? (
        <p className="text-sm text-stone-500">Loading requests…</p>
      ) : !requests?.length ? (
        <p className="rounded-2xl border border-dashed border-stone-300 px-6 py-10 text-center text-sm text-stone-500 dark:border-stone-700">
          No {status} program access requests.
        </p>
      ) : (
        <div className="space-y-3">
          {status === "pending" ? (
            <label className="inline-flex items-center gap-2 text-sm text-stone-600">
              <input
                type="checkbox"
                checked={
                  (requests?.length ?? 0) > 0 &&
                  (requests ?? []).every((r) => selectedIds.has(r.id))
                }
                onChange={toggleSelectAll}
              />
              Select all on page
            </label>
          ) : null}
          {requests.map((request) => {
            const theme = getProgramTheme(request.program_code);
            const Icon = theme.icon;
            const approve = getApproveForm(
              request.id,
              request.program_code,
              request.user_full_name,
              request.org_profile,
            );
            const profile = request.org_profile;
            const formOpen = expandedApprove.has(request.id);
            return (
              <div
                key={request.id}
                className="rounded-2xl border border-stone-200 bg-white p-5 dark:border-stone-800 dark:bg-stone-900"
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0 flex-1 space-y-3">
                    {status === "pending" ? (
                      <input
                        type="checkbox"
                        className="mb-1"
                        checked={selectedIds.has(request.id)}
                        onChange={() => toggleSelect(request.id)}
                      />
                    ) : null}
                    <div className="flex items-start gap-3">
                      <div
                        className={cn(
                          "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-white",
                          theme.gradient,
                        )}
                      >
                        <Icon className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="font-semibold text-stone-900 dark:text-stone-50">
                          {request.program_name}
                        </p>
                        <p className="text-sm text-stone-600 dark:text-stone-300">
                          {request.user_full_name} · {request.user_email}
                          {request.user_phone ? ` · ${request.user_phone}` : ""}
                        </p>
                        <p className="mt-1 text-xs text-stone-500">
                          Submitted {new Date(request.created_at).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    {profile ? (
                      <div className="rounded-lg border border-stone-200 bg-stone-50 px-4 py-3 text-sm dark:border-stone-700 dark:bg-stone-950">
                        <p className="mb-2 font-medium text-stone-800 dark:text-stone-100">
                          Organization profile
                        </p>
                        <dl className="grid gap-1 sm:grid-cols-2">
                          {[
                            ["Organization", profile.organization_name],
                            ["Type", profile.organization_type],
                            ["Designation", profile.designation],
                            ["City", profile.city],
                            ["State", profile.state],
                            ["Work email", profile.work_email],
                            ["Phone", profile.contact_phone],
                            ["Department", profile.department],
                            ["Registration ID", profile.registration_id],
                            ["Website", profile.website],
                          ]
                            .filter(([, v]) => v)
                            .map(([label, value]) => (
                              <div key={String(label)}>
                                <dt className="text-xs text-stone-500">{String(label)}</dt>
                                <dd className="text-stone-800 dark:text-stone-200">{String(value)}</dd>
                              </div>
                            ))}
                        </dl>
                        {profile.use_case_summary ? (
                          <p className="mt-2 text-stone-700 dark:text-stone-300">
                            {String(profile.use_case_summary)}
                          </p>
                        ) : null}
                      </div>
                    ) : null}
                    {request.message && !profile?.use_case_summary ? (
                      <p className="rounded-lg bg-stone-50 px-4 py-3 text-sm text-stone-700 dark:bg-stone-950 dark:text-stone-200">
                        {request.message}
                      </p>
                    ) : null}
                    {request.admin_note && status !== "pending" ? (
                      <p className="text-sm text-stone-500">Admin note: {request.admin_note}</p>
                    ) : null}
                  </div>

                  {status === "pending" ? (
                    <div className="w-full space-y-3 lg:w-96">
                      <button
                        type="button"
                        className="btn-ghost flex w-full items-center justify-between text-sm"
                        onClick={() => toggleApproveExpanded(request.id)}
                      >
                        <span>Organization onboarding</span>
                        {formOpen ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </button>
                      {formOpen ? (
                        <div className="rounded-xl border border-forest-200 bg-forest-50/50 p-4 dark:border-forest-900 dark:bg-forest-950/20">
                          <label className="mb-2 flex items-center gap-2 text-sm">
                            <input
                              type="checkbox"
                              checked={approve.use_existing_org}
                              onChange={(e) =>
                                setApproveField(
                                  request.id,
                                  request.program_code,
                                  request.user_full_name,
                                  request.org_profile,
                                  { use_existing_org: e.target.checked },
                                )
                              }
                            />
                            Link to existing organization
                          </label>
                          {approve.use_existing_org ? (
                            <div className="space-y-2">
                              <input
                                className="input text-sm"
                                placeholder="Search org name or slug"
                                value={orgSearch}
                                onChange={(e) => setOrgSearch(e.target.value)}
                              />
                              <select
                                className="input text-sm"
                                value={approve.organization_id}
                                onChange={(e) =>
                                  setApproveField(
                                    request.id,
                                    request.program_code,
                                    request.user_full_name,
                                    request.org_profile,
                                    { organization_id: e.target.value },
                                  )
                                }
                              >
                                <option value="">Select organization…</option>
                                {orgOptions.map((o) => (
                                  <option key={o.id} value={o.id}>
                                    {o.name} ({o.slug})
                                  </option>
                                ))}
                              </select>
                            </div>
                          ) : (
                            <div className="space-y-2">
                              <input
                                className="input text-sm"
                                placeholder="Organization name"
                                value={approve.organization_name}
                                onChange={(e) =>
                                  setApproveField(
                                    request.id,
                                    request.program_code,
                                    request.user_full_name,
                                    request.org_profile,
                                    { organization_name: e.target.value },
                                  )
                                }
                              />
                              <input
                                className="input text-sm"
                                placeholder="Slug (optional)"
                                value={approve.organization_slug}
                                onChange={(e) =>
                                  setApproveField(
                                    request.id,
                                    request.program_code,
                                    request.user_full_name,
                                    request.org_profile,
                                    { organization_slug: e.target.value },
                                  )
                                }
                              />
                            </div>
                          )}
                          <div className="mt-2">
                            <label className="kpi-label">Primary contact role</label>
                            <select
                              className="input mt-1 text-sm"
                              value={approve.platform_role}
                              onChange={(e) =>
                                setApproveField(
                                  request.id,
                                  request.program_code,
                                  request.user_full_name,
                                  request.org_profile,
                                  {
                                    platform_role: e.target.value as ApproveForm["platform_role"],
                                  },
                                )
                              }
                            >
                              <option value="government">Government / Public sector</option>
                              <option value="corporate">Corporate / ESG</option>
                              <option value="ngo">NGO</option>
                            </select>
                          </div>
                          <label className="mt-2 flex items-center gap-2 text-sm">
                            <input
                              type="checkbox"
                              checked={approve.make_org_admin}
                              onChange={(e) =>
                                setApproveField(
                                  request.id,
                                  request.program_code,
                                  request.user_full_name,
                                  request.org_profile,
                                  { make_org_admin: e.target.checked },
                                )
                              }
                            />
                            Make org admin (can invite team)
                          </label>
                        </div>
                      ) : (
                        <p className="text-xs text-stone-500">
                          Defaults to{" "}
                          <span className="font-medium text-stone-700 dark:text-stone-200">
                            {approve.organization_name || "auto-named org"}
                          </span>
                          . Expand to change onboarding options.
                        </p>
                      )}
                      <textarea
                        className="input min-h-[80px] w-full text-sm"
                        placeholder="Optional note to the user"
                        value={noteById[request.id] || ""}
                        onChange={(e) =>
                          setNoteById((prev) => ({ ...prev, [request.id]: e.target.value }))
                        }
                      />
                      <div className="flex gap-2">
                        <button
                          type="button"
                          className="btn-primary flex-1"
                          disabled={review.isPending}
                          onClick={() =>
                            setSingleStepUp({
                              kind: "approve",
                              id: request.id,
                              approve,
                              note: noteById[request.id],
                            })
                          }
                        >
                          <CheckCircle2 className="h-4 w-4" />
                          Approve & onboard
                        </button>
                        <button
                          type="button"
                          className="btn-ghost flex-1 text-rose-700"
                          disabled={review.isPending}
                          onClick={() =>
                            review.mutate({
                              id: request.id,
                              action: "reject",
                              admin_note: noteById[request.id],
                            })
                          }
                        >
                          <XCircle className="h-4 w-4" />
                          Reject
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="inline-flex items-center gap-2 text-sm text-stone-500">
                      {status === "approved" ? (
                        <CheckCircle2 className="h-4 w-4 text-forest-600" />
                      ) : (
                        <Clock className="h-4 w-4" />
                      )}
                      {request.reviewed_at
                        ? `Reviewed ${new Date(request.reviewed_at).toLocaleString()}`
                        : "Reviewed"}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <BulkProgramAccessPreviewModal
        open={bulkPreview !== null}
        action={bulkPreview ?? "approve"}
        rows={previewRows}
        onClose={() => setBulkPreview(null)}
        onConfirm={() => {
          if (!bulkPreview) return;
          setBulkPreview(null);
          setBulkStepUp(bulkPreview);
        }}
      />

      <StepUpModal
        open={bulkStepUp !== null}
        title={
          bulkStepUp === "approve"
            ? `Approve ${selectedIds.size} requests`
            : `Reject ${selectedIds.size} requests`
        }
        description={
          bulkStepUp === "approve"
            ? "Bulk approve uses each applicant's org profile (or auto-generated org name). Re-enter your password to confirm."
            : "Re-enter your password to reject all selected requests."
        }
        confirmLabel={bulkStepUp === "approve" ? "Approve all" : "Reject all"}
        danger={bulkStepUp === "reject"}
        busy={bulkReview.isPending}
        onClose={() => setBulkStepUp(null)}
        onConfirm={(password) => {
          if (!bulkStepUp) return;
          bulkReview.mutate({ action: bulkStepUp, password });
        }}
      />

      <StepUpModal
        open={singleStepUp?.kind === "approve"}
        title="Approve program access"
        description="Re-enter your password to approve and onboard this organization. This enrolls the user immediately."
        confirmLabel="Approve & onboard"
        busy={review.isPending}
        onClose={() => setSingleStepUp(null)}
        onConfirm={(password) => {
          if (singleStepUp?.kind !== "approve") return;
          review.mutate({
            id: singleStepUp.id,
            action: "approve",
            admin_note: singleStepUp.note,
            approve: singleStepUp.approve,
            password,
          });
        }}
      />
    </div>
  );
}
