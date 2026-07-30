"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Leaf, ShieldCheck } from "lucide-react";
import { AranyixMark } from "@/components/brand/aranyix-logo";
import { errorMessage, verification, type PublicVerificationPayload } from "@/lib/api";

export default function PublicImpactPage() {
  const params = useParams();
  const token = params.token as string;

  const { data, isLoading, error } = useQuery({
    queryKey: ["public-impact", token],
    queryFn: () => verification.publicSnapshot(token),
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
            Public impact
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-8 px-4 py-10">
        {isLoading ? (
          <p className="text-sm text-stone-500">Loading impact snapshot…</p>
        ) : error ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-900">
            <p className="font-medium">Impact page unavailable</p>
            <p className="mt-2">{errorMessage(error)}</p>
          </div>
        ) : data ? (
          <ImpactView data={data} />
        ) : null}
      </main>
    </div>
  );
}

function ImpactView({ data }: { data: PublicVerificationPayload }) {
  const title = data.project?.name ?? data.tree?.public_code ?? "Plantation impact";
  const isEstimate =
    !data.credit_ledger?.status ||
    data.credit_ledger.status === "estimated" ||
    data.credit_ledger.net_credits_tco2e == null;

  return (
    <div className="space-y-8">
      <section className="relative overflow-hidden rounded-3xl border border-forest-200/60 bg-white shadow-sm">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-forest-100/80 via-transparent to-transparent" />
        <div className="relative px-6 py-10 sm:px-10">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-forest-700">
            Verified field evidence
          </p>
          <h1 className="mt-3 max-w-2xl font-display text-3xl font-semibold tracking-tight text-stone-950 sm:text-4xl">
            {title}
          </h1>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-stone-600">
            Geo-tagged trees, compliance signals, and carbon estimates from the Aranyix plantation
            operating system.
          </p>
          <p className="mt-4 inline-flex rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-[11px] font-medium text-amber-950">
            {isEstimate ? "Carbon figures are estimates — not issued credits" : "Ledger status present"}
          </p>
          <p className="mt-4 text-xs text-stone-400">
            Snapshot {new Date(data.generated_at).toLocaleString()}
            {data.link ? ` · ${data.link.view_count} views` : ""}
          </p>
        </div>
      </section>

      {data.project && data.summary ? (
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="Trees registered" value={String(data.summary.tree_count)} />
          <Stat label="Work areas" value={String(data.summary.work_area_count)} />
          <Stat label="Open compliance gaps" value={String(data.summary.open_violations)} />
          <Stat
            label="Native species"
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
          <h2 className="text-sm font-medium text-stone-800">Carbon ledger</h2>
          <dl className="mt-4 grid gap-4 sm:grid-cols-3 text-sm">
            <div>
              <dt className="text-stone-500">Status</dt>
              <dd className="mt-1 font-medium capitalize">{data.credit_ledger.status ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-stone-500">Net tCO₂e</dt>
              <dd className="mt-1 font-medium">
                {data.credit_ledger.net_credits_tco2e != null
                  ? data.credit_ledger.net_credits_tco2e.toFixed(2)
                  : "—"}
              </dd>
            </div>
            <div>
              <dt className="text-stone-500">Methodology</dt>
              <dd className="mt-1 font-medium">{data.credit_ledger.methodology ?? "—"}</dd>
            </div>
          </dl>
        </section>
      ) : null}

      {data.sample_trees && data.sample_trees.length > 0 ? (
        <section className="rounded-2xl border border-stone-200 bg-white p-6">
          <h2 className="flex items-center gap-2 text-sm font-medium text-stone-800">
            <Leaf className="h-4 w-4 text-forest-700" />
            Sample trees
          </h2>
          <ul className="mt-4 divide-y divide-stone-100">
            {data.sample_trees.map((t) => (
              <li key={t.public_code} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
                <div>
                  <div className="font-medium text-stone-900">{t.species}</div>
                  <div className="text-xs text-stone-500">{t.public_code}</div>
                </div>
                <div className="text-right text-xs text-stone-600">
                  <div className="capitalize">{t.health}</div>
                  <div>{t.carbon_kg.toFixed(1)} kg C</div>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <p className="text-center text-xs text-stone-500">{data.disclaimer}</p>
      <p className="text-center font-mono text-[10px] text-stone-400">
        SHA-256 {data.snapshot_sha256}
      </p>
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
