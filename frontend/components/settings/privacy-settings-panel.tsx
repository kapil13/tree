"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";
import { Download, Shield, Trash2 } from "lucide-react";
import { SettingsSection } from "@/components/settings/settings-section";
import { errorMessage, privacy } from "@/lib/api";
import { useAuth } from "@/lib/auth-store";

export function PrivacySettingsPanel() {
  const { user, logout } = useAuth();
  const qc = useQueryClient();
  const [grievanceSubject, setGrievanceSubject] = useState("");
  const [grievanceBody, setGrievanceBody] = useState("");
  const [deleteEmail, setDeleteEmail] = useState("");
  const [deleteReason, setDeleteReason] = useState("");

  const summary = useQuery({ queryKey: ["privacy-summary"], queryFn: () => privacy.summary() });
  const officer = useQuery({ queryKey: ["privacy-officer"], queryFn: () => privacy.officer() });

  const withdraw = useMutation({
    mutationFn: (purpose: string) => privacy.withdrawConsent(purpose),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["privacy-summary"] }),
  });

  const grant = useMutation({
    mutationFn: (purpose: "analytics" | "marketing") => privacy.grantConsent(purpose),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["privacy-summary"] }),
  });

  const exportData = useMutation({
    mutationFn: () => privacy.downloadExport(),
    onSuccess: (blob) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `byot-data-export-${user?.id ?? "me"}.json`;
      a.click();
      URL.revokeObjectURL(url);
    },
  });

  const deleteAccount = useMutation({
    mutationFn: () => privacy.deleteAccount(deleteEmail, deleteReason || undefined),
    onSuccess: async () => {
      await logout();
      window.location.href = "/login";
    },
  });

  const fileGrievance = useMutation({
    mutationFn: () => privacy.fileGrievance(grievanceSubject, grievanceBody),
    onSuccess: () => {
      setGrievanceSubject("");
      setGrievanceBody("");
      qc.invalidateQueries({ queryKey: ["privacy-summary"] });
    },
  });

  const consents = summary.data?.consents ?? [];

  return (
    <div className="space-y-8">
      <SettingsSection
        title="Your data (DPDP)"
        description="Download, manage consent, and contact our Data Protection Officer."
      >
        <div className="card space-y-4">
          <p className="text-sm text-stone-600">
            Policy version: <strong>{summary.data?.policy_version ?? "—"}</strong>
            {officer.data ? (
              <>
                {" · "}
                DPO:{" "}
                <a href={`mailto:${officer.data.email}`} className="text-forest-700 underline">
                  {officer.data.email}
                </a>
              </>
            ) : null}
          </p>
          <button
            type="button"
            className="btn-primary text-sm"
            disabled={exportData.isPending}
            onClick={() => exportData.mutate()}
          >
            <Download className="h-4 w-4" />
            {exportData.isPending ? "Preparing export…" : "Download my data (JSON)"}
          </button>
          {exportData.error ? (
            <p className="text-sm text-rose-700">{errorMessage(exportData.error)}</p>
          ) : null}
        </div>
      </SettingsSection>

      <SettingsSection title="Consent preferences">
        <div className="card divide-y divide-stone-200 dark:divide-stone-800">
          {["essential", "analytics", "marketing"].map((purpose) => {
            const row = consents.find((c) => c.purpose === purpose && c.active);
            const active = Boolean(row);
            return (
              <div key={purpose} className="flex items-center justify-between gap-4 px-4 py-3">
                <div>
                  <p className="font-medium capitalize text-stone-900 dark:text-stone-50">{purpose}</p>
                  <p className="text-xs text-stone-500">
                    {purpose === "essential"
                      ? "Required for core platform operation"
                      : purpose === "analytics"
                        ? "Product analytics and usage insights"
                        : "Marketing and product updates"}
                  </p>
                </div>
                {purpose === "essential" ? (
                  <span className="text-xs text-stone-500">Required</span>
                ) : active ? (
                  <button
                    type="button"
                    className="btn-secondary text-xs"
                    disabled={withdraw.isPending}
                    onClick={() => withdraw.mutate(purpose)}
                  >
                    Withdraw
                  </button>
                ) : (
                  <button
                    type="button"
                    className="btn-secondary text-xs"
                    disabled={grant.isPending}
                    onClick={() => grant.mutate(purpose as "analytics" | "marketing")}
                  >
                    Grant
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </SettingsSection>

      <SettingsSection title="File a privacy grievance">
        <div className="card space-y-3">
          <input
            className="input w-full"
            placeholder="Subject"
            value={grievanceSubject}
            onChange={(e) => setGrievanceSubject(e.target.value)}
          />
          <textarea
            className="input min-h-24 w-full"
            placeholder="Describe your concern…"
            value={grievanceBody}
            onChange={(e) => setGrievanceBody(e.target.value)}
          />
          <button
            type="button"
            className="btn-primary text-sm"
            disabled={fileGrievance.isPending || grievanceSubject.length < 3 || grievanceBody.length < 10}
            onClick={() => fileGrievance.mutate()}
          >
            <Shield className="h-4 w-4" />
            Submit grievance
          </button>
        </div>
      </SettingsSection>

      <SettingsSection
        title="Delete account"
        description="Permanently deactivate your account and redact personal information."
      >
        <div className="card space-y-3 border-rose-200 bg-rose-50/50 dark:border-rose-900 dark:bg-rose-950/20">
          <p className="text-sm text-stone-600">
            Audit and credit ledger aggregates may be retained in anonymized form. Type your email to confirm.
          </p>
          <input
            className="input w-full"
            placeholder={user?.email ?? "Confirm email"}
            value={deleteEmail}
            onChange={(e) => setDeleteEmail(e.target.value)}
          />
          <input
            className="input w-full"
            placeholder="Reason (optional)"
            value={deleteReason}
            onChange={(e) => setDeleteReason(e.target.value)}
          />
          <button
            type="button"
            className="btn-secondary border-rose-300 text-rose-800 text-sm"
            disabled={deleteAccount.isPending || !deleteEmail.trim()}
            onClick={() => deleteAccount.mutate()}
          >
            <Trash2 className="h-4 w-4" />
            Delete my account
          </button>
          {deleteAccount.error ? (
            <p className="text-sm text-rose-700">{errorMessage(deleteAccount.error)}</p>
          ) : null}
        </div>
      </SettingsSection>

      <p className="text-xs text-stone-500">
        Read our{" "}
        <Link href="/privacy" className="text-forest-700 underline" target="_blank">
          Privacy Policy
        </Link>
        .
      </p>
    </div>
  );
}
