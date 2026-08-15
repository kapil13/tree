import { IndiaStackStatusPanel } from "@/components/settings/india-stack-status-panel";
import { SettingsSection } from "@/components/settings/settings-section";

export default function IndiaStackSettingsPage() {
  return (
    <SettingsSection
      title="India Stack integrations"
      description="e-Sign/DSC, DigiLocker, Aadhaar e-KYC, and ISRO Bhuvan WMS — optional adapters with stub fallbacks for development."
    >
      <IndiaStackStatusPanel />
    </SettingsSection>
  );
}
