"use client";

import Link from "next/link";
import { FolderTree, AlertTriangle } from "lucide-react";

export function SchemeProjectRequiredBanner() {
  return (
    <div className="card mx-auto max-w-3xl border-amber-200 bg-amber-50/90">
      <div className="flex gap-3">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-800" />
        <div className="space-y-2 text-sm text-amber-950">
          <p className="font-semibold">Scheme planting requires a project</p>
          <p>
            CAMPA, Nagar Van, Sahakar Van, NHAI, and other central schemes are configured on a{" "}
            <strong>planting project</strong>. Create or open a project first, then use{" "}
            <strong>Add tree</strong> from that project so spacing, species, and audit rules apply.
          </p>
          <Link
            href="/projects/new"
            className="btn-primary mt-2 inline-flex text-sm"
          >
            <FolderTree className="h-4 w-4" />
            Create planting project
          </Link>
          <span className="mx-2 text-amber-800">or</span>
          <Link href="/projects" className="font-medium text-forest-800 underline">
            open an existing project
          </Link>
        </div>
      </div>
    </div>
  );
}
