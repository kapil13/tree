"use client";

import { useState } from "react";
import { useLocale } from "next-intl";
import { auth, errorMessage } from "@/lib/api";
import { setLocaleCookie } from "@/lib/locale-actions";
import { useAuth } from "@/lib/auth-store";
import type { AppLocale } from "@/i18n/request";

export function useLocaleSwitch() {
  const locale = useLocale() as AppLocale;
  const { user, setUser } = useAuth();
  const [pending, setPending] = useState(false);

  async function switchLocale(next: AppLocale) {
    if (next === locale || pending) return;
    setPending(true);
    try {
      await setLocaleCookie(next);
      if (user) {
        try {
          const updated = await auth.updateProfile({ locale: next });
          setUser(updated);
        } catch (e) {
          console.warn("locale sync failed", errorMessage(e));
        }
      }
      // router.refresh() does not reliably re-hydrate next-intl messages for client trees
      window.location.reload();
    } catch (e) {
      console.error("locale switch failed", e);
      setPending(false);
    }
  }

  return { locale, pending, switchLocale };
}
