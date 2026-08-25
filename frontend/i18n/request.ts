import { getRequestConfig } from "next-intl/server";
import { cookies, headers } from "next/headers";

export const locales = ["en", "hi"] as const;
export type AppLocale = (typeof locales)[number];
export const defaultLocale: AppLocale = "en";

function localeFromAcceptLanguage(header: string | null): AppLocale | null {
  if (!header) return null;
  const parts = header.split(",").map((p) => p.trim().split(";")[0]?.toLowerCase());
  for (const part of parts) {
    if (part?.startsWith("hi")) return "hi";
    if (part?.startsWith("en")) return "en";
  }
  return null;
}

export default getRequestConfig(async () => {
  const cookieStore = await cookies();
  const raw = cookieStore.get("NEXT_LOCALE")?.value;
  let locale: AppLocale =
    locales.includes(raw as AppLocale) ? (raw as AppLocale) : defaultLocale;

  if (!raw) {
    const headerStore = await headers();
    const detected = localeFromAcceptLanguage(headerStore.get("accept-language"));
    if (detected) locale = detected;
  }

  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
  };
});
