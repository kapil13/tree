import type { PlantingProject } from "@/lib/api";

export type ProjectLocation = {
  financial_year: string;
  state_code: string;
  state_name: string;
  district_code: string;
  district_name: string;
  block_code: string;
  block_name: string;
  block_lgd: string;
  gram_panchayat_code: string;
  gram_panchayat_name: string;
  village_code: string;
  village_name: string;
};

export const EMPTY_PROJECT_LOCATION: ProjectLocation = {
  financial_year: "",
  state_code: "",
  state_name: "",
  district_code: "",
  district_name: "",
  block_code: "",
  block_name: "",
  block_lgd: "",
  gram_panchayat_code: "",
  gram_panchayat_name: "",
  village_code: "",
  village_name: "",
};

export function projectLocationFromMetadata(
  metadata: Record<string, unknown> | null | undefined,
): ProjectLocation {
  const raw = (metadata?.location as Partial<ProjectLocation> | undefined) ?? {};
  const next = {
    ...EMPTY_PROJECT_LOCATION,
    ...Object.fromEntries(
      Object.entries(raw).map(([key, value]) => [key, value == null ? "" : String(value)]),
    ),
  } as ProjectLocation;
  return next;
}

export function projectLocationToMetadata(location: ProjectLocation): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(location)) {
    const trimmed = value.trim();
    if (trimmed) out[key] = trimmed;
  }
  return out;
}

/** Merge location into scheme refs where keys overlap (govt audit fields). */
export function syncSchemeRefsFromLocation(
  schemeRefs: Record<string, string>,
  location: ProjectLocation,
): Record<string, string> {
  const next = { ...schemeRefs };
  if (location.state_name) next.state_name = location.state_name;
  if (location.district_name) next.district = location.district_name;
  if (location.gram_panchayat_name) next.gram_panchayat = location.gram_panchayat_name;
  if (location.village_name) next.village_name = location.village_name;
  if (location.financial_year) {
    if ("apo_financial_year" in next) next.apo_financial_year = location.financial_year;
    if ("financial_year" in next) next.financial_year = location.financial_year;
  }
  return next;
}

export function validateProjectLocation(location: ProjectLocation): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!location.financial_year.trim()) errors.financial_year = "Select a financial year";
  if (!location.state_code.trim()) errors.state_code = "Select a state";
  if (!location.district_code.trim()) errors.district_code = "Select a district";
  if (!location.block_name.trim()) errors.block_code = "Select or enter a block";
  if (!location.gram_panchayat_name.trim()) {
    errors.gram_panchayat_code = "Select or enter a gram panchayat";
  }
  if (!location.village_name.trim()) errors.village_code = "Select or enter a village";
  return errors;
}

export function locationFromProject(project: PlantingProject | null | undefined): ProjectLocation {
  if (!project) return { ...EMPTY_PROJECT_LOCATION };
  return projectLocationFromMetadata(project.metadata ?? {});
}
