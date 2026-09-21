"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { SettingsSection } from "@/components/settings/settings-section";
import { CarbonCalculatorForm } from "@/components/settings/carbon-calculator-form";

export default function SettingsCarbonPage() {
  const t = useTranslations("settingsCarbonPage");

  return (
    <div className="space-y-4">
      <nav aria-label="Breadcrumb" className="text-xs text-stone-500">
        <Link href="/settings" className="hover:text-forest-700">
          {t("breadcrumbSettings")}
        </Link>
        <span className="mx-1.5 opacity-60">/</span>
        <span className="text-stone-700 dark:text-stone-300">{t("breadcrumbCarbon")}</span>
      </nav>
      <p className="rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-sm text-stone-600 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-300">
        {t.rich("disclaimer", {
          strong: (chunks) => (
            <strong className="font-medium text-stone-800 dark:text-stone-100">{chunks}</strong>
          ),
        })}
      </p>
      <SettingsSection title={t("title")} description={t("description")}>
        <CarbonCalculatorForm />
      </SettingsSection>
    </div>
  );
}
