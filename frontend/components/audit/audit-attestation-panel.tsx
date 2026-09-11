"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Gavel, ShieldCheck } from "lucide-react";
import { auditEngagements } from "@/lib/api";
import { cn } from "@/lib/cn";

type ReviewItem = {
  id: string;
  title: string;
  severity: string;
  status: string;
  needs_review: boolean;
  boundary_name?: string | null;
  latest_review?: { disposition: string; rationale: string } | null;
};

export function AuditAttestationPanel({
  engagementId,
  engagementStatus,
}: {
  engagementId: string;
  engagementStatus: string;
}) {
  const t = useTranslations("auditAttestation");
  const qc = useQueryClient();
  const [signForm, setSignForm] = useState({ verdict: "conditional", summary: "", notes: "" });
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [reviewForm, setReviewForm] = useState({ disposition: "uphold", rationale: "" });

  const enabled =
    engagementStatus === "export_ready" ||
    engagementStatus === "under_review" ||
    engagementStatus === "attested";

  const { data, isLoading } = useQuery({
    queryKey: ["audit-attestation", engagementId],
    queryFn: () => auditEngagements.getAttestation(engagementId),
    enabled,
  });

  const review = useMutation({
    mutationFn: (anomalyId: string) =>
      auditEngagements.reviewAnomaly(engagementId, anomalyId, reviewForm),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["audit-attestation", engagementId] });
      setReviewingId(null);
      setReviewForm({ disposition: "uphold", rationale: "" });
      qc.invalidateQueries({ queryKey: ["audit-engagement"] });
    },
  });

  const sign = useMutation({
    mutationFn: () => auditEngagements.signAttestation(engagementId, signForm),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["audit-attestation", engagementId] });
      qc.invalidateQueries({ queryKey: ["audit-engagement"] });
    },
  });

  if (!enabled) {
    return <section className="card text-sm text-stone-500">{t("exportRequired")}</section>;
  }

  if (isLoading) {
    return <p className="text-sm text-stone-500">{t("loading")}</p>;
  }

  const items = (data?.review_queue?.items ?? []) as ReviewItem[];
  const pending = data?.review_queue?.pending_review_count ?? 0;
  const attestation = data?.attestation;

  return (
    <section className="space-y-6">
      <header className="space-y-2">
        <div className="flex flex-wrap items-center gap-3">
          <Gavel className="h-6 w-6 text-forest-700" aria-hidden />
          <h2 className="text-lg font-semibold text-stone-900 dark:text-stone-100">
            {t("title")}
          </h2>
          {engagementStatus === "attested" && (
            <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-800 ring-1 ring-emerald-200">
              {t("statusAttested")}
            </span>
          )}
        </div>
        <p className="text-sm text-stone-600 dark:text-stone-400">{t("subtitle")}</p>
        <p className="text-xs text-stone-500">{t("epistemicNote")}</p>
      </header>

      {attestation?.status === "signed" && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm">
          <p className="flex items-center gap-2 font-medium text-emerald-900">
            <ShieldCheck className="h-4 w-4" aria-hidden />
            {t("signedVerdict", { verdict: attestation.verdict })}
          </p>
          <p className="mt-1 text-emerald-800">{attestation.summary}</p>
          {attestation.attestation_hash && (
            <p className="mt-2 text-xs text-emerald-700">
              {t("hash", { sha: attestation.attestation_hash.slice(0, 16) })}
            </p>
          )}
        </div>
      )}

      {engagementStatus !== "attested" && (
        <>
          <p className="text-sm text-stone-600">
            {t("pendingReviews", { count: pending })}
          </p>

          <div className="space-y-3">
            {items.length === 0 ? (
              <p className="text-sm text-stone-500">{t("noAnomalies")}</p>
            ) : (
              items.map((item) => (
                <article
                  key={item.id}
                  className={cn(
                    "rounded-xl border p-4",
                    item.needs_review
                      ? "border-amber-200 bg-amber-50/50"
                      : "border-stone-200 dark:border-stone-700",
                  )}
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="text-xs text-stone-500">{item.boundary_name}</p>
                      <h3 className="font-medium text-stone-900">{item.title}</h3>
                      <p className="text-xs text-stone-500">
                        {item.severity} · {item.status}
                      </p>
                      {item.latest_review && (
                        <p className="mt-1 text-xs text-stone-600">
                          {t("lastReview", {
                            disposition: item.latest_review.disposition,
                          })}
                        </p>
                      )}
                    </div>
                  </div>
                  {engagementStatus !== "attested" && (
                    <div className="mt-3 border-t border-stone-100 pt-3 dark:border-stone-800">
                      {reviewingId === item.id ? (
                        <div className="space-y-2">
                          <select
                            className="input text-sm"
                            value={reviewForm.disposition}
                            onChange={(e) =>
                              setReviewForm((f) => ({ ...f, disposition: e.target.value }))
                            }
                          >
                            <option value="uphold">{t("uphold")}</option>
                            <option value="overturn">{t("overturn")}</option>
                            <option value="defer">{t("defer")}</option>
                          </select>
                          <textarea
                            className="input text-sm"
                            rows={2}
                            placeholder={t("rationale")}
                            value={reviewForm.rationale}
                            onChange={(e) =>
                              setReviewForm((f) => ({ ...f, rationale: e.target.value }))
                            }
                          />
                          <div className="flex gap-2">
                            <button
                              type="button"
                              className="btn-primary text-sm"
                              disabled={!reviewForm.rationale || review.isPending}
                              onClick={() => review.mutate(item.id)}
                            >
                              {t("submitReview")}
                            </button>
                            <button
                              type="button"
                              className="text-sm text-stone-500"
                              onClick={() => setReviewingId(null)}
                            >
                              {t("cancel")}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          type="button"
                          className="text-sm text-forest-700 underline"
                          onClick={() => setReviewingId(item.id)}
                        >
                          {t("reviewAnomaly")}
                        </button>
                      )}
                    </div>
                  )}
                </article>
              ))
            )}
          </div>

          {data?.can_sign && (
            <div className="space-y-3 rounded-xl border border-stone-200 p-4 dark:border-stone-700">
              <h3 className="text-sm font-semibold">{t("signTitle")}</h3>
              <select
                className="input text-sm"
                value={signForm.verdict}
                onChange={(e) => setSignForm((f) => ({ ...f, verdict: e.target.value }))}
              >
                <option value="approved">{t("verdictApproved")}</option>
                <option value="conditional">{t("verdictConditional")}</option>
                <option value="rejected">{t("verdictRejected")}</option>
              </select>
              <textarea
                className="input text-sm"
                rows={2}
                placeholder={t("summary")}
                value={signForm.summary}
                onChange={(e) => setSignForm((f) => ({ ...f, summary: e.target.value }))}
              />
              <textarea
                className="input text-sm"
                rows={2}
                placeholder={t("notes")}
                value={signForm.notes}
                onChange={(e) => setSignForm((f) => ({ ...f, notes: e.target.value }))}
              />
              <button
                type="button"
                className="btn-primary text-sm"
                disabled={!signForm.summary || sign.isPending}
                onClick={() => sign.mutate()}
              >
                {t("signAttestation")}
              </button>
            </div>
          )}
        </>
      )}
    </section>
  );
}
