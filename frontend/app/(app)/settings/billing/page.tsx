"use client";

import Link from "next/link";
import { CreditCard } from "lucide-react";
import { BuyAiScanPacks } from "@/components/payments/buy-ai-scan-packs";
import { PaymentOrderHistory } from "@/components/payments/payment-order-history";
import { AiScanUsagePanel } from "@/components/settings/ai-scan-usage-panel";
import { SettingsSection } from "@/components/settings/settings-section";
import { useQuery } from "@tanstack/react-query";
import { payments } from "@/lib/api";

export default function SettingsBillingPage() {
  const { data: catalog } = useQuery({
    queryKey: ["payments-catalog"],
    queryFn: () => payments.catalog(),
  });

  return (
    <div className="space-y-8">
      <SettingsSection
        title="AI scan allowance"
        description="Citizen BYOT accounts include complimentary scans. Professional programs (government, NHAI, ESG, NGO) are unlimited and billed via work orders — not in-app."
      >
        <AiScanUsagePanel />
      </SettingsSection>

      {catalog?.payments_enabled ? (
        <SettingsSection
          title="Buy scan packs"
          description="Top up your account with Razorpay. Credits apply immediately after payment."
        >
          <div className="card space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium text-stone-800 dark:text-stone-100">
              <CreditCard className="h-4 w-4" />
              Secure checkout
            </div>
            <BuyAiScanPacks />
          </div>
        </SettingsSection>
      ) : (
        <div className="rounded-lg border border-stone-200 bg-stone-50 px-4 py-3 text-sm text-stone-700 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-200">
          <p className="font-medium text-stone-900 dark:text-stone-100">Payments unavailable</p>
          <p className="mt-1">
            In-app checkout is not enabled on this server. You can still{" "}
            <Link href="/settings/programs" className="font-medium underline">
              request professional program access
            </Link>{" "}
            for unlimited scans, or ask your administrator to enable payments.
          </p>
        </div>
      )}

      <SettingsSection title="Payment history" description="Recent AI scan pack purchases on your account.">
        <PaymentOrderHistory />
      </SettingsSection>
    </div>
  );
}
