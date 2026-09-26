import type { User } from "@/lib/api";
import { resolvePlantingAudience } from "@/lib/audience";
import { userHasProfessionalAccess } from "@/lib/nav-access";

export type ProgramNavBooster = {
  href: string;
  label: string;
  groupId: "plantation" | "reports" | "intelligence";
};

/** Extra sidebar destinations keyed off enrolled programs and planting audience. */
export function programNavBoosters(user: User | null | undefined): ProgramNavBooster[] {
  if (!user) return [];

  const audience = resolvePlantingAudience(user?.audience);
  const programs = new Set(user.enrolled_program_codes ?? []);
  const boosters: ProgramNavBooster[] = [];

  if (programs.has("byot") && !userHasProfessionalAccess(user)) {
    boosters.push({
      href: "/stewardship",
      label: "Stewardship",
      groupId: "plantation",
    });
  }

  if (programs.has("government_nhai") || audience === "government") {
    boosters.push({
      href: "/reports/plantation/project-wise",
      label: "Plantation reports",
      groupId: "reports",
    });
  }

  if (programs.has("corporate_esg") || audience === "corporate_esg" || audience === "mining") {
    boosters.push({
      href: "/reports?tab=brsr",
      label: "BRSR exports",
      groupId: "reports",
    });
  }

  if (programs.has("ngo_community") || audience === "ngo_community") {
    boosters.push({
      href: "/reports/plantation/district-wise",
      label: "Community rollups",
      groupId: "reports",
    });
  }

  if (audience === "mining") {
    boosters.push({
      href: "/satellite",
      label: "Satellite watch",
      groupId: "intelligence",
    });
  }

  if (audience === "government" || audience === "ngo_community") {
    boosters.push({
      href: "/portfolio-health?tab=compliance",
      label: "FRA safeguards",
      groupId: "plantation",
    });
  }

  if (audience === "corporate_esg" || audience === "government") {
    boosters.push({
      href: "/projects/new",
      label: "Township schemes",
      groupId: "plantation",
    });
  }

  if (audience === "ngo_community") {
    boosters.push({
      href: "/projects/new",
      label: "Agroforestry schemes",
      groupId: "plantation",
    });
  }

  const seen = new Set<string>();
  return boosters.filter((item) => {
    if (seen.has(item.href)) return false;
    seen.add(item.href);
    return true;
  });
}
