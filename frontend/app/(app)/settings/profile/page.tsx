"use client";

import { useTranslations } from "next-intl";
import { UserProfileForm } from "@/components/settings/user-profile-form";
import { ChangePasswordForm } from "@/components/settings/change-password-form";
import { SettingsSection } from "@/components/settings/settings-section";

export default function SettingsProfilePage() {
  const t = useTranslations("settings");

  return (
    <div className="space-y-8">
      <SettingsSection title={t("profile")} description={t("profileHint")}>
        <UserProfileForm />
      </SettingsSection>

      <SettingsSection title={t("password")} description={t("passwordHint")}>
        <ChangePasswordForm />
      </SettingsSection>
    </div>
  );
}
