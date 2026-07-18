import {
  BriefcaseBusiness,
  Building2,
  Leaf,
  Users,
  type LucideIcon,
} from "lucide-react";

export type ProgramTheme = {
  icon: LucideIcon;
  gradient: string;
  ring: string;
  glow: string;
  chip: string;
  accent: string;
};

const THEMES: Record<string, ProgramTheme> = {
  byot: {
    icon: Leaf,
    gradient: "from-emerald-500 via-teal-500 to-cyan-500",
    ring: "ring-emerald-400/40",
    glow: "shadow-emerald-500/20",
    chip: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
    accent: "text-emerald-600",
  },
  government_nhai: {
    icon: Building2,
    gradient: "from-slate-600 via-blue-600 to-indigo-600",
    ring: "ring-blue-400/40",
    glow: "shadow-blue-500/20",
    chip: "bg-blue-500/10 text-blue-700 dark:text-blue-300",
    accent: "text-blue-600",
  },
  corporate_esg: {
    icon: BriefcaseBusiness,
    gradient: "from-violet-600 via-purple-600 to-fuchsia-600",
    ring: "ring-violet-400/40",
    glow: "shadow-violet-500/20",
    chip: "bg-violet-500/10 text-violet-700 dark:text-violet-300",
    accent: "text-violet-600",
  },
  ngo_community: {
    icon: Users,
    gradient: "from-amber-500 via-orange-500 to-rose-500",
    ring: "ring-amber-400/40",
    glow: "shadow-amber-500/20",
    chip: "bg-amber-500/10 text-amber-800 dark:text-amber-300",
    accent: "text-amber-600",
  },
};

export function getProgramTheme(code: string): ProgramTheme {
  return THEMES[code] ?? THEMES.byot;
}
