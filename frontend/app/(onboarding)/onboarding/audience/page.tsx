"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { AudiencePicker } from "@/components/onboarding/audience-picker";
import { audienceOnboarding, auth } from "@/lib/api";
import { resolvePlantingAudience, type PlantingAudience } from "@/lib/audience";
import { useAuth } from "@/lib/auth-store";
import { onboardingRedirectPath } from "@/lib/onboarding-routing";

export default function OnboardingAudiencePage() {
  const router = useRouter();
  const { user, setUser } = useAuth();
  const [busy, setBusy] = useState(false);

  const { data: presets = [], isLoading } = useQuery({
    queryKey: ["audience-presets"],
    queryFn: () => audienceOnboarding.presets(),
  });

  useEffect(() => {
    if (!user) return;
    if (!user.audience_onboarding_required && user.audience) {
      router.replace("/dashboard");
    }
  }, [router, user]);

  if (isLoading || !user) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-forest-600" />
      </div>
    );
  }

  if (!user.audience_onboarding_required && user.audience) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-forest-600" />
      </div>
    );
  }

  async function handleSelect(audience: PlantingAudience) {
    if (busy) return;
    setBusy(true);
    try {
      await audienceOnboarding.select(audience);
      const me = await auth.me();
      setUser(me);
      const next = onboardingRedirectPath(me);
      router.push(next ?? "/dashboard");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <AudiencePicker
        presets={presets}
        selected={resolvePlantingAudience(user.audience)}
        busy={busy}
        onSelect={(audience) => {
          void handleSelect(audience);
        }}
      />
      <p className="text-center text-xs text-stone-500">
        Not sure yet?{" "}
        <button
          type="button"
          className="font-medium text-forest-700 hover:underline"
          onClick={() => void handleSelect("general")}
        >
          Start with general plantation
        </button>{" "}
        or{" "}
        <Link href="/trees/new" className="font-medium text-forest-700 hover:underline">
          continue with BYOT
        </Link>
        .
      </p>
    </div>
  );
}
