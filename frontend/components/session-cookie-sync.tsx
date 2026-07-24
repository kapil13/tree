"use client";

import { useEffect } from "react";
import { syncSessionCookieFromToken } from "@/lib/session-cookie";

/** Keep edge middleware session cookie aligned with localStorage JWT on every page load. */
export function SessionCookieSync() {
  useEffect(() => {
    syncSessionCookieFromToken();
  }, []);

  return null;
}
