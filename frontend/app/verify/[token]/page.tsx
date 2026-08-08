"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { AranyixMark } from "@/components/brand/aranyix-logo";
import { errorMessage, verification, type PublicVerificationPayload } from "@/lib/api";

export default function PublicVerifyPage() {
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
            <span className="font-display text-lg font-semibold text-forest-900">Aranyix</span>
          </Link>
          <div className="flex items-center gap-2 text-xs text-stone-500">
            <ShieldCheck className="h-4 w-4 text-forest-700" />
            Public verification
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-8 px-4 py-10">
        {isLoading ? (
          <VerifySkeleton />
        ) : error ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-900">
            <p className="font-medium">Verification link unavailable</p>
            <p className="mt-2">{errorMessage(error)}</p>
          </div>
        ) : data ? (
          <VerificationView data={data} />
        ) : null}
      </main>
    </div>
  );
}

function VerifySkeleton() {
  return (
    <div className="space-y-8" aria-busy="true" aria-label="Loading verification snapshot">
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
  const title = data.project?.name ?? data.tree?.public_code ?? "Environmental record";

  return (
    <div className="space-y-8">
      <section className="relative overflow-hidden rounded-3xl border border-forest-200/60 bg-white shadow-sm">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-forest-100/80 via-transparent to-transparent" />
        <div className="relative px-6 py-10 sm:px-10">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-forest-700">
            Verified snapshot
          </p>
          <h1 className="mt-3 max-w-2xl font-display text-3xl font-semibold tracking-tight text-stone-950 sm:text-4xl">
            {title}
          </h1>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-stone-600">
            Independent public record of geo-tagged trees, compliance signals, and carbon estimates
            from Aranyix.
          </p>
          <p className="mt-4 text-xs text-stone-400">
            Generated {new Date(data.generated_at).toLocaleString()}
            {data.link ? ` · ${data.link.view_count} views` : ""}
          </p>
          {data.disclaimer ? (
            <p className="mt-4 max-w-2xl text-xs leading-relaxed text-amber-950/80">{data.disclaimer}</p>
          ) : null}
        </div>
      </section>

      {data.project && data.summary ? (
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="Trees" value={String(data.summary.tree_count)} />
          <Stat label="Work areas" value={String(data.summary.work_area_count)} />
          <Stat label="Open gaps" value={String(data.summary.open_violations)} />
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
          <h2 className="text-sm font-medium text-stone-800">Credit ledger</h2>
          <p className="mt-2 text-sm text-stone-600">
            Status: <span className="capitalize">{data.credit_ledger.status ?? "—"}</span>
            {data.credit_ledger.net_credits_tco2e != null
              ? ` · ${data.credit_ledger.net_credits_tco2e.toFixed(4)} tCO₂e net (est.)`
              : ""}
          </p>
        </section>
      ) : null}

      {data.checklists && data.checklists.length > 0 ? (
        <section className="rounded-2xl border border-stone-200 bg-white p-6">
          <h2 className="mb-3 text-sm font-medium text-stone-800">Checklist readiness</h2>
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
                <th className="px-4 py-3 font-medium">Code</th>
                <th className="px-4 py-3 font-medium">Species</th>
                <th className="px-4 py-3 font-medium">Health</th>
                <th className="px-4 py-3 font-medium">Carbon (kg)</th>
                <th className="px-4 py-3 font-medium">Geo-tagged</th>
              </tr>
            </thead>
            <tbody>
              {data.sample_trees.map((t) => (
                <tr key={t.public_code} className="border-t border-stone-100">
                  <td className="px-4 py-2.5 font-mono text-xs">{t.public_code}</td>
                  <td className="px-4 py-2.5">{t.species}</td>
                  <td className="px-4 py-2.5 capitalize">{t.health}</td>
                  <td className="px-4 py-2.5">{t.carbon_kg.toFixed(2)}</td>
                  <td className="px-4 py-2.5">{t.geo_tagged ? "Yes" : "No"}</td>
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
            Health: {data.tree.health} · Status: {data.tree.status}
          </p>
          <p className="mt-1">
            Carbon: {data.tree.carbon_kg.toFixed(2)} kg · Satellite verified:{" "}
            {data.tree.satellite_verified ? "Yes" : "No"}
          </p>
        </section>
      ) : null}

      <details className="rounded-2xl border border-stone-200 bg-white px-5 py-4 text-sm open:shadow-sm">
        <summary className="cursor-pointer font-medium text-stone-800">Cryptographic proof</summary>
        <p className="mt-3 text-xs leading-relaxed text-stone-500">
          SHA-256 hash of this verification snapshot. Use it to confirm the page contents have not
          been altered since generation.
        </p>
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
