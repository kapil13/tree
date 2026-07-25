"use client";

import { OrgAdminGuard } from "@/components/org-admin-guard";
import { OrgTeamPanel } from "@/components/organizations/org-team-panel";
import { SettingsSection } from "@/components/settings/settings-section";

export default function SettingsTeamPage() {
  return (
    <OrgAdminGuard>
      <SettingsSection
        title="Team"
        description="Invite supervisors, field workers, and viewers to your organization. Members inherit your NHAI, ESG, or NGO program access."
      >
        <OrgTeamPanel />
      </SettingsSection>
    </OrgAdminGuard>
  );
}
