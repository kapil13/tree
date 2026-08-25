"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useLocale } from "next-intl";
import { auth, errorMessage } from "@/lib/api";
import { setLocaleCookie } from "@/lib/locale-actions";
import { useAuth } from "@/lib/auth-store";
import type { AppLocale } from "@/i18n/request";

export function useLocaleSwitch() {
  const locale = useLocale() as AppLocale;
  const router = useRouter();
  const { user, setUser } = useAuth();
  const [pending, startTransition] = useTransition();

  async function switchLocale(next: AppLocale) {
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

  return { locale, pending, switchLocale };
}
