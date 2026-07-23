"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check } from "lucide-react";
import { SettingsSection } from "@/components/settings/settings-section";
import { errorMessage, plantingPrograms } from "@/lib/api";
import { getProgramTheme } from "@/components/registration/program-theme";
import { cn } from "@/lib/cn";

export default function SettingsProgramsPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["planting-programs", "memberships"],
    queryFn: () => plantingPrograms.memberships(),
  });

  const [selected, setSelected] = useState<string[]>([]);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (data) setSelected(data.enrolled.map((program) => program.code));
  }, [data]);

  const save = useMutation({
    mutationFn: () => plantingPrograms.updateMemberships(selected),
    onSuccess: () => {
      setMessage("Programs updated.");
      qc.invalidateQueries({ queryKey: ["planting-programs"] });
    },
    onError: (err) => setMessage(errorMessage(err)),
  });

  function toggle(code: string, isDefault: boolean) {
    if (isDefault) return;
    setSelected((current) =>
      current.includes(code) ? current.filter((item) => item !== code) : [...current, code],
    );
  }

  return (
    <SettingsSection
      title="Registration programs"
      description="Choose which planting flows appear when you register trees. BYOT Public is always enabled."
    >
      <div className="card space-y-3">
        {isLoading ? (
          <p className="py-6 text-center text-sm text-stone-500">Loading programs…</p>
        ) : (
          (data?.available || []).map((program) => {
            const checked = selected.includes(program.code);
            const theme = getProgramTheme(program.code);
            const Icon = theme.icon;
            return (
              <button
                key={program.code}
                type="button"
                disabled={program.is_default || save.isPending}
                onClick={() => toggle(program.code, program.is_default)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-lg border px-4 py-3 text-left transition",
                  checked
                    ? "border-forest-300 bg-forest-50/50 dark:border-forest-800 dark:bg-forest-950/20"
                    : "border-stone-200 hover:border-stone-300 dark:border-stone-700",
                  program.is_default ? "cursor-default opacity-90" : "cursor-pointer",
                )}
              >
                <div
                  className={cn(
                    "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br text-white",
                    theme.gradient,
                  )}
                >
                  <Icon className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-stone-900 dark:text-stone-50">{program.name}</p>
                    {program.is_default ? (
                      <span className="rounded bg-stone-200 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-stone-600 dark:bg-stone-700 dark:text-stone-300">
                        Required
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-0.5 text-sm text-stone-500">{program.description}</p>
                </div>
                <div
                  className={cn(
                    "flex h-5 w-5 shrink-0 items-center justify-center rounded border",
                    checked
                      ? "border-forest-600 bg-forest-600 text-white"
                      : "border-stone-300 bg-white dark:border-stone-600 dark:bg-stone-900",
                  )}
                  aria-hidden
                >
                  {checked ? <Check className="h-3 w-3" /> : null}
                </div>
              </button>
            );
          })
        )}

        <div className="flex flex-col gap-2 border-t border-stone-200 pt-4 sm:flex-row sm:items-center sm:justify-between dark:border-stone-800">
          <button type="button" className="btn-primary" disabled={save.isPending} onClick={() => save.mutate()}>
            {save.isPending ? "Saving…" : "Save changes"}
          </button>
          {message ? <p className="text-sm text-stone-600 dark:text-stone-400">{message}</p> : null}
        </div>
      </div>
    </SettingsSection>
  );
}
