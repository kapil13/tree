import type { CentralScheme, PlantingProject, WorkArea } from "@/lib/api";
import {
  treeRegistrationDefaultsFromProject,
  validateTreeRegistrationDefaults,
} from "@/lib/tree-registration-defaults";

export type SetupStepId =
  | "scheme_refs"
  | "tree_defaults"
  | "planting_standard"
  | "work_areas"
  | "ready";

export type SetupStep = {
  id: SetupStepId;
  label: string;
  complete: boolean;
  required: boolean;
  href?: string;
  description?: string;
};

export type ProjectSetupStatus = {
  steps: SetupStep[];
  setupComplete: boolean;
  canRegisterTree: boolean;
  blockReason?: string;
};

type ReadinessInput = {
  project: PlantingProject;
  workAreas: WorkArea[];
  scheme?: CentralScheme | null;
};

function schemeRefFields(scheme?: CentralScheme | null) {
  const section = scheme?.metadata_sections?.[0] as
    | { fields?: { key: string; required?: boolean }[] }
    | undefined;
  return section?.fields ?? [];
}

export function missingSchemeRefKeys(
  project: PlantingProject,
  scheme?: CentralScheme | null,
): string[] {
  if (!project.scheme_code || !scheme) return [];
  const refs =
    (project.metadata?.scheme_refs as Record<string, unknown> | undefined) ?? {};
  const missing: string[] = [];
  for (const field of schemeRefFields(scheme)) {
    if (!field.required) continue;
    const value = refs[field.key];
    if (value == null || String(value).trim() === "") {
      missing.push(field.key);
    }
  }
  return missing;
}

export function evaluateProjectSetup({
  project,
  workAreas,
  scheme,
}: ReadinessInput): ProjectSetupStatus {
  const missingRefs = missingSchemeRefKeys(project, scheme);
  const hasSchemeRefs = project.scheme_code ? missingRefs.length === 0 : true;
  const treeDefaults = treeRegistrationDefaultsFromProject(project);
  const missingTreeDefaults =
    project.scheme_code || project.program_code === "government_nhai"
      ? validateTreeRegistrationDefaults(treeDefaults)
      : {};
  const hasTreeDefaults = Object.keys(missingTreeDefaults).length === 0;
  const hasStandard = Boolean(project.active_standard);
  const hasWorkAreas = workAreas.length > 0;
  const requiresWorkArea =
    project.compliance_mode === "strict" || project.compliance_mode === "guided";

  const steps: SetupStep[] = [];

  if (project.scheme_code) {
    steps.push({
      id: "scheme_refs",
      label: "Scheme references",
      complete: hasSchemeRefs,
      required: true,
      href: `/projects/${project.id}/settings`,
      description: hasSchemeRefs
        ? "Government IDs saved for audit exports"
        : `${missingRefs.length} required reference${missingRefs.length === 1 ? "" : "s"} missing`,
    });
  }

  if (project.scheme_code || project.program_code === "government_nhai") {
    steps.push({
      id: "tree_defaults",
      label: "Tree registration defaults",
      complete: hasTreeDefaults,
      required: true,
      href: `/projects/${project.id}/settings`,
      description: hasTreeDefaults
        ? "Permit, site zone, and agency defaults saved"
        : `Missing: ${Object.keys(missingTreeDefaults).join(", ")}`,
    });
  }

  steps.push({
    id: "planting_standard",
    label: "Planting standard",
    complete: hasStandard,
    required: true,
    description: hasStandard
      ? (project.active_standard?.name ?? "Standard attached")
      : "No compliance standard attached",
  });

  steps.push({
    id: "work_areas",
    label: "Work areas on map",
    complete: hasWorkAreas,
    required: requiresWorkArea,
    href: `/projects/${project.id}#work-areas`,
    description: hasWorkAreas
      ? `${workAreas.length} area${workAreas.length === 1 ? "" : "s"} drawn`
      : "Draw at least one polygon or corridor",
  });

  const setupComplete =
    hasStandard &&
    hasSchemeRefs &&
    hasTreeDefaults &&
    (!requiresWorkArea || hasWorkAreas);

  let canRegisterTree = setupComplete;
  let blockReason: string | undefined;

  if (!hasStandard) {
    canRegisterTree = false;
    blockReason = "Attach a planting standard before registering trees.";
  } else if (!hasSchemeRefs) {
    canRegisterTree = false;
    blockReason = "Complete scheme references in project setup.";
  } else if (!hasTreeDefaults) {
    canRegisterTree = false;
    blockReason = "Complete tree registration defaults (permit, site zone, agency) in project setup.";
  } else if (requiresWorkArea && !hasWorkAreas) {
    canRegisterTree = false;
    blockReason = "Draw a work area on the map before registering trees.";
  }

  return {
    steps,
    setupComplete,
    canRegisterTree,
    blockReason,
  };
}
