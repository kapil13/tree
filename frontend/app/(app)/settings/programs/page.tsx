"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Clock, Lock, XCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import { SettingsSection } from "@/components/settings/settings-section";
import { errorMessage, plantingPrograms, type PlantingProgram, type ProgramAccessRequest } from "@/lib/api";
import { getProgramTheme } from "@/components/registration/program-theme";
import { cn } from "@/lib/cn";

function requestForProgram(
  requests: ProgramAccessRequest[] | undefined,
  programCode: string,
): ProgramAccessRequest | undefined {
  return requests?.find((r) => r.program_code === programCode);
}

export default function SettingsProgramsPage() {
  const t = useTranslations("settingsProgramsPage");
  const qc = useQueryClient();
  const [selectedProgram, setSelectedProgram] = useState<PlantingProgram | null>(null);
  const [message, setMessage] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["planting-programs", "memberships"],
    queryFn: () => plantingPrograms.memberships(),
  });

  const enrolled = useMemo(
    () => new Set((data?.enrolled || []).map((p) => p.code)),
    [data?.enrolled],
  );

  const submitRequest = useMutation({
    mutationFn: () =>
      plantingPrograms.submitAccessRequest({
        program_code: selectedProgram!.code,
        message: message.trim() || undefined,
      }),
    onSuccess: () => {
      setFeedback(t("requestSubmitted"));
      setSelectedProgram(null);
      setMessage("");
      qc.invalidateQueries({ queryKey: ["planting-programs"] });
    },
    onError: (err) => setFeedback(errorMessage(err)),
  });

  const withdrawRequest = useMutation({
    mutationFn: (requestId: string) => plantingPrograms.withdrawAccessRequest(requestId),
    onSuccess: () => {
      setFeedback(t("requestWithdrawn"));
      qc.invalidateQueries({ queryKey: ["planting-programs"] });
    },
    onError: (err) => setFeedback(errorMessage(err)),
  });

  return (
    <SettingsSection title={t("title")} description={t("description")}>
      {feedback ? (
        <p className="rounded-lg border border-stone-200 bg-stone-50 px-4 py-3 text-sm text-stone-700 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-200">
          {feedback}
        </p>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2">
        {isLoading ? (
          <p className="col-span-full py-6 text-center text-sm text-stone-500">{t("loading")}</p>
        ) : (
          (data?.available || []).map((program) => {
            const active = enrolled.has(program.code);
            const theme = getProgramTheme(program.code);
            const Icon = theme.icon;
            const locked = !program.is_default;
            const access = requestForProgram(data?.access_requests, program.code);

            return (
              <div
                key={program.code}
                className={cn(
                  "flex flex-col rounded-xl border p-4",
                  active
                    ? "border-forest-300 bg-forest-50/50 dark:border-forest-800 dark:bg-forest-950/20"
                    : "border-stone-200 bg-white dark:border-stone-700 dark:bg-stone-950",
                )}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={cn(
                      "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br text-white",
                      theme.gradient,
                    )}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium text-stone-900 dark:text-stone-50">{program.name}</p>
                      {program.is_default || active ? (
                        <span className="rounded bg-forest-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-forest-800 dark:bg-forest-950/40 dark:text-forest-200">
                          {t("active")}
                        </span>
                      ) : access?.status === "pending" ? (
                        <span className="inline-flex items-center gap-1 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
                          <Clock className="h-3 w-3" />
                          {t("pendingReview")}
                        </span>
                      ) : access?.status === "rejected" ? (
                        <span className="inline-flex items-center gap-1 rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-red-800 dark:bg-red-950/40 dark:text-red-200">
                          <XCircle className="h-3 w-3" />
                          {t("notApproved")}
                        </span>
                      ) : locked ? (
                        <span className="inline-flex items-center gap-1 rounded bg-stone-200 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-stone-600 dark:bg-stone-700 dark:text-stone-300">
                          <Lock className="h-3 w-3" />
                          {t("approvalRequired")}
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-1 text-sm text-stone-500">{program.description}</p>
                    {access?.admin_note && access.status === "rejected" ? (
                      <p className="mt-1 text-xs text-stone-500">
                        {t("adminNote", { note: access.admin_note })}
                      </p>
                    ) : null}
                  </div>
                </div>

                {locked && !active ? (
                  <div className="mt-4 flex gap-2 border-t border-stone-100 pt-3 dark:border-stone-800">
                    {access?.status === "pending" ? (
                      <button
                        type="button"
                        className="btn-ghost text-sm"
                        disabled={withdrawRequest.isPending}
                        onClick={() => withdrawRequest.mutate(access.id)}
                      >
                        {t("withdrawRequest")}
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="btn-primary text-sm"
                        onClick={() => {
                          setSelectedProgram(program);
                          setMessage("");
                          setFeedback(null);
                        }}
                      >
                        {access?.status === "rejected" ? t("requestAgain") : t("requestAccess")}
                      </button>
                    )}
                  </div>
                ) : null}
              </div>
            );
          })
        )}
      </div>

      {selectedProgram ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-2xl border border-stone-200 bg-white p-6 shadow-xl dark:border-stone-700 dark:bg-stone-900">
            <h3 className="text-lg font-semibold">
              {t("modalTitle", { name: selectedProgram.name })}
            </h3>
            <p className="mt-2 text-sm text-stone-600 dark:text-stone-300">{t("modalDescription")}</p>
            <textarea
              className="input mt-4 min-h-[120px] w-full"
              placeholder={t("modalPlaceholder")}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              maxLength={2000}
            />
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" className="btn-ghost" onClick={() => setSelectedProgram(null)}>
                {t("cancel")}
              </button>
              <button
                type="button"
                className="btn-primary"
                disabled={submitRequest.isPending}
                onClick={() => submitRequest.mutate()}
              >
                {submitRequest.isPending ? t("submitting") : t("submitRequest")}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </SettingsSection>
  );
}
