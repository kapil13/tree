"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Shield } from "lucide-react";
import { PlatformShell } from "@/components/platform/platform-shell";
import { StepUpModal } from "@/components/platform/step-up-modal";
import { notifyPlatformAction, notifyPlatformError } from "@/lib/platform-admin-feedback";
import { platformAdmin } from "@/lib/platform-api";
import { isFullPlatformAdmin } from "@/lib/platform-access";
import { useAuth } from "@/lib/auth-store";

export default function PlatformGovernancePage() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const fullAdmin = isFullPlatformAdmin(user);
  const [stepUpOpen, setStepUpOpen] = useState(false);
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
      notifyPlatformAction("Governance settings updated.", {
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
        <p className="text-sm text-stone-500">Only full platform admins can manage governance.</p>
      </PlatformShell>
    );
  }

  if (isLoading || !data) {
    return (
      <PlatformShell>
        <p className="text-sm text-stone-500">Loading governance settings…</p>
      </PlatformShell>
    );
  }

  const dirty =
    draft.maintenance_mode !== data.maintenance_mode ||
    draft.maintenance_message !== data.maintenance_message ||
    draft.registration_enabled !== data.registration_enabled;

  return (
    <PlatformShell>
      <div className="space-y-6">
        <div className="rounded-2xl border border-stone-200 bg-white p-6 dark:border-stone-800 dark:bg-stone-900">
          <div className="mb-4 flex items-center gap-2">
            <Shield className="h-5 w-5 text-forest-700" />
            <h2 className="text-lg font-semibold">Platform governance</h2>
          </div>
          <p className="mb-6 text-sm text-stone-600 dark:text-stone-300">
            Control maintenance mode and new user registration. Maintenance blocks write access for
            non-admin users while preserving read-only visibility.
          </p>

          <div className="space-y-4">
            <label className="flex items-center gap-3 text-sm">
              <input
                type="checkbox"
                checked={draft.maintenance_mode}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, maintenance_mode: e.target.checked }))
                }
              />
              <span>
                <strong>Maintenance mode</strong> — block non-admin writes platform-wide
              </span>
            </label>

            <div>
              <label className="kpi-label">Maintenance message</label>
              <textarea
                className="input mt-1 min-h-[80px] w-full"
                value={draft.maintenance_message}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, maintenance_message: e.target.value }))
                }
                placeholder="Shown to users during maintenance…"
              />
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
                <strong>Registration enabled</strong> — allow new sign-ups and registrations
              </span>
            </label>
          </div>

          <div className="mt-6 flex gap-2">
            <button
              type="button"
              className="btn-primary"
              disabled={!dirty || update.isPending}
              onClick={() => setStepUpOpen(true)}
            >
              Save governance settings
            </button>
            <button
              type="button"
              className="btn-secondary"
              disabled={!dirty}
              onClick={() =>
                setDraft({
                  maintenance_mode: data.maintenance_mode,
                  maintenance_message: data.maintenance_message,
                  registration_enabled: data.registration_enabled,
                })
              }
            >
              Reset
            </button>
          </div>
        </div>

        <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4 text-sm text-stone-600 dark:border-stone-800 dark:bg-stone-950 dark:text-stone-300">
          <p className="font-medium text-stone-800 dark:text-stone-100">Per-organization flags</p>
          <p className="mt-1">
            Feature toggles for individual tenants are managed on each organization&apos;s detail
            page under Feature flags.
          </p>
        </div>


      </div>

      <StepUpModal
        open={stepUpOpen}
        title="Confirm governance changes"
        description="Re-enter your password to update platform-wide governance settings."
        confirmLabel="Save settings"
        busy={update.isPending}
        onClose={() => setStepUpOpen(false)}
        onConfirm={(password) => update.mutate(password)}
      />
    </PlatformShell>
  );
}
