"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { CitizenStewardshipPanel } from "@/components/dashboard/citizen-stewardship-panel";

export default function StewardshipPage() {
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <Link href="/dashboard" className="mb-3 inline-flex items-center gap-1 text-sm text-stone-500 hover:text-stone-800">
          <ArrowLeft className="h-4 w-4" />
          Dashboard
        </Link>
        <h1 className="text-2xl font-semibold">Stewardship hub</h1>
        <p className="mt-1 text-sm text-stone-600">
          Adopt community trees, track survival check-ins, and earn stewardship badges.
        </p>
      </div>
      <CitizenStewardshipPanel />
    </div>
  );
}
