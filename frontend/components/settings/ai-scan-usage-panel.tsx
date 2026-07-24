"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Sparkles } from "lucide-react";
import { BuyAiScanPacks } from "@/components/payments/buy-ai-scan-packs";
import { aiScans } from "@/lib/api";

export function AiScanUsagePanel({ compact = false }: { compact?: boolean }) {
  const { data, isLoading } = useQuery({
    queryKey: ["ai-scan-usage"],
    queryFn: () => aiScans.usage(),
  });

  if (isLoading || !data) {
    return compact ? null : <p className="text-sm text-stone-500">Loading AI scan allowance…</p>;
  }

  if (compact && (data.tier === "professional_unlimited" || data.tier === "platform_admin")) {
    return null;
  }

  if (data.tier === "platform_admin" || data.tier === "professional_unlimited") {
    return (
      <div className="rounded-lg border border-forest-200 bg-forest-50/60 px-4 py-3 text-sm text-forest-900 dark:border-forest-900 dark:bg-forest-950/30 dark:text-forest-100">
        <div className="flex items-center gap-2 font-medium">
          <Sparkles className="h-4 w-4" />
          Unlimited AI tree scans
        </div>
        <p className="mt-1 text-forest-800/80 dark:text-forest-200/80">
          {data.tier === "professional_unlimited"
            ? "Included with your approved professional program — no per-scan fees in the app."
            : "Platform admin access."}
        </p>
      </div>
    );
  }

  const atLimit = !data.can_scan;

  return (
    <div
      className={
        atLimit
          ? "rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-100"
          : "rounded-lg border border-stone-200 bg-stone-50 px-4 py-3 text-sm text-stone-800 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100"
      }
    >
      <div className="flex items-center gap-2 font-medium">
        <Sparkles className="h-4 w-4" />
        BYOT AI scans: {data.complimentary_used} / {data.complimentary_limit} complimentary used
      </div>
      <p className="mt-1 text-stone-600 dark:text-stone-300">
        {atLimit ? (
          <>
            You have used all complimentary scans on your citizen (BYOT) account. Government, NHAI,
            ESG, and NGO programs include unlimited scans via work orders — no in-app payment.{" "}
            <Link href="/settings/programs" className="font-medium underline">
              Request program access
            </Link>
            {data.purchased_balance > 0
              ? ` · ${data.purchased_balance} purchased scan(s) available`
              : null}
          </>
        ) : (
          <>
            {data.remaining_complimentary} complimentary scan
            {data.remaining_complimentary === 1 ? "" : "s"} remaining on your BYOT account.
            {data.purchased_balance > 0
              ? ` ${data.purchased_balance} purchased scan(s) also available.`
              : " Professional programs are unlimited and billed outside the app."}
          </>
        )}
      </p>
      {data.tier === "byot_metered" && data.payment_enabled ? (
        <BuyAiScanPacks compact={compact} />
      ) : null}
    </div>
  );
}
