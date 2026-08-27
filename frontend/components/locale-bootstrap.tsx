"use client";

import { useEffect, useRef } from "react";
import { useLocale } from "next-intl";
import { useAuth, useAuthHydrated } from "@/lib/auth-store";
import { setLocaleCookie } from "@/lib/locale-actions";
import type { AppLocale } from "@/i18n/request";

function readCookieLocale(): AppLocale | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith("NEXT_LOCALE="));
  if (!match) return null;
  const value = decodeURIComponent(match.split("=")[1] ?? "");
  return value === "hi" || value === "en" ? value : null;
}

/** Sync saved profile locale when no explicit NEXT_LOCALE cookie exists yet. */
export function LocaleBootstrap() {
  const hydrated = useAuthHydrated();
  const { user } = useAuth();
  const locale = useLocale() as AppLocale;
  const syncing = useRef(false);

  useEffect(() => {
    if (!hydrated || !user || syncing.current) return;

    const cookieLocale = readCookieLocale();
    if (cookieLocale) return;

    const profileLocale = user.locale;
    if (profileLocale !== "en" && profileLocale !== "hi") return;
    if (profileLocale === locale) return;

    syncing.current = true;
    void setLocaleCookie(profileLocale as AppLocale).then(() => {
      window.location.reload();
    });
  }, [hydrated, user, locale]);

  return null;
}
