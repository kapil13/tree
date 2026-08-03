"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { StepUpModal } from "@/components/platform/step-up-modal";
import { errorMessage } from "@/lib/api";
import { platformAdmin } from "@/lib/platform-api";

export function OrgFeatureFlagsPanel({ orgId }: { orgId: string }) {
  const qc = useQueryClient();
  const [message, setMessage] = useState<string | null>(null);
  const [stepUpOpen, setStepUpOpen] = useState(false);
  const [localFlags, setLocalFlags] = useState<Record<string, boolean> | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["platform-org-feature-flags", orgId],
    queryFn: () => platformAdmin.getOrgFeatureFlags(orgId),
  });

  const update = useMutation({
    mutationFn: (password: string) =>
      platformAdmin.updateOrgFeatureFlags(orgId, {
        flags: localFlags ?? {},
        password_confirm: password,
      }),
    onSuccess: () => {
      setStepUpOpen(false);
      setMessage("Feature flags updated.");
      setLocalFlags(null);
      qc.invalidateQueries({ queryKey: ["platform-org-feature-flags", orgId] });
    },
    onError: (err) => setMessage(errorMessage(err)),
  });

  if (isLoading || !data) {
    return <p className="text-sm text-stone-500">Loading feature flags…</p>;
  }

  const flags = localFlags ?? Object.fromEntries(data.flags.map((f) => [f.key, f.enabled]));
  const dirty = localFlags !== null;

  return (
    <div className="space-y-3">
      <div className="grid gap-2 sm:grid-cols-2">
        {data.flags.map((flag) => (
          <label
            key={flag.key}
            className="flex items-center justify-between rounded-lg border border-stone-200 px-3 py-2 text-sm dark:border-stone-700"
          >
            <span>{flag.label}</span>
            <input
              type="checkbox"
              checked={flags[flag.key] ?? false}
              onChange={(e) =>
                setLocalFlags((prev) => ({
                  ...(prev ?? Object.fromEntries(data.flags.map((f) => [f.key, f.enabled]))),
                  [flag.key]: e.target.checked,
                }))
              }
            />
          </label>
        ))}
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          className="btn-primary text-xs"
          disabled={!dirty || update.isPending}
          onClick={() => setStepUpOpen(true)}
        >
          Save feature flags
        </button>
        {dirty ? (
          <button type="button" className="btn-ghost text-xs" onClick={() => setLocalFlags(null)}>
            Cancel
          </button>
        ) : null}
      </div>
      {message ? <p className="text-xs text-stone-500">{message}</p> : null}

      <StepUpModal
        open={stepUpOpen}
        title="Update organization feature flags"
        description="Re-enter your password to change which capabilities this organization can use."
        confirmLabel="Save flags"
        busy={update.isPending}
        onClose={() => setStepUpOpen(false)}
        onConfirm={(password) => update.mutate(password)}
      />
    </div>
  );
}
