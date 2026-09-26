import { isApiError } from "@/lib/api";
import { projectSetupHref } from "@/lib/project-focused-ui";

/** Fields set once on the project — never shown in project-mode tree wizard. */
const PROJECT_INHERITED_FIELDS = new Set([
  "legal_basis",
  "land_category",
  "permit_reference",
  "site_zone",
  "implementing_agency",
  "maintenance_responsible",
  "project_code",
  "pit_size_cm",
  "spacing_m",
  "guard_type",
  "species_native",
  "survival_status",
  "surveyor_name",
  "boq_item_ref",
  "remarks",
]);

const FIELD_LABELS: Record<string, string> = {
  legal_basis: "legal basis",
  land_category: "land category",
  permit_reference: "permit / PCA reference",
  site_zone: "site / block / zone",
  implementing_agency: "implementing agency",
  maintenance_responsible: "maintenance responsible party",
  project_code: "project code",
  species_text: "species",
  planted_at: "planting date",
  pit_size_cm: "pit size",
  spacing_m: "spacing",
  guard_type: "tree guard",
  road_side: "road side",
  chainage_km: "chainage (km)",
  latitude: "GPS latitude",
  longitude: "GPS longitude",
  survival_status: "survival status",
  species_native: "native species flag",
  surveyor_name: "surveyor name",
};

type FormatOptions = {
  projectId?: string | null;
  projectMode?: boolean;
};

function parseValidationCode(code: string): { kind: string; field?: string; detail?: string } {
  const colon = code.indexOf(":");
  if (colon === -1) return { kind: code };
  return {
    kind: code.slice(0, colon),
    field: code.slice(colon + 1),
  };
}

function labelForField(field: string): string {
  return FIELD_LABELS[field] ?? field.replace(/_/g, " ");
}

/** Turn backend validation codes into field-worker friendly messages. */
export function humanizeValidationErrors(
  errors: string[],
  options: FormatOptions = {},
): string {
  const { projectId, projectMode } = options;
  const inheritedMissing = errors.filter((code) => {
    const { field } = parseValidationCode(code);
    return field && PROJECT_INHERITED_FIELDS.has(field);
  });

  if (projectMode && inheritedMissing.length > 0 && projectId) {
    const setupHref = projectSetupHref(projectId, 3);
    return `Project setup is incomplete. Finish tree registration defaults in project setup (permit, site zone, agency), then try again. Open setup: ${setupHref}`;
  }

  const lines = errors.map((code) => {
    const { kind, field } = parseValidationCode(code);
    if (kind === "missing_required" && field) {
      if (projectMode && PROJECT_INHERITED_FIELDS.has(field)) {
        return `Missing ${labelForField(field)} — set this once in project setup, not per tree.`;
      }
      return `Missing ${labelForField(field)}.`;
    }
    if (kind === "invalid_option" && field) {
      return `Invalid ${labelForField(field)} — choose a value from the list.`;
    }
    if (kind === "min_photos" && field) {
      return `Add at least ${field} photo(s).`;
    }
    return code.replace(/_/g, " ");
  });

  return lines.join(" ");
}

export function extractValidationErrors(err: unknown): string[] {
  if (!isApiError(err)) return [];
  const data = err.response?.data as {
    error?: { details?: { validation_errors?: string[] } };
    detail?:
      | string
      | { validation_errors?: string[]; compliance_errors?: Array<{ message: string }> };
  };
  const fromError = data?.error?.details?.validation_errors;
  if (fromError?.length) return fromError;
  if (typeof data?.detail === "object" && !Array.isArray(data.detail)) {
    return data.detail.validation_errors ?? [];
  }
  return [];
}

/** Prefer friendly tree-registration messages; falls back to generic error text. */
export function formatTreeRegistrationError(
  err: unknown,
  options: FormatOptions,
  fallbackMessage: string,
): string {
  const validation = extractValidationErrors(err);
  if (validation.length) {
    return humanizeValidationErrors(validation, options);
  }
  return fallbackMessage;
}
