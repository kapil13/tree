"use client";

import { ProgramAccessQueuePanel } from "@/components/platform/program-access-queue-panel";
import { PlatformShell } from "@/components/platform/platform-shell";

export default function PlatformProgramAccessPage() {
  return (
    <PlatformShell>
      <p className="text-sm text-stone-600 dark:text-stone-300">
        Review citizen requests for Government & Public Sector, Corporate ESG, and NGO programs. Approving
        enrolls the user immediately.
      </p>
      <ProgramAccessQueuePanel />
    </PlatformShell>
  );
}
