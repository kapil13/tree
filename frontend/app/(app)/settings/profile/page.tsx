"use client";

import { UserProfileForm } from "@/components/settings/user-profile-form";
import { ChangePasswordForm } from "@/components/settings/change-password-form";
import { SettingsSection } from "@/components/settings/settings-section";

export default function SettingsProfilePage() {
  return (
    <div className="space-y-8">
      <SettingsSection
        title="Personal profile"
        description="Your name, contact details, and location. Age is calculated from your date of birth."
      >
        <UserProfileForm />
      </SettingsSection>

      <SettingsSection
        title="Password"
        description="Update your sign-in password. Your login email cannot be changed from this page."
      >
        <ChangePasswordForm />
      </SettingsSection>
    </div>
  );
}
