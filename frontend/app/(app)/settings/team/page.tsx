"use client";

import { useTranslations } from "next-intl";
import { OrgAdminGuard } from "@/components/org-admin-guard";
import { OrgTeamPanel } from "@/components/organizations/org-team-panel";
import { SettingsSection } from "@/components/settings/settings-section";

export default function SettingsTeamPage() {
  const t = useTranslations("settingsTeamPage");

  return (
    <OrgAdminGuard>
      <SettingsSection title={t("title")} description={t("description")}>
        <OrgTeamPanel />
      </SettingsSection>
    </OrgAdminGuard>
  );
}
