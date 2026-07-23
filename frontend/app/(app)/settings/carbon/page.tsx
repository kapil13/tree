import { SettingsSection } from "@/components/settings/settings-section";
import { CarbonCalculatorForm } from "@/components/settings/carbon-calculator-form";

export default function SettingsCarbonPage() {
  return (
    <SettingsSection
      title="Carbon calculator"
      description="Estimate biomass, stored carbon, CO₂e, and credit potential for a single tree."
    >
      <CarbonCalculatorForm />
    </SettingsSection>
  );
}
