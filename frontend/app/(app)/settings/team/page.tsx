"use client";

import { OrgTeamPanel } from "@/components/organizations/org-team-panel";
import { SettingsSection } from "@/components/settings/settings-section";

export default function SettingsTeamPage() {
  return (
    <SettingsSection
      title="Team"
      description="Invite supervisors, field workers, and viewers to your organization. Members inherit your NHAI, ESG, or NGO program access."
    >
      <OrgTeamPanel />
    </SettingsSection>
  );
}
