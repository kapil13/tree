import { PrivacySettingsPanel } from "@/components/settings/privacy-settings-panel";
import { SettingsSection } from "@/components/settings/settings-section";

export default function SettingsPrivacyPage() {
  return (
    <SettingsSection
      title="Privacy & data rights"
      description="DPDP self-service: export, consent, grievance, and account deletion."
    >
      <PrivacySettingsPanel />
    </SettingsSection>
  );
}
