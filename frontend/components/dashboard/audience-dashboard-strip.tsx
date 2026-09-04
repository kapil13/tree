"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useAuth } from "@/lib/auth-store";
import {
  PLANTING_AUDIENCE_LABEL,
  audienceQuickLinks,
  resolvePlantingAudience,
} from "@/lib/audience";

export function AudienceDashboardStrip() {
  const { user } = useAuth();
  const audience = resolvePlantingAudience(user?.audience);
  if (!user?.audience || audience === "general") {
    return null;
  }

  const links = audienceQuickLinks(audience);

  return (
    <section className="rounded-2xl border border-forest-200/80 bg-gradient-to-r from-forest-50 to-white px-4 py-3 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-forest-700">
            Your planting focus
          </p>
          <p className="text-sm font-medium text-stone-900">{PLANTING_AUDIENCE_LABEL[audience]}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="inline-flex items-center gap-1 rounded-full border border-forest-200 bg-white px-3 py-1.5 text-xs font-medium text-forest-800 hover:bg-forest-50"
            >
              {link.label}
              <ArrowRight className="h-3 w-3" />
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
