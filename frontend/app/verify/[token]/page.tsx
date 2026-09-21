"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { ShieldCheck } from "lucide-react";
import { AranyixMark } from "@/components/brand/aranyix-logo";
import { errorMessage, verification, type PublicVerificationPayload } from "@/lib/api";

export default function PublicVerifyPage() {
  const t = useTranslations("publicVerifyPage");
  const params = useParams();
  const token = params.token as string;

  const { data, isLoading, error } = useQuery({
    queryKey: ["public-verify", token],
    queryFn: () => verification.publicSnapshot(token),
    retry: false,
  });

  return (
    <div className="min-h-screen bg-gradient-to-b from-forest-50 via-stone-50 to-stone-100">
      <header className="border-b border-stone-200/80 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-4">
          <Link href="/" className="flex items-center gap-2">
            <AranyixMark className="h-8 w-8" />
            <span className="font-display text-lg font-semibold text-forest-900">{t("brand")}</span>
          </Link>
          <div className="flex items-center gap-2 text-xs text-stone-500">
            <ShieldCheck className="h-4 w-4 text-forest-700" />
            {t("header")}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-8 px-4 py-10">
        {isLoading ? (
          <VerifySkeleton label={t("loadingAria")} />
        ) : error ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-900">
            <p className="font-medium">{t("unavailableTitle")}</p>
            <p className="mt-2">{errorMessage(error)}</p>
          </div>
        ) : data ? (
          <VerificationView data={data} />
        ) : null}
      </main>
    </div>
  );
}

function VerifySkeleton({ label }: { label: string }) {
  return (
    <div className="space-y-8" aria-busy="true" aria-label={label}>
      <div className="h-48 animate-pulse rounded-3xl bg-stone-200/80" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 animate-pulse rounded-2xl bg-stone-200/70" />
        ))}
      </div>
      <div className="h-36 animate-pulse rounded-2xl bg-stone-200/70" />
    </div>
  );
}

function VerificationView({ data }: { data: PublicVerificationPayload }) {
  const t = useTranslations("publicVerifyPage");
  const title = data.project?.name ?? data.tree?.public_code ?? t("defaultTitle");
  const generatedDate = new Date(data.generated_at).toLocaleString();
  const viewsSuffix = data.link ? ` · ${data.link.view_count} views` : "";

  return (
    <div className="space-y-8">
      <section className="relative overflow-hidden rounded-3xl border border-forest-200/60 bg-white shadow-sm">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-forest-100/80 via-transparent to-transparent" />
        <div className="relative px-6 py-10 sm:px-10">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-forest-700">
            {t("eyebrow")}
          </p>
          <h1 className="mt-3 max-w-2xl font-display text-3xl font-semibold tracking-tight text-stone-950 sm:text-4xl">
            {title}
          </h1>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-stone-600">{t("heroDescription")}</p>
          <p className="mt-4 text-xs text-stone-400">
            {t("generatedMeta", { date: `${generatedDate}${viewsSuffix}` })}
          </p>
          {data.disclaimer ? (
            <p className="mt-4 max-w-2xl text-xs leading-relaxed text-amber-950/80">{data.disclaimer}</p>
          ) : null}
        </div>
      </section>

      {data.project && data.summary ? (
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label={t("trees")} value={String(data.summary.tree_count)} />
          <Stat label={t("workAreas")} value={String(data.summary.work_area_count)} />
          <Stat label={t("openGaps")} value={String(data.summary.open_violations)} />
          <Stat
            label={t("nativeSpecies")}
            value={
              data.summary.native_species_pct != null
                ? `${data.summary.native_species_pct}%`
                : "—"
            }
          />
        </section>
      ) : null}

      {data.credit_ledger ? (
        <section className="rounded-2xl border border-stone-200 bg-white p-6">
          <h2 className="text-sm font-medium text-stone-800">{t("creditLedger")}</h2>
          <p className="mt-2 text-sm text-stone-600">
            {t("ledgerStatus", {
              status: data.credit_ledger.status ?? "—",
              net:
                data.credit_ledger.net_credits_tco2e != null
                  ? ` · ${data.credit_ledger.net_credits_tco2e.toFixed(4)} tCO₂e net (est.)`
                  : "",
            })}
          </p>
        </section>
      ) : null}

      {data.checklists && data.checklists.length > 0 ? (
        <section className="rounded-2xl border border-stone-200 bg-white p-6">
          <h2 className="mb-3 text-sm font-medium text-stone-800">{t("checklistReadiness")}</h2>
          <ul className="space-y-2 text-sm">
            {data.checklists.map((c) => (
              <li key={c.code} className="flex justify-between gap-4 border-b border-stone-100 pb-2 last:border-0">
                <span className="font-mono text-xs">{c.code}</span>
                <span className="capitalize text-stone-600">
                  {c.eligibility_status.replace(/_/g, " ")} ({c.score_pct.toFixed(0)}%)
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {data.sample_trees && data.sample_trees.length > 0 ? (
        <section className="overflow-hidden rounded-2xl border border-stone-200 bg-white">
          <table className="min-w-full text-sm">
            <thead className="bg-stone-50 text-left text-stone-600">
              <tr>
                <th className="px-4 py-3 font-medium">{t("colCode")}</th>
                <th className="px-4 py-3 font-medium">{t("colSpecies")}</th>
                <th className="px-4 py-3 font-medium">{t("colHealth")}</th>
                <th className="px-4 py-3 font-medium">{t("colCarbon")}</th>
                <th className="px-4 py-3 font-medium">{t("colGeoTagged")}</th>
              </tr>
            </thead>
            <tbody>
              {data.sample_trees.map((tree) => (
                <tr key={tree.public_code} className="border-t border-stone-100">
                  <td className="px-4 py-2.5 font-mono text-xs">{tree.public_code}</td>
                  <td className="px-4 py-2.5">{tree.species}</td>
                  <td className="px-4 py-2.5 capitalize">{tree.health}</td>
                  <td className="px-4 py-2.5">{tree.carbon_kg.toFixed(2)}</td>
                  <td className="px-4 py-2.5">{tree.geo_tagged ? t("yes") : t("no")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ) : null}

      {data.tree ? (
        <section className="rounded-2xl border border-stone-200 bg-white p-6 text-sm text-stone-700">
          <p>
            <strong>{data.tree.public_code}</strong> · {data.tree.species}
          </p>
          <p className="mt-2 capitalize">
            {t("treeHealthStatus", { health: data.tree.health, status: data.tree.status })}
          </p>
          <p className="mt-1">
            {t("treeCarbonSatellite", {
              carbon: data.tree.carbon_kg.toFixed(2),
              verified: data.tree.satellite_verified ? t("yes") : t("no"),
            })}
          </p>
        </section>
      ) : null}

      <details className="rounded-2xl border border-stone-200 bg-white px-5 py-4 text-sm open:shadow-sm">
        <summary className="cursor-pointer font-medium text-stone-800">{t("cryptoProof")}</summary>
        <p className="mt-3 text-xs leading-relaxed text-stone-500">{t("cryptoDescription")}</p>
        <p className="mt-2 break-all font-mono text-[11px] text-stone-600">{data.snapshot_sha256}</p>
      </details>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-stone-200 bg-white px-5 py-4">
      <p className="text-xs uppercase tracking-wide text-stone-500">{label}</p>
      <p className="mt-2 font-display text-2xl font-semibold text-stone-950">{value}</p>
    </div>
  );
}
