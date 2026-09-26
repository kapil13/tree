"use client";

import Link from "next/link";
import { ArrowRight, FileText, Leaf, ShieldCheck } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { plantingProjects } from "@/lib/api";
import { scopedKey } from "@/lib/query-keys";
import { useAuth } from "@/lib/auth-store";

export function CorporateEsgDashboardPanel() {
  const { user } = useAuth();
  const { data, isLoading } = useQuery({
    queryKey: scopedKey(user, "corporate-esg-projects"),
    queryFn: () => plantingProjects.list(),
    staleTime: 60_000,
  });

  const projectCount = data?.items.length ?? 0;

  return (
    <div className="grid gap-3 sm:grid-cols-3">
      <Link
        href="/reports?tab=brsr"
        className="rounded-xl border border-violet-200 bg-violet-50/60 p-4 hover:bg-violet-50"
      >
        <FileText className="h-4 w-4 text-violet-700" />
        <p className="mt-2 text-sm font-semibold text-stone-900">BRSR Principle 6</p>
        <p className="text-xs text-stone-600">Board-ready ESG plantation evidence</p>
      </Link>
      <Link
        href="/reports?tab=portfolio"
        className="rounded-xl border border-stone-200 bg-white p-4 hover:bg-stone-50"
      >
        <ShieldCheck className="h-4 w-4 text-forest-700" />
        <p className="mt-2 text-sm font-semibold text-stone-900">Portfolio compliance</p>
        <p className="text-xs text-stone-600">Safeguards, survival, and exports</p>
      </Link>
      <Link
        href="/projects/new"
        className="rounded-xl border border-stone-200 bg-white p-4 hover:bg-stone-50"
      >
        <Leaf className="h-4 w-4 text-forest-700" />
        <p className="mt-2 text-sm font-semibold text-stone-900">
          {isLoading ? "Loading projects…" : `${projectCount} CSR projects`}
        </p>
        <p className="inline-flex items-center gap-1 text-xs font-medium text-forest-700">
          New CSR project <ArrowRight className="h-3 w-3" />
        </p>
      </Link>
    </div>
  );
}
