"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, RefreshCw } from "lucide-react";
import { CitizenStewardshipPanel } from "@/components/dashboard/citizen-stewardship-panel";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { citizen } from "@/lib/citizen-api";
import { useAuth } from "@/lib/auth-store";
import { userHasProfessionalAccess } from "@/lib/nav-access";

export default function StewardshipPage() {
  const { user } = useAuth();
  const isProfessional = userHasProfessionalAccess(user);

  const stewardshipQ = useQuery({
    queryKey: ["citizen-stewardship"],
    queryFn: () => citizen.stewardship(),
  });

  const stewardship = stewardshipQ.data;
  const dueTrees = [
    ...(stewardship?.owned ?? []),
    ...(stewardship?.adopted ?? []),
  ].filter((t) => t.next_checkin_due);
  const dueCount = stewardship?.due_count ?? dueTrees.length;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <Link
          href="/dashboard"
          className="mb-3 inline-flex items-center gap-1 text-sm text-stone-500 hover:text-stone-800"
        >
          <ArrowLeft className="h-4 w-4" />
          Dashboard
        </Link>
        <PageHeader
          className="mb-0"
          title="Stewardship hub"
          description="Adopt community trees, track survival check-ins, and earn stewardship badges."
        />
      </div>

      {isProfessional ? (
        <div className="rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-950 dark:border-sky-900/50 dark:bg-sky-950/30 dark:text-sky-100">
          This hub is built for citizen / BYOT stewards. For portfolio compliance and field survival
          queues, use{" "}
          <Link href="/field-ops" className="font-medium underline underline-offset-2">
            Field ops
          </Link>{" "}
          or{" "}
          <Link href="/portfolio-health" className="font-medium underline underline-offset-2">
            Portfolio health
          </Link>
          .
        </div>
      ) : null}

      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-stone-900 dark:text-stone-50">
            <RefreshCw className="h-5 w-5 text-amber-600" />
            Due check-ins
          </h2>
          {dueCount > 0 ? (
            <span className="rounded-md bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-900">
              {dueCount} due
            </span>
          ) : null}
        </div>

        {stewardshipQ.isLoading ? (
          <p className="text-sm text-stone-500">Loading check-ins…</p>
        ) : dueCount === 0 ? (
          <EmptyState
            icon={RefreshCw}
            title="You're caught up"
            description="No survival check-ins are due this week. Keep tagging trees and come back when reminders appear."
            action={{ label: "Tag a tree", href: "/trees/new" }}
          />
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {dueTrees.map((tree) => (
              <li
                key={tree.id}
                className="rounded-xl border border-amber-200 bg-amber-50/60 p-4 dark:border-amber-900/40 dark:bg-amber-950/20"
              >
                <p className="font-medium text-stone-900 dark:text-stone-50">
                  {tree.nickname || tree.species_text || "Tree"}
                </p>
                <p className="font-mono text-xs text-stone-500">{tree.public_code}</p>
                <p className="mt-1 text-xs text-amber-900/80 dark:text-amber-100/80">
                  Survival check-in due
                  {tree.days_since_planted != null ? ` · ${tree.days_since_planted} days old` : ""}
                </p>
                <Link
                  href={`/trees/${tree.id}?checkin=1`}
                  className="btn-primary mt-3 inline-flex items-center gap-1 text-xs"
                >
                  Check in
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <CitizenStewardshipPanel />
    </div>
  );
}
