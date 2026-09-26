"use client";

import { useTranslations } from "next-intl";
import type { AppLocale } from "@/i18n/request";
import { useLocaleSwitch } from "@/lib/use-locale-switch";
import { cn } from "@/lib/cn";

const OPTIONS: { value: AppLocale; labelKey: "english" | "hindi" }[] = [
  { value: "en", labelKey: "english" },
  { value: "hi", labelKey: "hindi" },
];

export function LanguageSwitcher({
  className,
  variant = "select",
}: {
  className?: string;
  /** select = settings form; compact = EN | HI pill for headers */
  variant?: "select" | "compact";
}) {
  const t = useTranslations("common");
  const { locale, pending, switchLocale } = useLocaleSwitch();

  if (variant === "compact") {
    return (
      <div
        className={cn(
          "inline-flex rounded-lg border border-stone-200 bg-white p-0.5 text-xs font-semibold shadow-sm dark:border-stone-700 dark:bg-stone-900",
          className,
        )}
        role="group"
        aria-label={t("language")}
      >
        {OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            disabled={pending}
            aria-pressed={locale === opt.value}
            onClick={() => void switchLocale(opt.value)}
            className={cn(
              "rounded-md px-2.5 py-1 transition",
              locale === opt.value
                ? "bg-forest-700 text-white"
                : "text-stone-600 hover:bg-stone-50 hover:text-stone-900 dark:text-stone-300 dark:hover:bg-stone-800",
            )}
          >
            {opt.value === "en" ? "EN" : "HI"}
          </button>
        ))}
      </div>
    );
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
        onChange={(e) => void switchLocale(e.target.value as AppLocale)}
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
