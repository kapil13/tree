/** BRSR Principle 6 wizard API helpers and types. */

import { api } from "@/lib/api";

export type BrsrAssuranceLevel = "none" | "limited" | "reasonable";

export type BrsrManualKpi = {
  value_summary: string;
  source?: string | null;
};

export type BrsrProfile = {
  reporting_year: number | null;
  listed_entity: boolean;
  cin: string | null;
  stock_exchange: string | null;
  assurance_level: BrsrAssuranceLevel;
  boundary_notes: string | null;
  manual_kpis: Record<string, BrsrManualKpi>;
  wizard_completed_steps: string[];
  disclosure_complete: boolean;
};

export type BrsrReadinessKpi = {
  kpi_id: string;
  name: string;
  data_available: boolean;
  value_summary: string | null;
  platform_source: string | null;
  notes: string | null;
  action: string;
};

export type BrsrWizardState = {
  profile: BrsrProfile;
  scope: string;
  project_id: string | null;
  reporting_year: number;
  readiness: {
    readiness_pct: number;
    kpi_available_count: number;
    kpi_total: number;
    disclosure_complete: boolean;
    kpis: BrsrReadinessKpi[];
    value_chain: {
      project_count: number;
      missing_supplier_count: number;
      missing_supplier_projects: Array<{
        project_code: string;
        project_name: string;
        scheme_code?: string | null;
      }>;
    };
    blockers: string[];
    export_ready: boolean;
  };
  preview: {
    organization: { name: string };
    core_kpi_mapping: unknown[];
    value_chain_annex: unknown[];
    essential_indicator_ids: string[];
  };
};

export type BrsrWizardStep = "disclosure" | "scope" | "kpis" | "value_chain" | "export";

export const BRSR_WIZARD_STEPS: { id: BrsrWizardStep; label: string; hint: string }[] = [
  {
    id: "disclosure",
    label: "Org disclosure",
    hint: "CIN, reporting year, and assurance scope for listed entities.",
  },
  {
    id: "scope",
    label: "Portfolio scope",
    hint: "Export the full org portfolio or a single plantation project.",
  },
  {
    id: "kpis",
    label: "KPI readiness",
    hint: "Review P6.E1–E8 essential indicators and fill gaps.",
  },
  {
    id: "value_chain",
    label: "Value chain",
    hint: "Supplier references for P6.E8 nature-related value-chain evidence.",
  },
  {
    id: "export",
    label: "Review & export",
    hint: "Download the BRSR assurance pack for board or auditor review.",
  },
];

export const brsrApi = {
  readiness(projectId?: string) {
    return api
      .get<BrsrWizardState>("/v1/reports/brsr/readiness", {
        params: projectId ? { project_id: projectId } : undefined,
      })
      .then((r) => r.data);
  },
  updateProfile(payload: Partial<BrsrProfile>) {
    return api.patch<BrsrProfile>("/v1/reports/brsr/profile", payload).then((r) => r.data);
  },
};
