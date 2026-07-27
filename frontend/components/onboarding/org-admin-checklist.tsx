"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CheckCircle2, ChevronDown, ChevronRight, Users, Webhook, X } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth-store";
import { isOrgAdmin } from "@/lib/nav-access";
import { organizations } from "@/lib/organizations-api";
import { cn } from "@/lib/cn";

const DISMISS_KEY = "aranyix_org_admin_onboarding_dismissed";

export function OrgAdminChecklist({ compact = false }: { compact?: boolean }) {
  const { user } = useAuth();
  const [dismissed, setDismissed] = useState(true);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    setDismissed(localStorage.getItem(DISMISS_KEY) === "1");
  }, []);

  const { data: membersData } = useQuery({
    queryKey: ["org-members"],
    queryFn: () => organizations.members(),
    enabled: Boolean(user && isOrgAdmin(user)),
  });

  if (!user || !isOrgAdmin(user) || dismissed) return null;

  const memberCount = membersData?.members.length ?? 1;
  const pendingInvites = membersData?.pending_invites.length ?? 0;
  const teamDone = memberCount > 1 || pendingInvites > 0;

  const steps = [
    {
      id: "team",
      done: teamDone,
      title: "Invite your field team",
      description: "Add supervisors, workers, and viewers to your program.",
      href: "/settings/team",
      icon: Users,
    },
    {
      id: "projects",
      done: false,
      title: "Review planting projects",
      description: "Confirm packages, work areas, and compliance settings.",
      href: "/projects",
      icon: CheckCircle2,
    },
    {
      id: "webhooks",
      done: false,
      title: "Configure webhooks (optional)",
      description: "Send audit events to your SIEM or compliance stack.",
      href: "/settings/webhooks",
      icon: Webhook,
    },
  ];

  const completed = steps.filter((s) => s.done).length;
  const allDone = completed === steps.length;

  function dismiss() {
    localStorage.setItem(DISMISS_KEY, "1");
    setDismissed(true);
  }

  if (allDone) return null;

  if (compact) {
    return (
      <div className="dash-panel !p-4">
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="flex w-full items-center gap-3 text-left"
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-forest-50 text-forest-700">
            <Users className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-stone-900">Org setup</p>
            <p className="text-xs text-stone-500">
              {completed} of {steps.length} complete · {user.organization_name || "Your organization"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="hidden gap-1 sm:flex">
              {steps.map((step) => (
                <span
                  key={step.id}
                  className={cn(
                    "h-2 w-2 rounded-full",
                    step.done ? "bg-forest-500" : "bg-stone-200",
                  )}
                  title={step.title}
                />
              ))}
            </div>
            <ChevronDown
              className={cn("h-4 w-4 text-stone-400 transition", expanded && "rotate-180")}
            />
          </div>
        </button>

        {expanded && (
          <ul className="mt-3 space-y-2 border-t border-stone-100 pt-3">
            {steps.map((step) => (
              <li key={step.id}>
                <Link
                  href={step.href}
                  className="flex items-center gap-3 rounded-xl px-2 py-2 transition hover:bg-stone-50"
                >
                  <step.icon
                    className={step.done ? "h-4 w-4 text-forest-600" : "h-4 w-4 text-stone-400"}
                  />
                  <span
                    className={cn(
                      "flex-1 text-sm",
                      step.done ? "text-stone-500 line-through" : "text-stone-800",
                    )}
                  >
                    {step.title}
                  </span>
                  <ChevronRight className="h-4 w-4 text-stone-300" />
                </Link>
              </li>
            ))}
          </ul>
        )}

        <button
          type="button"
          onClick={dismiss}
          className="mt-2 text-xs text-stone-400 hover:text-stone-600"
        >
          Dismiss setup guide
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-forest-200 bg-gradient-to-br from-forest-50 to-white p-5 shadow-sm dark:border-forest-900 dark:from-forest-950/40 dark:to-stone-950">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-forest-700">
            Org admin setup
          </p>
          <h2 className="mt-1 text-lg font-semibold text-stone-900 dark:text-stone-100">
            Get your team operational
          </h2>
          <p className="mt-1 text-sm text-stone-600 dark:text-stone-300">
            {completed} of {steps.length} steps started · {user.organization_name || "Your organization"}
          </p>
        </div>
        <button
          type="button"
          onClick={dismiss}
          className="rounded-lg p-1.5 text-stone-400 hover:bg-stone-100 hover:text-stone-600"
          aria-label="Dismiss checklist"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <ul className="mt-4 space-y-2">
        {steps.map((step) => (
          <li key={step.id}>
            <Link
              href={step.href}
              className="flex items-center gap-3 rounded-xl border border-stone-200/80 bg-white/80 px-4 py-3 transition hover:border-forest-300 dark:border-stone-800 dark:bg-stone-900/60"
            >
              <step.icon
                className={
                  step.done
                    ? "h-5 w-5 text-forest-600"
                    : "h-5 w-5 text-stone-400"
                }
              />
              <div className="min-w-0 flex-1">
                <p className="font-medium text-stone-900 dark:text-stone-100">{step.title}</p>
                <p className="text-xs text-stone-500">{step.description}</p>
              </div>
              <ChevronRight className="h-4 w-4 shrink-0 text-stone-400" />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
