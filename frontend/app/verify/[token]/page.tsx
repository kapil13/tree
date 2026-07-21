"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ShieldCheck } from "lucide-react";
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
    <div className="min-h-screen bg-gradient-to-b from-stone-50 to-stone-100">
      <header className="border-b border-stone-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-4 px-4 py-4">
          <Link href="/" className="text-sm font-semibold text-forest-800">
            Aranyix
          </Link>
          <div className="flex items-center gap-2 text-xs text-stone-500">
            <ShieldCheck className="h-4 w-4 text-forest-700" />
            Public verification
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl space-y-6 px-4 py-8">
        {isLoading ? (
          <p className="text-sm text-stone-500">Loading verification snapshot…</p>
        ) : error ? (
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-900">
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

function VerificationView({ data }: { data: PublicVerificationPayload }) {
  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-wide text-forest-700">
          Verified snapshot
        </p>
        <h1 className="mt-2 text-2xl font-semibold text-stone-900">
          {data.project?.name ?? data.tree?.public_code ?? "Environmental record"}
        </h1>
        <p className="mt-1 text-sm text-stone-500">
          Generated {new Date(data.generated_at).toLocaleString()}
          {data.link ? ` · ${data.link.view_count} views` : ""}
        </p>
        <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          {data.disclaimer}
        </p>
        <p className="mt-3 font-mono text-[10px] text-stone-400">
          SHA-256: {data.snapshot_sha256}
        </p>
      </div>

      {data.project && data.summary ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="Trees" value={String(data.summary.tree_count)} />
          <Stat label="Work areas" value={String(data.summary.work_area_count)} />
          <Stat label="Open violations" value={String(data.summary.open_violations)} />
          <Stat
            label="Native species"
            value={
              data.summary.native_species_pct != null
                ? `${data.summary.native_species_pct}%`
                : "—"
            }
          />
        </div>
      ) : null}

      {data.credit_ledger ? (
        <section className="rounded-xl border border-stone-200 bg-white p-5">
          <h2 className="text-sm font-semibold text-stone-800">Credit ledger</h2>
          <p className="mt-2 text-sm text-stone-600">
            Status: <span className="capitalize">{data.credit_ledger.status ?? "—"}</span>
            {data.credit_ledger.net_credits_tco2e != null
              ? ` · ${data.credit_ledger.net_credits_tco2e.toFixed(4)} tCO₂e net (est.)`
              : ""}
          </p>
        </section>
      ) : null}

      {data.checklists && data.checklists.length > 0 ? (
        <section className="rounded-xl border border-stone-200 bg-white p-5">
          <h2 className="mb-3 text-sm font-semibold text-stone-800">Checklist readiness</h2>
          <ul className="space-y-2 text-sm">
            {data.checklists.map((c) => (
              <li key={c.code} className="flex justify-between gap-4 border-b border-stone-100 pb-2">
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
        <section className="overflow-x-auto rounded-xl border border-stone-200 bg-white">
          <table className="min-w-full text-sm">
            <thead className="bg-stone-50 text-left text-stone-600">
              <tr>
                <th className="px-4 py-2 font-medium">Code</th>
                <th className="px-4 py-2 font-medium">Species</th>
                <th className="px-4 py-2 font-medium">Health</th>
                <th className="px-4 py-2 font-medium">Carbon (kg)</th>
                <th className="px-4 py-2 font-medium">Geo-tagged</th>
              </tr>
            </thead>
            <tbody>
              {data.sample_trees.map((t) => (
                <tr key={t.public_code} className="border-t border-stone-100">
                  <td className="px-4 py-2 font-mono text-xs">{t.public_code}</td>
                  <td className="px-4 py-2">{t.species}</td>
                  <td className="px-4 py-2 capitalize">{t.health}</td>
                  <td className="px-4 py-2">{t.carbon_kg.toFixed(2)}</td>
                  <td className="px-4 py-2">{t.geo_tagged ? "Yes" : "No"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ) : null}

      {data.tree ? (
        <section className="rounded-xl border border-stone-200 bg-white p-5 text-sm text-stone-700">
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
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-stone-200 bg-white p-4">
      <p className="text-xs text-stone-500">{label}</p>
      <p className="mt-1 text-xl font-semibold">{value}</p>
    </div>
  );
}
