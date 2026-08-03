"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { KeyRound, Save } from "lucide-react";
import { platformAdmin } from "@/lib/platform-api";
import { errorMessage } from "@/lib/api";
import { StepUpModal } from "./step-up-modal";

const MODULE_LABELS: Record<string, string> = {
  website_cms: "Website CMS",
  users_admin: "Users & organizations",
  program_access_admin: "Program access queue",
  billing_admin: "Billing & credits",
  ops_admin: "Operations",
};

export function UserPlatformGrantsPanel({
  userId,
  userEmail,
  userRole,
}: {
  userId: string;
  userEmail: string;
  userRole: string;
}) {
  const qc = useQueryClient();
  const [selected, setSelected] = useState<string[]>([]);
  const [showStepUp, setShowStepUp] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["platform-user-grants", userId],
    queryFn: () => platformAdmin.getUserGrants(userId),
    enabled: userRole !== "admin",
  });

  const save = useMutation({
    mutationFn: (password: string) =>
      platformAdmin.updateUserGrants(userId, { module_keys: selected, password }),
    onSuccess: () => {
      setMessage("Platform module grants saved. User must sign in again to refresh access.");
      setShowStepUp(false);
      qc.invalidateQueries({ queryKey: ["platform-user-grants", userId] });
    },
    onError: (err) => setMessage(errorMessage(err)),
  });

  if (userRole === "admin") {
    return (
      <p className="text-xs text-stone-500">Full admins have access to all platform modules.</p>
    );
  }

  if (isLoading || !data) {
    return <p className="text-xs text-stone-500">Loading module grants…</p>;
  }

  const current = selected.length ? selected : data.user_grants;

  return (
    <div className="rounded-xl border border-stone-200 p-3 dark:border-stone-700">
      <div className="flex items-center gap-2 text-sm font-medium">
        <KeyRound className="h-4 w-4 text-forest-700" />
        Platform module grants
      </div>
      <p className="mt-1 text-xs text-stone-500">
        Grant {userEmail} access to specific admin modules without changing their workspace role.
      </p>

      <div className="mt-3 space-y-2">
        {Object.entries(MODULE_LABELS).map(([key, label]) => {
          const fromRole = data.role_modules[key];
          const checked = current.includes(key);
          return (
            <label key={key} className="flex items-start gap-2 text-sm">
              <input
                type="checkbox"
                className="mt-0.5"
                checked={checked}
                onChange={(e) => {
                  setSelected((prev) => {
                    const base = prev.length ? prev : [...data.user_grants];
                    if (e.target.checked) return [...new Set([...base, key])];
                    return base.filter((k) => k !== key);
                  });
                }}
              />
              <span>
                {label}
                {fromRole && (
                  <span className="ml-1 text-xs text-emerald-700">(via role)</span>
                )}
                {data.effective_access[key] && !fromRole && checked && (
                  <span className="ml-1 text-xs text-violet-700">(granted)</span>
                )}
              </span>
            </label>
          );
        })}
      </div>

      {message && <p className="mt-2 text-xs text-stone-600">{message}</p>}

      <button
        type="button"
        className="btn-secondary mt-3 text-xs"
        onClick={() => {
          setMessage(null);
          setShowStepUp(true);
        }}
      >
        <Save className="h-3.5 w-3.5" />
        Save grants
      </button>

      <StepUpModal
        open={showStepUp}
        title="Confirm module grants"
        description="Re-enter your password to assign platform admin modules to this user."
        confirmLabel="Save grants"
        busy={save.isPending}
        onClose={() => setShowStepUp(false)}
        onConfirm={(password) => save.mutate(password)}
      />
    </div>
  );
}
