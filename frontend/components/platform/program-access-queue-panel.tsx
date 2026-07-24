"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Clock, XCircle } from "lucide-react";
import { errorMessage } from "@/lib/api";
import { platformAdmin } from "@/lib/platform-api";
import { getProgramTheme } from "@/components/registration/program-theme";
import { cn } from "@/lib/cn";

export function ProgramAccessQueuePanel() {
  const qc = useQueryClient();
  const [status, setStatus] = useState<"pending" | "approved" | "rejected">("pending");
  const [noteById, setNoteById] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string | null>(null);

  const { data: requests, isLoading } = useQuery({
    queryKey: ["platform-program-access", status],
    queryFn: () => platformAdmin.listProgramAccessRequests(status),
  });

  const review = useMutation({
    mutationFn: ({
      id,
      action,
      admin_note,
    }: {
      id: string;
      action: "approve" | "reject";
      admin_note?: string;
    }) => platformAdmin.reviewProgramAccessRequest(id, { action, admin_note }),
    onSuccess: (_, vars) => {
      setMessage(vars.action === "approve" ? "Request approved." : "Request rejected.");
      qc.invalidateQueries({ queryKey: ["platform-program-access"] });
      qc.invalidateQueries({ queryKey: ["planting-programs"] });
    },
    onError: (err) => setMessage(errorMessage(err)),
  });

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
                    <div className="w-full space-y-2 lg:w-72">
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
                            })
                          }
                        >
                          <CheckCircle2 className="h-4 w-4" />
                          Approve
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
