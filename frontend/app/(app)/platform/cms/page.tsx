"use client";

import Link from "next/link";
import { useState } from "react";
import { FileText, Gauge, Globe2, Scale, Shield } from "lucide-react";
import { CmsLegalPanel } from "@/components/platform/cms-legal-panel";
import { CmsPagesListPanel } from "@/components/platform/cms-pages-list-panel";
import { CmsRuleEnginePanel } from "@/components/platform/cms-rule-engine-panel";
import { CmsSiteSettingsPanel } from "@/components/platform/cms-site-settings-panel";
import { CmsUsersRolesPanel } from "@/components/platform/cms-users-roles-panel";
import { PlatformShell } from "@/components/platform/platform-shell";

export default function PlatformCmsPage() {
  const [tab, setTab] = useState<"site" | "pages" | "legal" | "access" | "rules">("site");

  return (
    <PlatformShell>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <p className="max-w-2xl text-sm text-stone-600 dark:text-stone-300">
          Manage the public marketing site — header, footer, legal policies, homepage sections, and
          custom pages.
        </p>
        <a href="/" target="_blank" rel="noreferrer" className="btn-secondary">
          <Globe2 className="h-4 w-4" />
          View live site
        </a>
      </div>

      <div className="flex flex-wrap gap-2 border-b border-stone-200 pb-1 dark:border-stone-800">
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
          className={tab === "legal" ? "btn-primary" : "btn-ghost"}
          onClick={() => setTab("legal")}
        >
          <Scale className="h-4 w-4" />
          Legal
        </button>
        <button
          type="button"
          className={tab === "rules" ? "btn-primary" : "btn-ghost"}
          onClick={() => setTab("rules")}
        >
          <Gauge className="h-4 w-4" />
          Rule engine
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
      ) : tab === "legal" ? (
        <CmsLegalPanel />
      ) : tab === "rules" ? (
        <CmsRuleEnginePanel />
      ) : (
        <CmsUsersRolesPanel />
      )}
    </PlatformShell>
  );
}
