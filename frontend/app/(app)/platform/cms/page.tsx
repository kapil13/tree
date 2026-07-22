"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, FileText, Globe2, Users } from "lucide-react";
import { CmsPagesListPanel } from "@/components/platform/cms-pages-list-panel";
import { CmsSiteSettingsPanel } from "@/components/platform/cms-site-settings-panel";
import { CmsUsersRolesPanel } from "@/components/platform/cms-users-roles-panel";

export default function PlatformCmsPage() {
  const [tab, setTab] = useState<"site" | "pages" | "access">("site");

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
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-stone-900 px-3 py-1 text-xs font-medium uppercase tracking-[0.18em] text-white dark:bg-stone-100 dark:text-stone-900">
              Platform admin
            </div>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight">Website CMS</h1>
            <p className="mt-2 max-w-2xl text-sm text-stone-600 dark:text-stone-300">
              Manage the public marketing site at aranyix.tech — header, footer, homepage sections, and
              custom pages.
            </p>
          </div>
          <a href="/" target="_blank" rel="noreferrer" className="btn-secondary">
            <Globe2 className="h-4 w-4" />
            View live site
          </a>
        </div>
      </div>

      <div className="flex gap-2 border-b border-stone-200 pb-1 dark:border-stone-800">
        <button
          type="button"
          className={tab === "site" ? "btn-primary" : "btn-ghost"}
          onClick={() => setTab("site")}
        >
          Site settings
        </button>
        <button
          type="button"
          className={tab === "pages" ? "btn-primary" : "btn-ghost"}
          onClick={() => setTab("pages")}
        >
          <FileText className="h-4 w-4" />
          Pages
        </button>
        <button
          type="button"
          className={tab === "access" ? "btn-primary" : "btn-ghost"}
          onClick={() => setTab("access")}
        >
          <Users className="h-4 w-4" />
          Users & roles
        </button>
      </div>

      {tab === "site" ? (
        <CmsSiteSettingsPanel />
      ) : tab === "pages" ? (
        <CmsPagesListPanel />
      ) : (
        <CmsUsersRolesPanel />
      )}
    </div>
  );
}
