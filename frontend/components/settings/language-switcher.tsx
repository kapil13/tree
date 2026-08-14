"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { auth, errorMessage } from "@/lib/api";
import { setLocaleCookie } from "@/lib/locale-actions";
import { useAuth } from "@/lib/auth-store";
import type { AppLocale } from "@/i18n/request";

const OPTIONS: { value: AppLocale; labelKey: "english" | "hindi" }[] = [
  { value: "en", labelKey: "english" },
  { value: "hi", labelKey: "hindi" },
];

export function LanguageSwitcher({ className }: { className?: string }) {
  const t = useTranslations("common");
  const locale = useLocale();
  const router = useRouter();
  const { user, setUser } = useAuth();
  const [pending, startTransition] = useTransition();

  async function onChange(next: AppLocale) {
    if (next === locale) return;
    await setLocaleCookie(next);
    if (user) {
      try {
        const updated = await auth.updateProfile({ locale: next });
        setUser(updated);
      } catch (e) {
        console.warn("locale sync failed", errorMessage(e));
      }
    }
    startTransition(() => {
      router.refresh();
    });
  }

  return (
    <div className={className}>
      <label htmlFor="locale-select" className="label">
        {t("language")}
      </label>
      <select
        id="locale-select"
        className="input"
        value={locale}
        disabled={pending}
        onChange={(e) => void onChange(e.target.value as AppLocale)}
        aria-label={t("language")}
      >
        {OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {t(opt.labelKey)}
          </option>
        ))}
      </select>
    </div>
  );
}
