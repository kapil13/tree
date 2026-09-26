import type { LucideIcon } from "lucide-react";
import { getProgramTheme } from "@/components/registration/program-theme";

export type SignupProgramOption = {
  code: string;
  name: string;
  description: string;
  is_default: boolean;
  /** UI grouping for post-verification intent step */
  audience: "individual" | "organization";
};

export const SIGNUP_PROGRAM_OPTIONS: SignupProgramOption[] = [
  {
    code: "byot",
    name: "Tag my own trees",
    description: "Individual citizen — map trees you plant or care for, with free AI health checks.",
    is_default: true,
    audience: "individual",
  },
  {
    code: "government_nhai",
    name: "Government & public sector",
    description: "Highways, forest department, municipal, and public planting programmes.",
    is_default: false,
    audience: "organization",
  },
  {
    code: "corporate_esg",
    name: "Industry & corporate ESG",
    description: "Corporate sustainability, ESG reporting, and audit-ready planting evidence.",
    is_default: false,
    audience: "organization",
  },
  {
    code: "ngo_community",
    name: "NGO & community",
    description: "Community groups, farmers, and watershed restoration programmes.",
    is_default: false,
    audience: "organization",
  },
];

export const INDIVIDUAL_SIGNUP_OPTIONS = SIGNUP_PROGRAM_OPTIONS.filter(
  (p) => p.audience === "individual",
);

export const ORGANIZATION_SIGNUP_OPTIONS = SIGNUP_PROGRAM_OPTIONS.filter(
  (p) => p.audience === "organization",
);

export function programThemeForSignup(code: string): { icon: LucideIcon; gradient: string; ring: string } {
  const theme = getProgramTheme(code);
  return { icon: theme.icon, gradient: theme.gradient, ring: theme.ring };
}

export const DEFAULT_SIGNUP_PROGRAMS = SIGNUP_PROGRAM_OPTIONS.filter((p) => p.is_default).map(
  (p) => p.code,
);
