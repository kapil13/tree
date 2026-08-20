"use server";

import { cookies } from "next/headers";
import { defaultLocale, locales, type AppLocale } from "@/i18n/request";

export async function setLocaleCookie(locale: AppLocale) {
  if (!locales.includes(locale)) return;
  const store = await cookies();
  store.set("NEXT_LOCALE", locale, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });
}

export async function getLocaleCookie(): Promise<AppLocale> {
  const raw = (await cookies()).get("NEXT_LOCALE")?.value;
  return locales.includes(raw as AppLocale) ? (raw as AppLocale) : defaultLocale;
}
