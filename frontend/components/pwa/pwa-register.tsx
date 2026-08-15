"use client";

import { useEffect } from "react";

/** Register the PWA service worker for offline supervisor tree list. */
export function PwaRegister() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {
      /* non-fatal in dev */
    });
  }, []);
  return null;
}
