"use client";

import Link from "next/link";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Building2, MapPin, Sprout, Target } from "lucide-react";
import { fmtNum, fmtPct } from "@/components/dashboard/format";
import { plantationReportApi } from "@/lib/plantation-report-api";
import { resolvePlantingAudience } from "@/lib/audience";
import { scopedKey } from "@/lib/query-keys";
import { useAuth } from "@/lib/auth-store";
import { cn } from "@/lib/cn";

function formatScheme(code: string) {
  return code.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function GovernmentRollupPanel() {
  const { user } = useAuth();
  const audience = resolvePlantingAudience(user?.audience);
  const [groupBy, setGroupBy] = useState<"district" | "block">("district");

  const { data, isLoading } = useQuery({
    queryKey: scopedKey(user, "district-rollup", groupBy),
    queryFn: () => plantationReportApi.districtRollup({ group_by: groupBy }),
    enabled: audience === "government",
    staleTime: 60_000,
  });

  if (audience !== "government") {
    return null;
  }

  if (isLoading || !data) {
    return (
      <section className="dash-panel">
        <div className="intel-skeleton h-8 w-56 rounded" />
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="intel-skeleton h-20 rounded-lg" />
          ))}
        </div>
        <div className="intel-skeleton mt-4 h-40 rounded-lg" />
      </section>
    );
  }

  const totals = data.totals;
  const schemeEntries = Object.entries(data.by_scheme).sort(
    (a, b) => b[1].registered_trees - a[1].registered_trees,
  );

  return (
    <section className="dash-panel">
      <div className="dash-panel-head">
        <div>
          <h2 className="dash-panel-title flex items-center gap-2">
            <Building2 className="h-4 w-4 text-forest-600" />
            District plantation rollup
          </h2>
          <p className="dash-panel-sub">
            Scheme delivery, survival, and geo-tag coverage across {fmtNum(data.total)}{" "}
            {groupBy === "block" ? "blocks" : "districts"}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-full border border-stone-200 bg-white p-0.5 text-xs">
            {(["district", "block"] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setGroupBy(mode)}
                className={cn(
                  "rounded-full px-3 py-1 font-medium capitalize transition",
                  groupBy === mode
                    ? "bg-forest-700 text-white"
                    : "text-stone-600 hover:text-forest-800",
                )}
              >
                {mode}
              </button>
            ))}
          </div>
          <Link href="/reports/plantation/district-block" className="dash-link">
            Full report <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          {
            label: "Projects",
            value: fmtNum(totals.project_count),
            icon: Target,
            warn: false,
          },
          {
            label: "Trees registered",
            value: fmtNum(totals.registered_trees),
            icon: Sprout,
            warn: totals.gap > 0,
          },
          {
            label: "Avg survival",
            value: totals.avg_survival_pct == null ? "—" : fmtPct(totals.avg_survival_pct),
            icon: Sprout,
            warn: (totals.avg_survival_pct ?? 100) < 70,
          },
          {
            label: "Geo-tagged",
            value: totals.avg_geo_tagged_pct == null ? "—" : fmtPct(totals.avg_geo_tagged_pct),
            icon: MapPin,
            warn: (totals.avg_geo_tagged_pct ?? 100) < 80,
          },
        ].map((item) => (
          <div
            key={item.label}
            className={cn("dash-command-item", item.warn && "dash-command-item--warn")}
          >
            <item.icon className="h-4 w-4 shrink-0 opacity-70" />
            <div>
              <p className="dash-command-value">{item.value}</p>
              <p className="dash-command-label">{item.label}</p>
            </div>
          </div>
        ))}
      </div>

      {schemeEntries.length > 0 ? (
        <div className="mt-4 flex flex-wrap gap-2 border-t border-stone-100 pt-4">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-stone-500">
            By scheme
          </span>
          {schemeEntries.slice(0, 6).map(([code, bucket]) => (
            <span
              key={code}
              className="inline-flex items-center gap-1 rounded-full border border-forest-100 bg-forest-50 px-2.5 py-1 text-[11px] font-medium text-forest-800"
            >
              {formatScheme(code)}
              <span className="text-forest-600">
                {fmtNum(bucket.registered_trees)} trees · {bucket.on_track}/{bucket.project_count} on track
              </span>
            </span>
          ))}
        </div>
      ) : null}

      <div className="mt-4 overflow-x-auto rounded-xl border border-stone-200">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-stone-50 text-xs uppercase tracking-wide text-stone-500">
            <tr>
              <th className="px-3 py-2 font-semibold">Location</th>
              <th className="px-3 py-2 font-semibold">Projects</th>
              <th className="px-3 py-2 font-semibold">Registered</th>
              <th className="px-3 py-2 font-semibold">Achievement</th>
              <th className="px-3 py-2 font-semibold">Survival</th>
              <th className="px-3 py-2 font-semibold">Geo-tag</th>
              <th className="px-3 py-2 font-semibold">Due</th>
            </tr>
          </thead>
          <tbody>
            {data.items.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-3 py-6 text-center text-stone-500">
                  No plantation projects with district metadata yet.
                </td>
              </tr>
            ) : (
              data.items.map((row) => (
                <tr key={`${row.state_code}-${row.district_code}-${row.block_name ?? ""}`} className="border-t border-stone-100">
                  <td className="px-3 py-2">
                    <p className="font-medium text-stone-900">{row.district_name || "Unassigned"}</p>
                    <p className="text-xs text-stone-500">
                      {[row.state_name, groupBy === "block" ? row.block_name : null]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  </td>
                  <td className="px-3 py-2">{fmtNum(row.project_count)}</td>
                  <td className="px-3 py-2">{fmtNum(row.registered_trees)}</td>
                  <td className="px-3 py-2">
                    {row.achievement_pct == null ? "—" : fmtPct(row.achievement_pct)}
                  </td>
                  <td className="px-3 py-2">
                    {row.avg_survival_pct == null ? "—" : fmtPct(row.avg_survival_pct)}
                  </td>
                  <td className="px-3 py-2">
                    {row.avg_geo_tagged_pct == null ? "—" : fmtPct(row.avg_geo_tagged_pct)}
                  </td>
                  <td className="px-3 py-2">
                    {row.survival_due > 0 ? (
                      <span className="font-medium text-amber-700">{fmtNum(row.survival_due)}</span>
                    ) : (
                      "0"
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
