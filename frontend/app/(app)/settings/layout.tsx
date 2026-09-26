"use client";

import { useTranslations } from "next-intl";
import { SettingsNav } from "@/components/settings/settings-nav";
import { PageHeader } from "@/components/ui";

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const t = useTranslations("settingsLayout");
  const tc = useTranslations("chrome");

  return (
    <div className="space-y-6">
      <PageHeader
        purpose={t("purpose")}
        title={t("title")}
        description={t("description")}
        breadcrumbs={[{ label: tc("sectionAccount") }, { label: t("title") }]}
      />

      <div className="flex flex-col gap-8 lg:flex-row lg:items-start">
        <SettingsNav />
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </div>
  );
}
