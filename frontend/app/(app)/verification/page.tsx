"use client";

import Link from "next/link";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, ShieldCheck, X } from "lucide-react";
import { EmptyState, PageHeader } from "@/components/ui";
import { errorMessage, verificationWorkflow } from "@/lib/api";
import { useAuth } from "@/lib/auth-store";
import { scopedKey } from "@/lib/query-keys";

export default function VerificationQueuePage() {
  const t = useTranslations("verificationPage");
  const { user } = useAuth();
  const qc = useQueryClient();

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
        purpose={t("purpose")}
        title={t("title")}
        description={t("description")}
        breadcrumbs={[{ label: t("section") }, { label: t("breadcrumb") }]}
      />

      {error ? (
        <p className="text-sm text-rose-700">{errorMessage(error)}</p>
      ) : isLoading ? (
        <p className="text-sm text-stone-500">{t("loadingSamples")}</p>
      ) : samples.length === 0 ? (
        <EmptyState
          icon={ShieldCheck}
          title={t("emptyTitle")}
          description={t("emptyDescription")}
          action={{ label: t("openProjects"), href: "/projects" }}
        />
      ) : (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
          <section className="card space-y-2">
            <h2 className="text-sm font-semibold text-stone-900 dark:text-stone-50">{t("openSamples")}</h2>
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
                        {(sample as { project_name?: string }).project_name ?? t("projectSample")}
                      </p>
                      <p className="text-xs text-stone-500">
                        {t("pendingCount", {
                          pct: sample.sample_pct,
                          pending: sample.by_status?.pending ?? 0,
                        })}
                      </p>
                    </div>
                    <span className="text-xs text-forest-700">{t("review")}</span>
                  </button>
                </li>
              ))}
            </ul>
          </section>

          <section className="card">
            {!activeSampleId ? (
              <p className="text-sm text-stone-500">{t("selectSample")}</p>
            ) : sampleQ.isLoading ? (
              <p className="text-sm text-stone-500">{t("loadingItems")}</p>
            ) : pendingItems.length === 0 ? (
              <EmptyState
                icon={ShieldCheck}
                title={t("sampleCompleteTitle")}
                description={t("sampleCompleteDescription")}
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
                      <p className="text-xs text-stone-500">{t("pendingAttestation")}</p>
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
                        {t("approve")}
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
                        {t("reject")}
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
