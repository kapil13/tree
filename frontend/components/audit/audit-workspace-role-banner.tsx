"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { ClipboardList, Eye } from "lucide-react";
import type { AuditWorkspaceMode } from "@/lib/audit-workspace-mode";
import { fieldOpsHref } from "@/lib/field-ops-links";

export function AuditWorkspaceRoleBanner({
  mode,
  projectId,
}: {
  mode: AuditWorkspaceMode;
  projectId: string;
}) {
  const t = useTranslations("auditWorkspace.modes");

  if (mode === "full") return null;

  const Icon = mode === "field" ? ClipboardList : Eye;

  return (
    <div
      className="rounded-xl border border-stone-200 bg-stone-50/90 px-4 py-3 dark:border-stone-800 dark:bg-stone-900/50"
      role="status"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-forest-700 ring-1 ring-stone-200 dark:bg-stone-950 dark:text-forest-300">
            <Icon className="h-4 w-4" aria-hidden />
          </span>
          <div>
            <p className="text-sm font-semibold text-stone-900 dark:text-stone-100">{t(`${mode}.title`)}</p>
            <p className="mt-0.5 text-sm text-stone-600 dark:text-stone-400">{t(`${mode}.desc`)}</p>
          </div>
        </div>
        {mode === "field" ? (
          <Link
            href={fieldOpsHref({ section: "audit", projectId })}
            className="btn-primary inline-flex shrink-0 items-center gap-2 text-sm"
          >
            <ClipboardList className="h-4 w-4" aria-hidden />
            {t("field.openQueue")}
          </Link>
        ) : null}
      </div>
    </div>
  );
}
