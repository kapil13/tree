"use client";

import { useState } from "react";

const SECTIONS = [
  {
    title: "User support",
    items: [
      "Force password reset sends a one-time link; confirm the user’s email first.",
      "Revoke sessions immediately invalidates all active tokens for that user.",
      "Read-only impersonation (imp_ro) is audit-logged; never use for write actions.",
    ],
  },
  {
    title: "Organizations",
    items: [
      "Suspend blocks non-admin API writes for the org; communicate before bulk suspend.",
      "Feature flags in org metadata override defaults — check Governance for global gates.",
      "Transfer ownership requires step-up; the new owner must already be an org member.",
    ],
  },
  {
    title: "Governance",
    items: [
      "Maintenance mode blocks writes platform-wide except platform admins.",
      "Registration gate stops new signups without affecting existing sessions.",
      "Bulk program access review is irreversible without manual per-user fixes.",
    ],
  },
  {
    title: "Audit & compliance",
    items: [
      "Every sensitive action should appear in Audit within seconds.",
      "Use action-prefix filters to narrow exports for incident response.",
      "Step-up is required again after the step-up window expires.",
    ],
  },
];

export function AdminRunbookPanel() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
      >
        Runbook
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[90] flex items-end justify-center bg-black/40 p-4 sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-labelledby="runbook-title"
          onClick={() => setOpen(false)}
        >
          <div
            className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-xl border border-slate-200 bg-white p-5 shadow-xl dark:border-slate-700 dark:bg-slate-900"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="runbook-title" className="mb-1 text-lg font-semibold text-slate-900 dark:text-slate-100">
              Platform admin runbook
            </h2>
            <p className="mb-4 text-sm text-slate-500">
              Quick reference for common support and governance workflows.
            </p>

            <div className="space-y-4">
              {SECTIONS.map((section) => (
                <section key={section.title}>
                  <h3 className="mb-2 text-sm font-semibold text-slate-800 dark:text-slate-200">{section.title}</h3>
                  <ul className="list-disc space-y-1 pl-5 text-sm text-slate-600 dark:text-slate-300">
                    {section.items.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setOpen(false)}
              className="mt-5 w-full rounded-lg bg-slate-100 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
}
