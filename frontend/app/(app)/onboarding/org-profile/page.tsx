"use client";

import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { AppAuthGuard } from "@/components/app-auth-guard";
import { OrgProfileWizard } from "@/components/onboarding/org-profile-wizard";
import { auth } from "@/lib/api";
import { useAuth } from "@/lib/auth-store";
import { SIGNUP_PROGRAM_OPTIONS } from "@/lib/program-catalog";

export default function OnboardingOrgProfilePage() {
  const router = useRouter();
  const { user, setUser } = useAuth();

  const { data: onboarding, isLoading } = useQuery({
    queryKey: ["onboarding-state"],
    queryFn: () => auth.onboardingState(),
  });

  if (isLoading || !user) {
    return (
      <AppAuthGuard>
        <div className="flex min-h-screen items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-forest-600" />
        </div>
      </AppAuthGuard>
    );
  }

  if (onboarding?.status === "pending_approval") {
    router.replace("/onboarding/pending");
    return null;
  }
  if (onboarding?.status === "active_professional") {
    router.replace("/dashboard");
    return null;
  }
  if (onboarding?.status !== "profile_required" || !onboarding.program_code) {
    router.replace("/trees/new");
    return null;
  }

  const programName =
    onboarding.program_name ??
    SIGNUP_PROGRAM_OPTIONS.find((p) => p.code === onboarding.program_code)?.name ??
    onboarding.program_code;

  return (
    <AppAuthGuard>
      <div className="min-h-screen bg-[#f4faf6] px-4 py-10">
        <div className="mx-auto max-w-2xl rounded-[2rem] border border-white/80 bg-white/95 p-6 shadow-lg sm:p-8">
          <OrgProfileWizard
            programCode={onboarding.program_code}
            programName={programName}
            userEmail={user.email}
            userPhone={undefined}
            onSubmitted={async () => {
              const me = await auth.me();
              setUser(me);
              router.push("/onboarding/pending");
            }}
          />
        </div>
      </div>
    </AppAuthGuard>
  );
}
