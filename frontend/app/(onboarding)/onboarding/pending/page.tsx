"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Clock, Loader2, Trees } from "lucide-react";
import { useTranslations } from "next-intl";
import { auth } from "@/lib/api";
import { SIGNUP_PROGRAM_OPTIONS } from "@/lib/program-catalog";

export default function OnboardingPendingPage() {
  const t = useTranslations("onboardingAudience");
  const router = useRouter();

  const { data: onboarding, isLoading } = useQuery({
    queryKey: ["onboarding-state"],
    queryFn: () => auth.onboardingState(),
  });

  if (isLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-forest-600" />
      </div>
    );
  }

  if (onboarding?.status === "profile_required") {
    router.replace("/onboarding/org-profile");
    return null;
  }
  if (onboarding?.status === "active_professional") {
    router.replace("/dashboard");
    return null;
  }
  if (onboarding?.status === "rejected") {
    return (
      <div className="rounded-2xl border border-rose-200 bg-white p-8 text-center shadow-sm">
        <h1 className="text-xl font-semibold text-stone-900">{t("rejectedTitle")}</h1>
        <p className="mt-2 text-sm text-stone-600">
          {onboarding.admin_note || t("rejectedDefaultNote")}
        </p>
        <Link href="/onboarding/org-profile" className="btn-primary mt-6 inline-flex">
          {t("updateAndResubmit")}
        </Link>
      </div>
    );
  }

  const programName =
    onboarding?.program_name ??
    SIGNUP_PROGRAM_OPTIONS.find((p) => p.code === onboarding?.program_code)?.name ??
    t("professionalProgramFallback");

  return (
    <div className="rounded-[2rem] border border-white/80 bg-white/95 p-8 text-center shadow-lg">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-100 text-amber-800">
        <Clock className="h-7 w-7" />
      </div>
      <h1 className="mt-4 text-xl font-semibold text-stone-950">{t("pendingTitle")}</h1>
      <p className="mt-2 text-sm leading-relaxed text-stone-600">
        {t("pendingDescription", { program: programName })}
      </p>
      <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
        <Link href="/trees/new" className="btn-primary inline-flex items-center justify-center gap-2">
          <Trees className="h-4 w-4" />
          {t("registerTree")}
        </Link>
        <Link href="/dashboard" className="btn-secondary inline-flex justify-center">
          {t("goToDashboard")}
        </Link>
      </div>
    </div>
  );
}
