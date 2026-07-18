"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth-store";
import { errorMessage, plantingPrograms } from "@/lib/api";

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
    if (data) {
      setSelected(data.enrolled.map((program) => program.code));
    }
  }, [data]);

  const save = useMutation({
    mutationFn: () => plantingPrograms.updateMemberships(selected),
    onSuccess: () => {
      setMessage("Registration programs updated.");
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
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Settings</h1>
        <p className="text-sm text-stone-600">
          Opt into the registration programs you need. One account can use BYOT public tagging and
          also Government, Industry, or NGO forms.
        </p>
      </div>

      <div className="card space-y-2">
        <div className="text-sm text-stone-600">Profile</div>
        <div className="text-sm">
          <div className="font-medium">{user?.full_name}</div>
          <div className="text-stone-500">{user?.email}</div>
          <div className="text-stone-500">Role: {user?.role}</div>
        </div>
      </div>

      <div className="card space-y-4">
        <div>
          <h2 className="text-lg font-medium">Registration programs</h2>
          <p className="text-sm text-stone-500">
            BYOT Public is always enabled. Add other programs to unlock their dedicated Add tree
            forms.
          </p>
        </div>

        {isLoading && <div className="text-sm text-stone-500">Loading programs…</div>}

        <div className="space-y-3">
          {(data?.available || []).map((program) => {
            const checked = selected.includes(program.code);
            return (
              <label
                key={program.code}
                className="flex cursor-pointer items-start gap-3 rounded-lg border border-stone-200 p-4"
              >
                <input
                  type="checkbox"
                  className="mt-1"
                  checked={checked}
                  disabled={program.is_default || save.isPending}
                  onChange={() => toggle(program.code, program.is_default)}
                />
                <span className="space-y-1">
                  <span className="block font-medium">
                    {program.name}
                    {program.is_default ? " (always on)" : ""}
                  </span>
                  <span className="block text-sm text-stone-600">{program.description}</span>
                  <span className="block text-xs text-stone-500">Audience: {program.audience}</span>
                </span>
              </label>
            );
          })}
        </div>

        <button
          type="button"
          className="btn-primary"
          disabled={save.isPending}
          onClick={() => save.mutate()}
        >
          {save.isPending ? "Saving…" : "Save program preferences"}
        </button>

        {message && <div className="text-sm text-stone-600">{message}</div>}
      </div>
    </div>
  );
}
