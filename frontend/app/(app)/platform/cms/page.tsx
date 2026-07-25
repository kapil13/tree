"use client";

import Link from "next/link";
import { useState } from "react";
import { FileText, Globe2, Shield } from "lucide-react";
import { CmsPagesListPanel } from "@/components/platform/cms-pages-list-panel";
import { CmsSiteSettingsPanel } from "@/components/platform/cms-site-settings-panel";
import { CmsUsersRolesPanel } from "@/components/platform/cms-users-roles-panel";
import { PlatformShell } from "@/components/platform/platform-shell";

export default function PlatformCmsPage() {
  const [tab, setTab] = useState<"site" | "pages" | "access">("site");

  return (
    <PlatformShell>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <p className="max-w-2xl text-sm text-stone-600 dark:text-stone-300">
          Manage the public marketing site — header, footer, homepage sections, and custom pages.
        </p>
        <a href="/" target="_blank" rel="noreferrer" className="btn-secondary">
          <Globe2 className="h-4 w-4" />
          View live site
        </a>
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
          <Shield className="h-4 w-4" />
          CMS access
        </button>
      </div>

      {tab === "site" ? (
        <CmsSiteSettingsPanel />
      ) : tab === "pages" ? (
        <CmsPagesListPanel />
      ) : (
        <CmsUsersRolesPanel />
      )}
    </PlatformShell>
  );
}
