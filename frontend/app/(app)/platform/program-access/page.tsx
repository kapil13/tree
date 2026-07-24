"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { ProgramAccessQueuePanel } from "@/components/platform/program-access-queue-panel";

export default function PlatformProgramAccessPage() {
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <Link
          href="/dashboard"
          className="mb-2 inline-flex items-center gap-1 text-sm text-stone-500 hover:text-stone-800"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Dashboard
        </Link>
        <div className="inline-flex items-center gap-2 rounded-full bg-stone-900 px-3 py-1 text-xs font-medium uppercase tracking-[0.18em] text-white dark:bg-stone-100 dark:text-stone-900">
          Platform admin
        </div>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight">Program access requests</h1>
        <p className="mt-2 max-w-2xl text-sm text-stone-600 dark:text-stone-300">
          Review citizen requests for Government & NHAI, Corporate ESG, and NGO programs. Approving
          enrolls the user immediately.
        </p>
      </div>

      <ProgramAccessQueuePanel />
    </div>
  );
}
