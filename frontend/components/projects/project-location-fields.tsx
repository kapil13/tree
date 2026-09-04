"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { indiaAdmin } from "@/lib/api";
import {
  EMPTY_PROJECT_LOCATION,
  type ProjectAreaType,
  type ProjectLocation,
} from "@/lib/project-location";
import { cn } from "@/lib/cn";
import { ClimateZoneBadge } from "@/components/projects/climate-zone-badge";

type ProjectLocationFieldsProps = {
  value: ProjectLocation;
  onChange: (next: ProjectLocation) => void;
  errors?: Record<string, string>;
  className?: string;
};

function AdminSelect({
  label,
  required,
  value,
  options,
  loading,
  disabled,
  placeholder,
  error,
  manualFallback,
  manualValue,
  onSelect,
  onManualChange,
}: {
  label: string;
  required?: boolean;
  value: string;
  options: { code: string; name: string }[];
  loading?: boolean;
  disabled?: boolean;
  placeholder: string;
  error?: string;
  manualFallback?: boolean;
  manualValue?: string;
  onSelect: (code: string, name: string) => void;
  onManualChange?: (name: string) => void;
}) {
  const showManual = manualFallback || options.length === 0;
  return (
    <div>
      <label className="label">
        {label}
        {required ? " *" : ""}
      </label>
      {showManual ? (
        <input
          className="field-input mt-1"
          disabled={disabled}
          placeholder={placeholder}
          value={manualValue ?? ""}
          onChange={(e) => onManualChange?.(e.target.value)}
          list={options.length > 0 ? `${label}-list` : undefined}
        />
      ) : (
        <div className="relative mt-1">
          <select
            className="input w-full"
            disabled={disabled || loading}
            value={value}
            onChange={(e) => {
              const opt = options.find((o) => o.code === e.target.value);
              onSelect(e.target.value, opt?.name ?? "");
            }}
          >
            <option value="">{loading ? "Loading…" : placeholder}</option>
            {options.map((opt) => (
              <option key={opt.code} value={opt.code}>
                {opt.name}
              </option>
            ))}
          </select>
          {loading && (
            <Loader2 className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-stone-400" />
          )}
        </div>
      )}
      {options.length > 0 && showManual && (
        <datalist id={`${label}-list`}>
          {options.map((opt) => (
            <option key={opt.code} value={opt.name} />
          ))}
        </datalist>
      )}
      {manualFallback && (
        <p className="mt-1 text-xs text-amber-700">
          Directory not loaded in database — type the official name manually, or ask your admin to
          run <code className="text-[11px]">python -m app.scripts.import_india_admin</code>.
        </p>
      )}
      {error && <p className="mt-1 text-xs text-rose-600">{error}</p>}
    </div>
  );
}

