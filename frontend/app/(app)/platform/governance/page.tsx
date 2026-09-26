"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ShieldAlert } from "lucide-react";
import { PlatformShell } from "@/components/platform/platform-shell";
import { StepUpModal } from "@/components/platform/step-up-modal";
import { notifyPlatformAction, notifyPlatformError } from "@/lib/platform-admin-feedback";
import { platformAdmin } from "@/lib/platform-api";
import { isFullPlatformAdmin } from "@/lib/platform-access";
import { useAuth } from "@/lib/auth-store";
import { cn } from "@/lib/cn";

export default function PlatformGovernancePage() {
  const t = useTranslations("platformAdmin.governance");
  const tc = useTranslations("platformAdmin.common");
  const qc = useQueryClient();
  const { user } = useAuth();
  const fullAdmin = isFullPlatformAdmin(user);
  const [stepUpOpen, setStepUpOpen] = useState(false);
  const [maintenanceConfirm, setMaintenanceConfirm] = useState("");
  const [draft, setDraft] = useState({
    maintenance_mode: false,
    maintenance_message: "",
    registration_enabled: true,
  });

  const { data, isLoading } = useQuery({
    queryKey: ["platform-governance"],
    queryFn: () => platformAdmin.getGovernance(),
    enabled: fullAdmin,
  });

  useEffect(() => {
    if (data) {
      setDraft({
        maintenance_mode: data.maintenance_mode,
        maintenance_message: data.maintenance_message,
        registration_enabled: data.registration_enabled,
      });
      setMaintenanceConfirm("");
    }
  }, [data]);

  const update = useMutation({
    mutationFn: (password: string) =>
      platformAdmin.updateGovernance({
        maintenance_mode: draft.maintenance_mode,
        maintenance_message: draft.maintenance_message,
        registration_enabled: draft.registration_enabled,
        password,
      }),
    onSuccess: () => {
      setStepUpOpen(false);
      setMaintenanceConfirm("");
      notifyPlatformAction(t("notifyUpdated"), {
        audit: { actionPrefix: "platform.governance." },
      });
      qc.invalidateQueries({ queryKey: ["platform-governance"] });
      qc.invalidateQueries({ queryKey: ["governance-status"] });
      qc.invalidateQueries({ queryKey: ["platform-audit-recent"] });
    },
    onError: (err) => notifyPlatformError(err),
  });

  if (!fullAdmin) {
    return (
      <PlatformShell>
        <p className="text-sm text-stone-500">{t("accessDenied")}</p>
      </PlatformShell>
    );
  }

  if (isLoading || !data) {
    return (
      <PlatformShell>
        <p className="text-sm text-stone-500">{t("loading")}</p>
      </PlatformShell>
    );
  }

  const dirty =
    draft.maintenance_mode !== data.maintenance_mode ||
    draft.maintenance_message !== data.maintenance_message ||
    draft.registration_enabled !== data.registration_enabled;

  const enablingMaintenance = draft.maintenance_mode && !data.maintenance_mode;
  const maintenanceConfirmed =
    !enablingMaintenance || maintenanceConfirm.trim().toUpperCase() === "MAINTENANCE";

  const previewMessage =
    draft.maintenance_message.trim() || t("defaultMaintenanceMessage");

  return (
    <PlatformShell>
      <div className="space-y-6">
        <div
          className={cn(
            "rounded-2xl border p-6",
            draft.maintenance_mode
              ? "border-rose-300 bg-rose-50 dark:border-rose-900 dark:bg-rose-950/30"
              : "border-stone-200 bg-white dark:border-stone-800 dark:bg-stone-900",
          )}
        >
          <div className="mb-4 flex items-center gap-2">
            <ShieldAlert
              className={cn("h-5 w-5", draft.maintenance_mode ? "text-rose-700" : "text-forest-700")}
            />
            <h2 className="text-lg font-semibold">{t("title")}</h2>
          </div>
          <p className="mb-6 text-sm text-stone-600 dark:text-stone-300">{t("description")}</p>

          <div className="space-y-5">
            <div className="rounded-xl border border-rose-200/80 bg-white/70 p-4 dark:border-rose-900 dark:bg-stone-950/40">
              <p className="text-xs font-semibold uppercase tracking-wide text-rose-700">
                {t("dangerZone")}
              </p>
              <label className="mt-3 flex items-start gap-3 text-sm">
                <input
                  type="checkbox"
                  className="mt-1"
                  checked={draft.maintenance_mode}
                  onChange={(e) => {
                    setDraft((d) => ({ ...d, maintenance_mode: e.target.checked }));
                    setMaintenanceConfirm("");
                  }}
                />
                <span>
                  <strong>{t("maintenanceMode")}</strong>
                  {t("maintenanceModeDesc")}
                </span>
              </label>

              {draft.maintenance_mode ? (
                <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
                  <p className="font-medium">{t("bannerPreview")}</p>
                  <p className="mt-1">{previewMessage}</p>
                </div>
              ) : null}

              {enablingMaintenance ? (
                <div className="mt-3">
                  <label className="kpi-label">{t("maintenanceConfirmLabel")}</label>
                  <input
                    className="input mt-1 font-mono uppercase"
                    value={maintenanceConfirm}
                    onChange={(e) => setMaintenanceConfirm(e.target.value)}
                    placeholder={t("maintenanceConfirmPlaceholder")}
                    autoComplete="off"
                  />
                </div>
              ) : null}

              <div className="mt-3">
                <label className="kpi-label">{t("maintenanceMessage")}</label>
                <textarea
                  className="input mt-1 min-h-[80px] w-full"
                  value={draft.maintenance_message}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, maintenance_message: e.target.value }))
                  }
                  placeholder={t("maintenanceMessagePlaceholder")}
                />
              </div>
            </div>

            <label className="flex items-center gap-3 text-sm">
              <input
                type="checkbox"
                checked={draft.registration_enabled}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, registration_enabled: e.target.checked }))
                }
              />
              <span>
                <strong>{t("registrationEnabled")}</strong>
                {t("registrationEnabledDesc")}
              </span>
            </label>
          </div>

          <div className="mt-6 flex gap-2">
            <button
              type="button"
              className={cn("btn-primary", enablingMaintenance && "bg-rose-700 hover:bg-rose-800")}
              disabled={!dirty || !maintenanceConfirmed || update.isPending}
              onClick={() => setStepUpOpen(true)}
            >
              {t("saveSettings")}
            </button>
            <button
              type="button"
              className="btn-secondary"
              disabled={!dirty}
              onClick={() => {
                setDraft({
                  maintenance_mode: data.maintenance_mode,
                  maintenance_message: data.maintenance_message,
                  registration_enabled: data.registration_enabled,
                });
                setMaintenanceConfirm("");
              }}
            >
              {tc("reset")}
            </button>
          </div>
        </div>

        <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4 text-sm text-stone-600 dark:border-stone-800 dark:bg-stone-950 dark:text-stone-300">
          <p className="font-medium text-stone-800 dark:text-stone-100">{t("perOrgFlagsTitle")}</p>
          <p className="mt-1">{t("perOrgFlagsDesc")}</p>
        </div>
      </div>

      <StepUpModal
        open={stepUpOpen}
        title={t("stepUpTitle")}
        description={enablingMaintenance ? t("stepUpEnableMaintenance") : t("stepUpDefault")}
        confirmLabel={t("stepUpConfirm")}
        danger={enablingMaintenance || !draft.registration_enabled}
        busy={update.isPending}
        onClose={() => setStepUpOpen(false)}
        onConfirm={(password) => update.mutate(password)}
      />
    </PlatformShell>
  );
}
