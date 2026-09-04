import type { PlantingProject } from "@/lib/api";

export type ProjectAreaType = "rural" | "urban";

export type ProjectLocation = {
  financial_year: string;
  area_type: ProjectAreaType;
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
  city_name: string;
  urban_local_body: string;
};

export const EMPTY_PROJECT_LOCATION: ProjectLocation = {
  financial_year: "",
  area_type: "rural",
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
  city_name: "",
  urban_local_body: "",
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
  if (next.area_type !== "urban") {
    next.area_type = "rural";
  }
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
  if (location.area_type === "urban") {
    if (location.city_name) {
      next.city_name = location.city_name;
      if ("ulb_name" in next) next.ulb_name = location.city_name;
    }
    if (location.urban_local_body) next.urban_local_body = location.urban_local_body;
  } else {
    if (location.gram_panchayat_name) next.gram_panchayat = location.gram_panchayat_name;
    if (location.village_name) next.village_name = location.village_name;
  }
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

  if (location.area_type === "urban") {
    if (!location.city_name.trim()) {
      errors.city_name = "Select or enter the city / ULB name";
    }
    return errors;
  }

  // Rural: district is enough to save; block/GP/village are recommended but not blocking
  // when the LGD directory is incomplete for the selected area.
  return errors;
}

export function locationFromProject(project: PlantingProject | null | undefined): ProjectLocation {
  if (!project) return { ...EMPTY_PROJECT_LOCATION };
  return projectLocationFromMetadata(project.metadata ?? {});
}

export function citiesForDistrict(
  cities: { name: string }[],
  districtName: string,
): { name: string }[] {
  const district = districtName.trim().toLowerCase();
  if (!district) return cities;
  const exact = cities.filter((city) => city.name.trim().toLowerCase() === district);
  if (exact.length > 0) return exact;
  const related = cities.filter((city) => city.name.toLowerCase().includes(`(${district})`));
  return related.length > 0 ? related : cities;
}
