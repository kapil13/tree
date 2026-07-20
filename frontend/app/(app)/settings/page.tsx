"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Leaf, ScrollText, Settings2, Sparkles } from "lucide-react";
import { useAuth } from "@/lib/auth-store";
import { errorMessage, plantingPrograms } from "@/lib/api";
import { getProgramTheme } from "@/components/registration/program-theme";
import { cn } from "@/lib/cn";

export default function SettingsPage() {
  const { user } = useAuth();
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
      setMessage("Your registration programs were updated.");
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
    <div className="registration-shell mx-auto max-w-5xl space-y-8">
      <div className="overflow-hidden rounded-[2rem] border border-white/70 bg-white/75 p-6 shadow-[0_20px_80px_-24px_rgba(15,23,42,0.18)] backdrop-blur-xl dark:border-stone-800 dark:bg-stone-900/70 md:p-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full bg-stone-900 px-3 py-1 text-xs font-medium uppercase tracking-[0.18em] text-white dark:bg-stone-100 dark:text-stone-900">
              <Settings2 className="h-3.5 w-3.5" />
              Workspace settings
            </div>
            <div>
              <h1 className="text-3xl font-semibold tracking-tight">Registration programs</h1>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-stone-600 dark:text-stone-300">
                One account can participate in multiple planting contexts. Enable the programs you
                need — each unlocks a dedicated guided registration flow.
              </p>
            </div>
          </div>
          <Link href="/trees/new" className="btn-primary">
            <Leaf className="h-4 w-4" />
            Register a tree
          </Link>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-[2rem] border border-stone-200/80 bg-white/85 p-6 shadow-lg backdrop-blur dark:border-stone-800 dark:bg-stone-900/75">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">Profile</p>
          <div className="mt-4 flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-forest-500 to-teal-500 text-xl font-semibold text-white">
              {(user?.full_name || "U").slice(0, 1).toUpperCase()}
            </div>
            <div>
              <p className="text-lg font-semibold">{user?.full_name}</p>
              <p className="text-sm text-stone-500">{user?.email}</p>
              <p className="mt-1 inline-flex rounded-full bg-stone-100 px-2.5 py-0.5 text-xs font-medium capitalize text-stone-600 dark:bg-stone-800 dark:text-stone-300">
                {user?.role}
              </p>
            </div>
          </div>

          <div className="mt-6 rounded-2xl border border-forest-200 bg-forest-50/70 p-4 text-sm leading-relaxed text-forest-900 dark:border-forest-900 dark:bg-forest-950/30 dark:text-forest-200">
            <div className="mb-2 flex items-center gap-2 font-semibold">
              <Sparkles className="h-4 w-4" />
              Multi-program access
            </div>
            You can tag trees as a citizen with BYOT and also register compliance-grade plantings
            for government or corporate programs from the same login.
          </div>

          <Link
            href="/settings/audit"
            className="mt-4 flex items-center gap-3 rounded-2xl border border-stone-200 p-4 text-sm transition hover:border-forest-300 hover:bg-forest-50/50 dark:border-stone-700"
          >
            <ScrollText className="h-5 w-5 text-forest-700" />
            <div>
              <p className="font-semibold">Audit trail</p>
              <p className="text-stone-500">View workspace action history for compliance reviews</p>
            </div>
          </Link>
        </div>

        <div className="rounded-[2rem] border border-stone-200/80 bg-white/85 p-6 shadow-lg backdrop-blur dark:border-stone-800 dark:bg-stone-900/75">
          <div className="mb-5">
            <h2 className="text-xl font-semibold">Enabled programs</h2>
            <p className="mt-1 text-sm text-stone-500">
              BYOT Public stays on by default. Toggle additional programs below.
            </p>
          </div>

          {isLoading ? (
            <div className="py-10 text-center text-sm text-stone-500">Loading programs…</div>
          ) : (
            <div className="space-y-3">
              {(data?.available || []).map((program) => {
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
                      "flex w-full items-start gap-4 rounded-2xl border p-4 text-left transition",
                      checked
                        ? cn("border-transparent ring-2", theme.ring, "bg-white shadow-md dark:bg-stone-900")
                        : "border-stone-200 hover:border-stone-300 dark:border-stone-800",
                      program.is_default ? "cursor-default" : "cursor-pointer",
                    )}
                  >
                    <div
                      className={cn(
                        "flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br text-white",
                        theme.gradient,
                      )}
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold">{program.name}</p>
                        {program.is_default && (
                          <span className="rounded-full bg-stone-900 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white dark:bg-stone-100 dark:text-stone-900">
                            Always on
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-sm text-stone-600 dark:text-stone-300">
                        {program.description}
                      </p>
                    </div>
                    <div
                      className={cn(
                        "mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border",
                        checked
                          ? "border-forest-600 bg-forest-600 text-white"
                          : "border-stone-300 bg-white dark:border-stone-600 dark:bg-stone-900",
                      )}
                    >
                      {checked ? <Check className="h-3.5 w-3.5" /> : null}
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <button
              type="button"
              className="btn-primary"
              disabled={save.isPending}
              onClick={() => save.mutate()}
            >
              {save.isPending ? "Saving…" : "Save preferences"}
            </button>
            {message && <p className="text-sm text-stone-600 dark:text-stone-300">{message}</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
