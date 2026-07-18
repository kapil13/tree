import type { LucideIcon } from "lucide-react";
import { getProgramTheme } from "@/components/registration/program-theme";

export type SignupProgramOption = {
  code: string;
  name: string;
  description: string;
  is_default: boolean;
};

export const SIGNUP_PROGRAM_OPTIONS: SignupProgramOption[] = [
  {
    code: "byot",
    name: "BYOT Public",
    description: "Quick citizen tagging for Bring Your Own Tree.",
    is_default: true,
  },
  {
    code: "government_nhai",
    name: "Government & NHAI",
    description: "Audit-ready planting for highways, forest dept, and municipal schemes.",
    is_default: false,
  },
  {
    code: "corporate_esg",
    name: "Industry & Corporate ESG",
    description: "ESG and sustainability planting with audit baselines.",
    is_default: false,
  },
  {
    code: "ngo_community",
    name: "NGO & Community",
    description: "Community, farmer, and watershed restoration planting.",
    is_default: false,
  },
];

export function programThemeForSignup(code: string): { icon: LucideIcon; gradient: string; ring: string } {
  const theme = getProgramTheme(code);
  return { icon: theme.icon, gradient: theme.gradient, ring: theme.ring };
}

export const DEFAULT_SIGNUP_PROGRAMS = SIGNUP_PROGRAM_OPTIONS.filter((p) => p.is_default).map(
  (p) => p.code,
);