export function ProjectLocationFields({
  value,
  onChange,
  errors,
  className,
}: ProjectLocationFieldsProps) {
  const [location, setLocation] = useState<ProjectLocation>(value);

  useEffect(() => {
    setLocation(value);
  }, [value]);

  const patch = (partial: Partial<ProjectLocation>) => {
    const next = { ...location, ...partial };
    setLocation(next);
    onChange(next);
  };

  const { data: fyData } = useQuery({
    queryKey: ["india-admin-financial-years"],
    queryFn: () => indiaAdmin.financialYears(),
  });

  const { data: statesData } = useQuery({
    queryKey: ["india-admin-states"],
    queryFn: () => indiaAdmin.states(),
  });

  const { data: districtsData } = useQuery({
    queryKey: ["india-admin-districts", location.state_code],
    queryFn: () => indiaAdmin.districts(location.state_code),
    enabled: Boolean(location.state_code),
  });

  const { data: citiesData, isLoading: citiesLoading } = useQuery({
    queryKey: ["india-admin-cities", location.state_code, location.district_code],
    queryFn: () => indiaAdmin.cities(location.state_code, location.district_code),
    enabled: Boolean(
      location.state_code && location.district_code && location.area_type === "urban",
    ),
  });

  const { data: blocksData, isLoading: blocksLoading } = useQuery({
    queryKey: ["india-admin-blocks", location.state_code, location.district_code],
    queryFn: () => indiaAdmin.blocks(location.state_code, location.district_code),
    enabled: Boolean(
      location.state_code && location.district_code && location.area_type === "rural",
    ),
  });

  const blockReady = Boolean(location.block_lgd || location.block_name.trim());
  const gpReady = Boolean(location.gram_panchayat_code || location.gram_panchayat_name.trim());

  const { data: gpData, isLoading: gpLoading } = useQuery({
    queryKey: ["india-admin-gp", location.block_lgd],
    queryFn: () => indiaAdmin.gramPanchayats({ blockLgd: Number(location.block_lgd) }),
    enabled: Boolean(location.block_lgd && location.area_type === "rural"),
  });

  const { data: villagesData, isLoading: villagesLoading } = useQuery({
    queryKey: ["india-admin-villages", location.gram_panchayat_code],
    queryFn: () =>
      indiaAdmin.villages({ gramPanchayatCode: location.gram_panchayat_code }),
    enabled: Boolean(location.gram_panchayat_code && location.area_type === "rural"),
  });

  const stateOptions = useMemo(
    () => (statesData?.items ?? []).map((s) => ({ code: s.code, name: s.name })),
    [statesData],
  );
  const districtOptions = useMemo(
    () => (districtsData?.items ?? []).map((d) => ({ code: d.code, name: d.name })),
    [districtsData],
  );
  const cityOptions = useMemo(
    () => (citiesData?.items ?? []).map((c) => ({ code: c.code || c.name, name: c.name })),
    [citiesData],
  );
  const blockOptions = useMemo(
    () =>
      (blocksData?.items ?? []).map((b) => ({
        code: b.code,
        name: b.name,
        lgd: b.lgd,
      })),
    [blocksData],
  );
  const gpOptions = useMemo(
    () => (gpData?.items ?? []).map((g) => ({ code: g.code || g.name, name: g.name })),
    [gpData],
  );
  const villageOptions = useMemo(
    () => (villagesData?.items ?? []).map((v) => ({ code: v.code || v.name, name: v.name })),
    [villagesData],
  );

  function setAreaType(areaType: ProjectAreaType) {
    if (areaType === location.area_type) return;
    patch({
      area_type: areaType,
      block_code: "",
      block_name: "",
      block_lgd: "",
      gram_panchayat_code: "",
      gram_panchayat_name: "",
      village_code: "",
      village_name: "",
      city_name: areaType === "urban" ? location.district_name : "",
      urban_local_body: "",
    });
  }

  return (
    <div className={cn("space-y-4 rounded-xl border border-stone-200 bg-stone-50/60 p-4", className)}>
      <div>
        <h3 className="text-sm font-medium text-stone-900">Project location</h3>
        <p className="mt-1 text-xs text-stone-500">
          Choose rural (block → GP → village) or urban (city / ULB) based on where planting happens.
          State and district are required; lower levels can be typed manually when the directory is
          incomplete.
        </p>
        {location.state_code ? (
          <ClimateZoneBadge
            className="mt-3"
            stateCode={location.state_code}
            districtCode={location.district_code || undefined}
          />
        ) : null}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label">Financial year *</label>
          <select
            className="input mt-1"
            value={location.financial_year}
            onChange={(e) => patch({ financial_year: e.target.value })}
          >
            <option value="">Select financial year…</option>
            {(fyData?.items ?? []).map((fy) => (
              <option key={fy} value={fy}>
                {fy}
                {fy === fyData?.current ? " (current)" : ""}
              </option>
            ))}
          </select>
          {errors?.financial_year && (
            <p className="mt-1 text-xs text-rose-600">{errors.financial_year}</p>
          )}
        </div>

        <div>
          <label className="label">Area type</label>
          <div className="mt-1 inline-flex rounded-full border border-stone-200 bg-white p-0.5 text-xs">
            {(["rural", "urban"] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setAreaType(mode)}
                className={cn(
                  "rounded-full px-3 py-1.5 font-medium capitalize transition",
                  location.area_type === mode
                    ? "bg-forest-700 text-white"
                    : "text-stone-600 hover:text-forest-800",
                )}
              >
                {mode}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="label">State / UT *</label>
          <select
            className="input mt-1"
            value={location.state_code}
            onChange={(e) => {
              const opt = stateOptions.find((s) => s.code === e.target.value);
              patch({
                ...EMPTY_PROJECT_LOCATION,
                area_type: location.area_type,
                financial_year: location.financial_year,
                state_code: e.target.value,
                state_name: opt?.name ?? "",
              });
            }}
          >
            <option value="">Select state…</option>
            {stateOptions.map((s) => (
              <option key={s.code} value={s.code}>
                {s.name}
              </option>
            ))}
          </select>
          {errors?.state_code && (
            <p className="mt-1 text-xs text-rose-600">{errors.state_code}</p>
          )}
        </div>

        <div>
          <label className="label">District *</label>
          <select
            className="input mt-1"
            disabled={!location.state_code}
            value={location.district_code}
            onChange={(e) => {
              const opt = districtOptions.find((d) => d.code === e.target.value);
              const districtName = opt?.name ?? "";
              patch({
                financial_year: location.financial_year,
                area_type: location.area_type,
                state_code: location.state_code,
                state_name: location.state_name,
                district_code: e.target.value,
                district_name: districtName,
                block_code: "",
                block_name: "",
                block_lgd: "",
                gram_panchayat_code: "",
                gram_panchayat_name: "",
                village_code: "",
                village_name: "",
                city_name: location.area_type === "urban" ? districtName : "",
                urban_local_body: "",
              });
            }}
          >
            <option value="">Select district…</option>
            {districtOptions.map((d) => (
              <option key={d.code} value={d.code}>
                {d.name}
              </option>
            ))}
          </select>
          {errors?.district_code && (
            <p className="mt-1 text-xs text-rose-600">{errors.district_code}</p>
          )}
        </div>

        {location.area_type === "urban" ? (
          <>
            <AdminSelect
              label="City / ULB"
              required
              value={location.city_name}
              options={cityOptions}
              loading={citiesLoading}
              disabled={!location.district_code}
              placeholder="Select city…"
              error={errors?.city_name}
              manualFallback={citiesData?.manual_fallback || cityOptions.length === 0}
              manualValue={location.city_name}
              onSelect={(_code, name) => patch({ city_name: name })}
              onManualChange={(name) => patch({ city_name: name })}
            />
            {location.district_code && !citiesLoading && cityOptions.length === 0 ? (
              <p className="text-xs text-stone-500 sm:col-span-2">
                No urban local bodies are listed for {location.district_name} in the directory yet.
                Type the city or ULB name manually.
              </p>
            ) : null}
            <div>
              <label className="label">Ward / zone / site area</label>
              <input
                className="field-input mt-1"
                placeholder="e.g. Ward 12, Nagar Van site"
                value={location.urban_local_body}
                onChange={(e) => patch({ urban_local_body: e.target.value })}
              />
              <p className="mt-1 text-xs text-stone-500">
                Optional. Use for municipal wards, parks, or other urban planting sites.
              </p>
            </div>
          </>
        ) : (
          <>
            <AdminSelect
              label="Block (CD block)"
              value={location.block_code}
              options={blockOptions}
              loading={blocksLoading}
              disabled={!location.district_code}
              placeholder="Select block…"
              error={errors?.block_code}
              manualFallback={blocksData?.manual_fallback || blockOptions.length === 0}
              manualValue={location.block_name}
              onSelect={(code, name) => {
                const opt = blockOptions.find((b) => b.code === code);
                patch({
                  block_code: code,
                  block_name: name,
                  block_lgd: opt?.lgd != null ? String(opt.lgd) : "",
                  gram_panchayat_code: "",
                  gram_panchayat_name: "",
                  village_code: "",
                  village_name: "",
                });
              }}
              onManualChange={(name) =>
                patch({
                  block_code: "",
                  block_name: name,
                  block_lgd: "",
                  gram_panchayat_code: "",
                  gram_panchayat_name: "",
                  village_code: "",
                  village_name: "",
                })
              }
            />

            <AdminSelect
              label="Gram Panchayat (GP)"
              value={location.gram_panchayat_code}
              options={gpOptions}
              loading={gpLoading}
              disabled={!blockReady}
              placeholder="Select gram panchayat…"
              error={errors?.gram_panchayat_code}
              manualFallback={gpData?.manual_fallback || gpOptions.length === 0 || !location.block_lgd}
              manualValue={location.gram_panchayat_name}
              onSelect={(code, name) =>
                patch({
                  gram_panchayat_code: code,
                  gram_panchayat_name: name,
                  village_code: "",
                  village_name: "",
                })
              }
              onManualChange={(name) =>
                patch({
                  gram_panchayat_code: "",
                  gram_panchayat_name: name,
                  village_code: "",
                  village_name: "",
                })
              }
            />

            <AdminSelect
              label="Village"
              value={location.village_code}
              options={villageOptions}
              loading={villagesLoading}
              disabled={!gpReady}
              placeholder="Select village…"
              error={errors?.village_code}
              manualFallback={
                villagesData?.manual_fallback || villageOptions.length === 0 || !location.gram_panchayat_code
              }
              manualValue={location.village_name}
              onSelect={(code, name) => patch({ village_code: code, village_name: name })}
              onManualChange={(name) => patch({ village_code: "", village_name: name })}
            />
          </>
        )}
      </div>
    </div>
  );
}
