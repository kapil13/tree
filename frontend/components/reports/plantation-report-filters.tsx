"use client";

import { useQuery } from "@tanstack/react-query";
import { indiaAdmin, plantingProjects } from "@/lib/api";
import { FilterField, filterSelectClassName } from "@/components/reports/plantation-report-toolbar";

export function usePlantationReportOptions() {
  const { data: fyData } = useQuery({
    queryKey: ["india-admin-financial-years"],
    queryFn: () => indiaAdmin.financialYears(),
  });
  const { data: statesData } = useQuery({
    queryKey: ["india-admin-states"],
    queryFn: () => indiaAdmin.states(),
  });
  const { data: projects } = useQuery({
    queryKey: ["planting-projects-report-options"],
    queryFn: () => plantingProjects.list({ page_size: 100 }),
  });
  const { data: segments } = useQuery({
    queryKey: ["planting-segments"],
    queryFn: () => plantingProjects.segments(),
  });

  return {
    financialYears: fyData?.items ?? [],
    states: statesData?.items ?? [],
    projects: projects?.items ?? [],
    segments: (segments?.segments ?? []).map((s) => s.code),
    schemes: [...new Set((projects?.items ?? []).map((p) => p.scheme_code).filter(Boolean))] as string[],
  };
}

export function FinancialYearFilter({
  value,
  onChange,
  years,
}: {
  value: string;
  onChange: (v: string) => void;
  years: string[];
}) {
  return (
    <FilterField label="Financial year">
      <select className={filterSelectClassName()} value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">All years</option>
        {years.map((fy) => (
          <option key={fy} value={fy}>
            {fy}
          </option>
        ))}
      </select>
    </FilterField>
  );
}

export function StateFilter({
  value,
  onChange,
  states,
}: {
  value: string;
  onChange: (v: string) => void;
  states: { code: string; name: string }[];
}) {
  return (
    <FilterField label="State">
      <select className={filterSelectClassName()} value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">All states</option>
        {states.map((s) => (
          <option key={s.code} value={s.code}>
            {s.name}
          </option>
        ))}
      </select>
    </FilterField>
  );
}

export function ProjectFilter({
  value,
  onChange,
  projects,
}: {
  value: string;
  onChange: (v: string) => void;
  projects: { id: string; code: string; name: string }[];
}) {
  return (
    <FilterField label="Project">
      <select className={filterSelectClassName()} value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">All projects</option>
        {projects.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name} ({p.code})
          </option>
        ))}
      </select>
    </FilterField>
  );
}

export function SegmentFilter({
  value,
  onChange,
  segments,
}: {
  value: string;
  onChange: (v: string) => void;
  segments: string[];
}) {
  return (
    <FilterField label="Segment">
      <select className={filterSelectClassName()} value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">All segments</option>
        {segments.map((s) => (
          <option key={s} value={s}>
            {s.replace(/_/g, " ")}
          </option>
        ))}
      </select>
    </FilterField>
  );
}

export function SchemeFilter({
  value,
  onChange,
  schemes,
}: {
  value: string;
  onChange: (v: string) => void;
  schemes: string[];
}) {
  return (
    <FilterField label="Scheme">
      <select className={filterSelectClassName()} value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">All schemes</option>
        {schemes.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>
    </FilterField>
  );
}

export function DistrictFilter({
  value,
  onChange,
  stateCode,
}: {
  value: string;
  onChange: (v: string) => void;
  stateCode: string;
}) {
  const { data } = useQuery({
    queryKey: ["india-admin-districts", stateCode],
    queryFn: () => indiaAdmin.districts(stateCode),
    enabled: Boolean(stateCode),
  });
  return (
    <FilterField label="District">
      <select
        className={filterSelectClassName()}
        value={value}
        disabled={!stateCode}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">{stateCode ? "All districts" : "Select state first"}</option>
        {(data?.items ?? []).map((d) => (
          <option key={d.code} value={d.code}>
            {d.name}
          </option>
        ))}
      </select>
    </FilterField>
  );
}
