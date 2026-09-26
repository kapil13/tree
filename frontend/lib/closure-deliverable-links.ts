import { projectComplianceHref } from "@/lib/compliance-links";
import { projectSetupHref } from "@/lib/project-focused-ui";
import { satelliteHref } from "@/lib/satellite-links";

export type ClosureDeliverableKey =
  | "ibm_closure_plan_ref"
  | "mine_lease_number"
  | "work_areas_drawn"
  | "satellite_baseline"
  | "ec_green_belt_met"
  | "native_stocking_met"
  | "trees_registered"
  | "satellite_mrv_active"
  | "survival_survey_active"
  | "no_block_violations"
  | "fmcp_documented"
  | "credit_ledger_synced";

export function closureDeliverableHref(
  projectId: string,
  key: ClosureDeliverableKey,
): string {
  switch (key) {
    case "ibm_closure_plan_ref":
    case "mine_lease_number":
    case "fmcp_documented":
    case "survival_survey_active":
      return `/projects/${projectId}/settings`;
    case "work_areas_drawn":
    case "ec_green_belt_met":
      return projectSetupHref(projectId, 4);
    case "satellite_baseline":
    case "satellite_mrv_active":
      return satelliteHref({ projectId });
    case "native_stocking_met":
    case "trees_registered":
      return `/trees/new?project=${projectId}`;
    case "no_block_violations":
      return projectComplianceHref(projectId, "issues");
    case "credit_ledger_synced":
      return `/projects/${projectId}/credits`;
    default:
      return `/projects/${projectId}`;
  }
}

export function closureDeliverableLabel(key: ClosureDeliverableKey): string {
  switch (key) {
    case "ibm_closure_plan_ref":
      return "Add PMCP reference";
    case "mine_lease_number":
      return "Add mine lease";
    case "work_areas_drawn":
      return "Draw work areas";
    case "satellite_baseline":
      return "Run baseline scan";
    case "ec_green_belt_met":
      return "Map green belt";
    case "native_stocking_met":
      return "Register native trees";
    case "trees_registered":
      return "Register trees";
    case "satellite_mrv_active":
      return "Run NDVI scan";
    case "survival_survey_active":
      return "Save survey cadence";
    case "no_block_violations":
      return "Fix violations";
    case "fmcp_documented":
      return "Add FMCP reference";
    case "credit_ledger_synced":
      return "Sync credit ledger";
    default:
      return "Open project";
  }
}
