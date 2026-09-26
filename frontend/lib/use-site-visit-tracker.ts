"use client";

import { useEffect } from "react";
import { useLocale } from "next-intl";
import { usePathname } from "next/navigation";
import {
  getOrCreateVisitorId,
  hasRecordedPath,
  markPathRecorded,
  siteVisits,
} from "@/lib/site-visits-api";

/** Record one marketing page view per path per browser session. */
export function useSiteVisitTracker(enabled = true) {
  const pathname = usePathname();
  const locale = useLocale();

  useEffect(() => {
    if (!enabled || !pathname || hasRecordedPath(pathname)) return;

    const visitorId = getOrCreateVisitorId();
    if (!visitorId) return;

    markPathRecorded(pathname);
    void siteVisits
      .record({ visitor_id: visitorId, path: pathname, locale })
      .catch(() => {
        // Best-effort analytics; ignore network failures.
      });
  }, [enabled, locale, pathname]);
}
