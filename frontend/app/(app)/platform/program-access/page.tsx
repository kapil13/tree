"use client";

import { useTranslations } from "next-intl";
import { ProgramAccessQueuePanel } from "@/components/platform/program-access-queue-panel";
import { PlatformShell } from "@/components/platform/platform-shell";

export default function PlatformProgramAccessPage() {
  const t = useTranslations("platformAdmin.programAccess");

  return (
    <PlatformShell>
      <p className="text-sm text-stone-600 dark:text-stone-300">{t("description")}</p>
      <ProgramAccessQueuePanel />
    </PlatformShell>
  );
}
