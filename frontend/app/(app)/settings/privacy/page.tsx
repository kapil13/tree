"use client";

import { useTranslations } from "next-intl";
import { PrivacySettingsPanel } from "@/components/settings/privacy-settings-panel";
import { SettingsSection } from "@/components/settings/settings-section";

export default function SettingsPrivacyPage() {
  const t = useTranslations("settingsPrivacyPage");

  return (
    <SettingsSection title={t("pageTitle")} description={t("pageDescription")}>
      <PrivacySettingsPanel />
    </SettingsSection>
  );
}
