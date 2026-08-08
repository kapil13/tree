import Link from "next/link";
import { SettingsSection } from "@/components/settings/settings-section";
import { CarbonCalculatorForm } from "@/components/settings/carbon-calculator-form";

export default function SettingsCarbonPage() {
  return (
    <div className="space-y-4">
      <nav aria-label="Breadcrumb" className="text-xs text-stone-500">
        <Link href="/settings" className="hover:text-forest-700">
          Settings
        </Link>
        <span className="mx-1.5 opacity-60">/</span>
        <span className="text-stone-700 dark:text-stone-300">Carbon calculator</span>
      </nav>
      <p className="rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-sm text-stone-600 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-300">
        This is a <strong className="font-medium text-stone-800 dark:text-stone-100">calculator tool</strong>{" "}
        for planning estimates — not a verified carbon credit ledger.
      </p>
      <SettingsSection
        title="Carbon calculator"
        description="Estimate biomass, stored carbon, CO₂e, and credit potential for a single tree."
      >
        <CarbonCalculatorForm />
      </SettingsSection>
    </div>
  );
}
