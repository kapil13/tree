"use client";

import { PlantationReportsNav } from "@/components/reports/plantation-reports-nav";

export default function PlantationReportsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-6 md:flex-row md:items-start">
      <div className="md:w-56 md:shrink-0">
        <PlantationReportsNav />
      </div>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
