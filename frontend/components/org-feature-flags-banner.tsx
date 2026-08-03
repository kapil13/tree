"use client";

import { useQuery } from "@tanstack/react-query";
import { Ban } from "lucide-react";
import { organizations } from "@/lib/organizations-api";
import { useAuth } from "@/lib/auth-store";
import { isFullPlatformAdmin } from "@/lib/platform-access";

export function OrgFeatureFlagsBanner() {
  const { user } = useAuth();
  const fullAdmin = isFullPlatformAdmin(user);

  const { data } = useQuery({
    queryKey: ["org-feature-flags"],
    queryFn: () => organizations.myFeatureFlags(),
    enabled: Boolean(user) && !fullAdmin && Boolean(user?.organization_id),
    staleTime: 120_000,
  });

  const disabled = (data?.flags ?? []).filter((f) => !f.enabled);
  if (disabled.length === 0) return null;

  return (
    <div className="border-b border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-800 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-100">
      <div className="mx-auto flex max-w-6xl items-start gap-2">
        <Ban className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" />
        <div>
          <strong>Some capabilities are disabled for your organization.</strong>{" "}
          {disabled.map((f) => f.label).join(" · ")}. Contact your platform administrator if you
          need access restored.
        </div>
      </div>
    </div>
  );
}
