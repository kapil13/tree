import { SettingsNav } from "@/components/settings/settings-nav";
import { PageHeader } from "@/components/ui";

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-6">
      <PageHeader
        purpose="Account · Configuration"
        title="Settings"
        description="Account, planting programs, carbon tools, billing, and integrations."
        breadcrumbs={[{ label: "Account" }, { label: "Settings" }]}
      />

      <div className="flex flex-col gap-8 lg:flex-row lg:items-start">
        <SettingsNav />
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </div>
  );
}
