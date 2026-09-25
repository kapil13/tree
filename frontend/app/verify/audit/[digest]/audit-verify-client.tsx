"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { GitCompare, ShieldCheck } from "lucide-react";
import { AranyixMark } from "@/components/brand/aranyix-logo";
import { auditEngagements, errorMessage } from "@/lib/api";

type AuditVerificationPayload = {
  resource_type: string;
  project: { code: string; name: string; segment: string; scheme_code?: string | null };
  engagement: {
    status: string;
    export_bundle_sha256?: string | null;
    exported_at?: string | null;
    attested_at?: string | null;
  };
  attestation?: {
    verdict: string;
    summary: string;
    status: string;
    attestation_hash?: string | null;
    signed_at?: string | null;
  } | null;
  signatures: Array<{ role: string; verdict: string; summary: string; signature_hash: string; signed_at: string }>;
  reconciliation: { aligned_count: number; mismatch_count: number; no_field_data_count: number };
  snapshot_sha256: string;
  disclaimer: string;
  public_verify_url?: string;
};

export default function PublicAuditVerifyPage() {
  const params = useParams();
  const digest = params.digest as string;
  const t = useTranslations("auditVerify");

  const { data, isLoading, error } = useQuery({
    queryKey: ["public-audit-verify", digest],
    queryFn: () => auditEngagements.publicVerify(digest) as Promise<AuditVerificationPayload>,
    retry: false,
  });

  return (
    <div className="min-h-screen bg-gradient-to-b from-forest-50 via-stone-50 to-stone-100">
      <header className="border-b border-stone-200/80 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-4">
          <Link href="/" className="flex items-center gap-2">
            <AranyixMark className="h-8 w-8" />
            <span className="font-display text-lg font-semibold text-forest-900">Aranyix</span>
          </Link>
          <div className="flex items-center gap-2 text-xs text-stone-500">
            <ShieldCheck className="h-4 w-4 text-forest-700" />
            {t("header")}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-6 px-4 py-10">
        {isLoading ? (
          <div className="h-48 animate-pulse rounded-3xl bg-stone-200/80" />
        ) : error ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-900">
            <p className="font-medium">{t("unavailable")}</p>
            <p className="mt-2">{errorMessage(error)}</p>
          </div>
        ) : data ? (
          <AuditVerificationView data={data} />
        ) : null}
      </main>
    </div>
  );
}

function AuditVerificationView({ data }: { data: AuditVerificationPayload }) {
  const t = useTranslations("auditVerify");

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-forest-200/60 bg-white p-8 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-forest-700">
          {t("kicker")}
        </p>
        <h1 className="mt-3 font-display text-3xl font-semibold text-stone-950">
          {data.project.name}
        </h1>
        <p className="mt-2 text-sm text-stone-600">
          {data.project.code} · {data.project.segment.replaceAll("_", " ")} · {t("status")}{" "}
          <span className="font-medium capitalize">{data.engagement.status.replaceAll("_", " ")}</span>
        </p>
        {data.attestation ? (
          <div className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
            <p className="font-semibold">
              {t("verdict", { verdict: data.attestation.verdict })}
            </p>
            <p className="mt-1">{data.attestation.summary}</p>
          </div>
        ) : null}
      </section>

      <div className="grid gap-4 sm:grid-cols-3">
        <Metric label={t("exportHash")} value={data.engagement.export_bundle_sha256?.slice(0, 16) ?? "—"} />
        <Metric
          label={t("signatures")}
          value={String(data.signatures.length)}
        />
        <Metric
          label={t("reconciliation")}
          value={t("mismatchCount", { count: data.reconciliation.mismatch_count })}
        />
      </div>

      {data.signatures.length > 0 ? (
        <section className="rounded-2xl border border-stone-200 bg-white p-6">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-stone-900">
            <ShieldCheck className="h-4 w-4 text-forest-700" />
            {t("signaturesTitle")}
          </h2>
          <ul className="mt-4 space-y-3">
            {data.signatures.map((sig) => (
              <li key={sig.signature_hash} className="rounded-lg border border-stone-100 p-3 text-sm">
                <p className="font-medium capitalize text-stone-900">
                  {sig.role} · {sig.verdict}
                </p>
                <p className="mt-1 text-stone-600">{sig.summary}</p>
                <p className="mt-1 font-mono text-xs text-stone-400">{sig.signature_hash.slice(0, 24)}…</p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="rounded-2xl border border-stone-200 bg-white p-6 text-sm text-stone-600">
        <p className="flex items-center gap-2 font-medium text-stone-900">
          <GitCompare className="h-4 w-4" />
          {t("reconciliationTitle")}
        </p>
        <p className="mt-2">
          {t("reconciliationSummary", {
            aligned: data.reconciliation.aligned_count,
            mismatch: data.reconciliation.mismatch_count,
            noField: data.reconciliation.no_field_data_count,
          })}
        </p>
        <p className="mt-4 font-mono text-xs text-stone-400">{t("snapshot")} {data.snapshot_sha256.slice(0, 24)}…</p>
        <p className="mt-4 text-xs text-stone-500">{data.disclaimer}</p>
      </section>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-4">
      <p className="text-xs uppercase tracking-wide text-stone-500">{label}</p>
      <p className="mt-1 font-semibold text-stone-900">{value}</p>
    </div>
  );
}
