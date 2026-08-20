"use client";

import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { Leaf } from "lucide-react";
import { CarbonEstimateLabel } from "@/components/carbon-estimate-label";
import { CarbonCo2eRange } from "@/components/carbon-co2e-range";
import { SettingsSection } from "@/components/settings/settings-section";
import { carbon, errorMessage } from "@/lib/api";

export function CarbonCalculatorForm() {
  const [species, setSpecies] = useState("Azadirachta indica");
  const [dbh, setDbh] = useState("25");
  const [height, setHeight] = useState("8");
  const [age, setAge] = useState("5");
  const [methodology, setMethodology] = useState<"IPCC_AR6" | "VERRA_VM0047" | "GOLD_STANDARD_LUF">(
    "VERRA_VM0047",
  );
  const [price, setPrice] = useState("12");

  const estimate = useMutation({
    mutationFn: () =>
      carbon.estimate({
        species,
        dbh_cm: dbh ? Number(dbh) : undefined,
        height_m: height ? Number(height) : undefined,
        age_years: age ? Number(age) : undefined,
        methodology,
        price_usd_per_credit: Number(price) || 12,
      }),
  });

  const result = estimate.data;

  return (
    <div className="space-y-6">
      <div className="card grid gap-4 md:grid-cols-2">
        <div className="md:col-span-2">
          <label className="label">Species</label>
          <input
            className="input w-full"
            placeholder="Scientific or common name"
            value={species}
            onChange={(e) => setSpecies(e.target.value)}
          />
        </div>
        <div>
          <label className="label">DBH (cm)</label>
          <input className="input w-full" type="number" min={0} value={dbh} onChange={(e) => setDbh(e.target.value)} />
        </div>
        <div>
          <label className="label">Height (m)</label>
          <input
            className="input w-full"
            type="number"
            min={0}
            step="0.1"
            value={height}
            onChange={(e) => setHeight(e.target.value)}
          />
        </div>
        <div>
          <label className="label">Age (years)</label>
          <input
            className="input w-full"
            type="number"
            min={0}
            step="0.5"
            value={age}
            onChange={(e) => setAge(e.target.value)}
          />
        </div>
        <div>
          <label className="label">Methodology</label>
          <select
            className="input w-full"
            value={methodology}
            onChange={(e) => setMethodology(e.target.value as typeof methodology)}
          >
            <option value="IPCC_AR6">IPCC AR6</option>
            <option value="VERRA_VM0047">Verra VM0047</option>
            <option value="GOLD_STANDARD_LUF">Gold Standard LUF</option>
          </select>
        </div>
        <div>
          <label className="label">Credit price (USD / tCO₂e)</label>
          <input
            className="input w-full"
            type="number"
            min={0}
            step="0.5"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
          />
        </div>
        <div className="md:col-span-2">
          <button
            type="button"
            className="btn-primary"
            disabled={estimate.isPending || !species.trim()}
            onClick={() => estimate.mutate()}
          >
            <Leaf className="h-4 w-4" />
            {estimate.isPending ? "Calculating…" : "Calculate"}
          </button>
        </div>
      </div>

      {estimate.error ? (
        <div className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:bg-rose-950/30 dark:text-rose-300">
          {errorMessage(estimate.error)}
        </div>
      ) : null}

      {result ? (
        <div className="card grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <div className="sm:col-span-2 lg:col-span-3 flex items-center gap-2 text-sm font-medium text-stone-700">
            Results
            <CarbonEstimateLabel />
          </div>
          <Metric label="Biomass" value={`${result.total_biomass_kg.toFixed(1)} kg`} />
          <Metric label="Stored carbon" value={`${result.carbon_kg.toFixed(1)} kg`} />
          <div className="rounded-lg border border-stone-200 px-3 py-2 dark:border-stone-700 sm:col-span-2">
            <div className="text-xs text-stone-500">CO₂ equivalent (90% CI)</div>
            <div className="mt-1 text-lg font-semibold text-forest-800 dark:text-forest-300">
              <CarbonCo2eRange data={result} />
            </div>
            {result.uncertainty_pct != null ? (
              <p className="mt-1 text-xs text-stone-500">
                Combined measurement + model uncertainty ±{result.uncertainty_pct.toFixed(1)}%.
                {result.creditable_co2e_kg != null && result.verra_deduction_pct
                  ? ` Creditable after Verra deduction: ${(result.creditable_co2e_kg / 1000).toFixed(3)} t.`
                  : null}
              </p>
            ) : null}
          </div>
          <Metric label="Annual sequestration" value={`${(result.annual_sequestration_kg ?? 0).toFixed(1)} kg/yr`} />
          <Metric
            label="Ex-ante lifetime (projected)"
            value={`${(result.projected_lifetime_credits_tco2e ?? result.lifetime_credits_tco2e ?? 0).toFixed(3)} tCO₂e`}
          />
          {result.verified_lifetime_credits_tco2e != null ? (
            <Metric
              label="Ex-post verified (standing stock)"
              value={`${result.verified_lifetime_credits_tco2e.toFixed(3)} tCO₂e`}
            />
          ) : null}
          {result.buffer_pct_applied != null ? (
            <Metric
              label="Buffer applied"
              value={`${(result.buffer_pct_applied * 100).toFixed(0)}%`}
            />
          ) : null}
          {result.effective_annual_mortality_pct != null ? (
            <Metric
              label="Mortality (annual est.)"
              value={`${result.effective_annual_mortality_pct.toFixed(1)}%`}
            />
          ) : null}
          <Metric label="Est. revenue" value={`$${(result.estimated_revenue_usd ?? 0).toFixed(0)}`} />
          <p className="sm:col-span-2 lg:col-span-3 text-xs text-stone-500">
            Ex-ante lifetime credits include mortality decay and permanence buffer. Ex-post verified
            credits reflect current standing biomass only (field-verified tiers).
            {(result.confidence * 100).toFixed(0)}% (not the same as statistical uncertainty above).
          </p>
        </div>
      ) : null}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-stone-200 px-3 py-2 dark:border-stone-700">
      <div className="text-xs text-stone-500">{label}</div>
      <div className="text-lg font-semibold text-forest-800 dark:text-forest-300">{value}</div>
    </div>
  );
}
