"use client";

import type { LucideIcon } from "lucide-react";

export function PortfolioKpiCard({
  icon: Icon,
  label,
  value,
  warn = false,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  warn?: boolean;
}) {
  return (
    <div className={`card flex items-center gap-3 ${warn ? "border-amber-200 bg-amber-50" : ""}`}>
      <div className={`rounded-lg p-2 ${warn ? "bg-amber-100" : "bg-stone-100"}`}>
        <Icon className={`h-5 w-5 ${warn ? "text-amber-800" : "text-stone-600"}`} />
      </div>
      <div>
        <p className="text-xs uppercase tracking-wide text-stone-500">{label}</p>
        <p className="text-2xl font-semibold capitalize text-stone-900">{value}</p>
      </div>
    </div>
  );
}
