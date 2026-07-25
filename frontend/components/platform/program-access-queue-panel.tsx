"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Clock, XCircle } from "lucide-react";
import { errorMessage } from "@/lib/api";
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

export function ProgramAccessQueuePanel() {
  const qc = useQueryClient();
  const [status, setStatus] = useState<"pending" | "approved" | "rejected">("pending");
  const [noteById, setNoteById] = useState<Record<string, string>>({});
  const [approveFormById, setApproveFormById] = useState<Record<string, ApproveForm>>({});
  const [orgSearch, setOrgSearch] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  const { data: requests, isLoading } = useQuery({
    queryKey: ["platform-program-access", status],
    queryFn: () => platformAdmin.listProgramAccessRequests(status),
  });

  const { data: orgOptions = [] } = useQuery({
    queryKey: ["platform-organizations", orgSearch],
    queryFn: () => platformAdmin.listOrganizations(orgSearch),
    enabled: orgSearch.length >= 2,
  });

  const review = useMutation({
    mutationFn: ({
      id,
      action,
      admin_note,
      approve,
    }: {
      id: string;
      action: "approve" | "reject";
      admin_note?: string;
      approve?: ApproveForm;
    }) =>
      platformAdmin.reviewProgramAccessRequest(id, {
        action,
        admin_note,
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
      setMessage(vars.action === "approve" ? "Request approved and organization onboarded." : "Request rejected.");
      qc.invalidateQueries({ queryKey: ["platform-program-access"] });
      qc.invalidateQueries({ queryKey: ["planting-programs"] });
    },
    onError: (err) => setMessage(errorMessage(err)),
  });

  function getApproveForm(requestId: string, programCode: string, userName: string): ApproveForm {
    return (
      approveFormById[requestId] ?? {
        ...DEFAULT_APPROVE,
        organization_name: `${userName} — ${programCode.replace(/_/g, " ")}`,
        platform_role: roleForProgram(programCode),
      }
    );
  }

  function setApproveField(requestId: string, programCode: string, userName: string, patch: Partial<ApproveForm>) {
    setApproveFormById((prev) => ({
      ...prev,
      [requestId]: { ...getApproveForm(requestId, programCode, userName), ...patch },
    }));
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {(["pending", "approved", "rejected"] as const).map((value) => (
          <button
            key={value}
            type="button"
            className={status === value ? "btn-primary" : "btn-ghost"}
            onClick={() => setStatus(value)}
          >
            {value.charAt(0).toUpperCase() + value.slice(1)}
          </button>
        ))}
      </div>

      {message ? (
        <p className="rounded-lg border border-stone-200 bg-stone-50 px-4 py-3 text-sm dark:border-stone-700 dark:bg-stone-900">
          {message}
        </p>
      ) : null}

      {isLoading ? (
        <p className="text-sm text-stone-500">Loading requests…</p>
      ) : !requests?.length ? (
        <p className="rounded-2xl border border-dashed border-stone-300 px-6 py-10 text-center text-sm text-stone-500 dark:border-stone-700">
          No {status} program access requests.
        </p>
      ) : (
        <div className="space-y-3">
          {requests.map((request) => {
            const theme = getProgramTheme(request.program_code);
            const Icon = theme.icon;
            const approve = getApproveForm(request.id, request.program_code, request.user_full_name);
            return (
              <div
                key={request.id}
                className="rounded-2xl border border-stone-200 bg-white p-5 dark:border-stone-800 dark:bg-stone-900"
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0 flex-1 space-y-3">
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
                        </p>
                        <p className="mt-1 text-xs text-stone-500">
                          Submitted {new Date(request.created_at).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    {request.message ? (
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
                      <div className="rounded-xl border border-forest-200 bg-forest-50/50 p-4 dark:border-forest-900 dark:bg-forest-950/20">
                        <p className="mb-3 text-sm font-medium text-forest-900 dark:text-forest-100">
                          Organization onboarding
                        </p>
                        <label className="mb-2 flex items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            checked={approve.use_existing_org}
                            onChange={(e) =>
                              setApproveField(request.id, request.program_code, request.user_full_name, {
                                use_existing_org: e.target.checked,
                              })
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
                                setApproveField(request.id, request.program_code, request.user_full_name, {
                                  organization_id: e.target.value,
                                })
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
                                setApproveField(request.id, request.program_code, request.user_full_name, {
                                  organization_name: e.target.value,
                                })
                              }
                            />
                            <input
                              className="input text-sm"
                              placeholder="Slug (optional)"
                              value={approve.organization_slug}
                              onChange={(e) =>
                                setApproveField(request.id, request.program_code, request.user_full_name, {
                                  organization_slug: e.target.value,
                                })
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
                              setApproveField(request.id, request.program_code, request.user_full_name, {
                                platform_role: e.target.value as ApproveForm["platform_role"],
                              })
                            }
                          >
                            <option value="government">Government / NHAI</option>
                            <option value="corporate">Corporate / ESG</option>
                            <option value="ngo">NGO</option>
                          </select>
                        </div>
                        <label className="mt-2 flex items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            checked={approve.make_org_admin}
                            onChange={(e) =>
                              setApproveField(request.id, request.program_code, request.user_full_name, {
                                make_org_admin: e.target.checked,
                              })
                            }
                          />
                          Make org admin (can invite team)
                        </label>
                      </div>
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
                            review.mutate({
                              id: request.id,
                              action: "approve",
                              admin_note: noteById[request.id],
                              approve,
                            })
                          }
                        >
                          <CheckCircle2 className="h-4 w-4" />
                          Approve & onboard
                        </button>
                        <button
                          type="button"
                          className="btn-secondary flex-1"
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
    </div>
  );
}
