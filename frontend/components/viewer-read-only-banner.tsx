"use client";

import { Eye } from "lucide-react";
import { useAuth } from "@/lib/auth-store";
import { isOrgViewer, viewerReadOnlyMessage } from "@/lib/nav-access";

export function ViewerReadOnlyBanner() {
  const { user } = useAuth();
  if (!isOrgViewer(user)) return null;

  return (
    <div
      className="flex items-start gap-2 border-b border-sky-200 bg-sky-50 px-4 py-2.5 text-sm text-sky-950 dark:border-sky-900 dark:bg-sky-950/40 dark:text-sky-100"
      role="status"
    >
      <Eye className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      <p>{viewerReadOnlyMessage()}</p>
    </div>
  );
}
