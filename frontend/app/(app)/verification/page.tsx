"use client";

import Link from "next/link";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, ShieldCheck, X } from "lucide-react";
import { EmptyState, PageHeader } from "@/components/ui";
import { errorMessage, verificationWorkflow } from "@/lib/api";
import { useAuth } from "@/lib/auth-store";
import { scopedKey } from "@/lib/query-keys";

export default function VerificationQueuePage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const tc = { section: "Intelligence", breadcrumb: "Verifier queue" };

  const { data: samples = [], isLoading, error } = useQuery({
    queryKey: scopedKey(user, "verification-samples", "pending"),
    queryFn: () => verificationWorkflow.listSamples({ pendingOnly: true }),
  });

  const [activeSampleId, setActiveSampleId] = useState<string | null>(null);

  const sampleQ = useQuery({
    queryKey: scopedKey(user, "verification-sample", activeSampleId),
    queryFn: () => verificationWorkflow.getSample(activeSampleId!),
    enabled: Boolean(activeSampleId),
  });

  const attest = useMutation({
    mutationFn: ({
      sampleId,
      itemId,
      status,
    }: {
      sampleId: string;
      itemId: string;
      status: "approved" | "rejected";
    }) => verificationWorkflow.attestItem(sampleId, itemId, { status }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: scopedKey(user, "verification-samples") });
      if (activeSampleId) {
        void qc.invalidateQueries({ queryKey: scopedKey(user, "verification-sample", activeSampleId) });
      }
    },
  });

  const pendingItems = (sampleQ.data?.items ?? []).filter((item) => item.status === "pending");

  return (
    <div className="space-y-6">
      <PageHeader
        purpose="Independent verification"
        title="Verifier queue"
        description="Review stratified tree samples and attest measurements without editing field data."
        breadcrumbs={[{ label: tc.section }, { label: tc.breadcrumb }]}
      />

      {error ? (
        <p className="text-sm text-rose-700">{errorMessage(error)}</p>
      ) : isLoading ? (
        <p className="text-sm text-stone-500">Loading verification samples…</p>
      ) : samples.length === 0 ? (
        <EmptyState
          icon={ShieldCheck}
          title="No open verification samples"
          description="Supervisors create samples from a project's compliance workspace. Pending attestations appear here."
          action={{ label: "Open projects", href: "/projects" }}
        />
      ) : (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
          <section className="card space-y-2">
            <h2 className="text-sm font-semibold text-stone-900 dark:text-stone-50">Open samples</h2>
            <ul className="divide-y divide-stone-100 dark:divide-stone-800">
              {samples.map((sample) => (
                <li key={sample.id}>
                  <button
                    type="button"
                    className="flex w-full items-start justify-between gap-3 py-3 text-left hover:bg-stone-50 dark:hover:bg-stone-900/40"
                    onClick={() => setActiveSampleId(sample.id)}
                  >
                    <div>
                      <p className="font-medium text-stone-900 dark:text-stone-50">
                        {(sample as { project_name?: string }).project_name ?? "Project sample"}
                      </p>
                      <p className="text-xs text-stone-500">
                        {sample.sample_pct}% · {sample.by_status?.pending ?? 0} pending
                      </p>
                    </div>
                    <span className="text-xs text-forest-700">Review</span>
                  </button>
                </li>
              ))}
            </ul>
          </section>

          <section className="card">
            {!activeSampleId ? (
              <p className="text-sm text-stone-500">Select a sample to review pending trees.</p>
            ) : sampleQ.isLoading ? (
              <p className="text-sm text-stone-500">Loading sample items…</p>
            ) : pendingItems.length === 0 ? (
              <EmptyState
                icon={ShieldCheck}
                title="Sample complete"
                description="All trees in this sample have been attested."
              />
            ) : (
              <ul className="divide-y divide-stone-100 dark:divide-stone-800">
                {pendingItems.map((item) => (
                  <li key={item.id} className="flex items-center justify-between gap-3 py-3">
                    <div>
                      <Link
                        href={`/trees/${item.tree_id}`}
                        className="font-medium text-forest-800 hover:underline"
                      >
                        {item.tree_public_code ?? item.tree_id}
                      </Link>
                      <p className="text-xs text-stone-500">Pending attestation</p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        className="btn-primary text-xs"
                        disabled={attest.isPending}
                        onClick={() =>
                          attest.mutate({
                            sampleId: activeSampleId,
                            itemId: item.id,
                            status: "approved",
                          })
                        }
                      >
                        <Check className="h-3 w-3" />
                        Approve
                      </button>
                      <button
                        type="button"
                        className="btn-secondary text-xs"
                        disabled={attest.isPending}
                        onClick={() =>
                          attest.mutate({
                            sampleId: activeSampleId,
                            itemId: item.id,
                            status: "rejected",
                          })
                        }
                      >
                        <X className="h-3 w-3" />
                        Reject
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            {attest.error ? (
              <p className="mt-3 text-xs text-rose-700">{errorMessage(attest.error)}</p>
            ) : null}
          </section>
        </div>
      )}
    </div>
  );
}
