"use client";

import { Building2, Clock3, Leaf, MapPin } from "lucide-react";
import { useTranslations } from "next-intl";
import { ContactForm } from "@/components/marketing/contact-form";

export function ContactPageContent() {
  const t = useTranslations("marketing.contact");

  return (
    <>
      <section className="marketing-hero relative overflow-hidden border-b border-forest-900/30">
        <div className="marketing-hero-noise" aria-hidden />
        <div className="relative mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-14 lg:py-16">
          <div className="max-w-3xl">
            <span className="marketing-pill marketing-pill--hero">{t("eyebrow")}</span>
            <h1 className="marketing-hero-headline mt-4 sm:mt-5">{t("title")}</h1>
            <p className="mt-3 max-w-2xl text-base leading-relaxed text-emerald-100/80 sm:mt-4 sm:text-lg">
              {t("subtitle")}
            </p>
          </div>
        </div>
      </section>

      <section className="marketing-contact-body">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-12 lg:py-14">
          <div className="grid gap-8 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:items-start lg:gap-10">
            <aside className="space-y-5 lg:sticky lg:top-24">
              <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm sm:p-6">
                <h2 className="text-lg font-semibold text-stone-900">{t("infoTitle")}</h2>
                <p className="mt-2 text-sm leading-relaxed text-stone-600">{t("infoBody")}</p>

                <dl className="mt-5 space-y-4">
                  <div className="flex gap-3">
                    <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-forest-50 text-forest-700">
                      <Clock3 className="h-4 w-4" aria-hidden />
                    </span>
                    <div>
                      <dt className="text-xs font-semibold uppercase tracking-wide text-stone-500">
                        {t("responseLabel")}
                      </dt>
                      <dd className="mt-1 text-sm text-stone-700">{t("responseValue")}</dd>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-forest-50 text-forest-700">
                      <MapPin className="h-4 w-4" aria-hidden />
                    </span>
                    <div>
                      <dt className="text-xs font-semibold uppercase tracking-wide text-stone-500">
                        {t("coverageLabel")}
                      </dt>
                      <dd className="mt-1 text-sm text-stone-700">{t("coverageValue")}</dd>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-forest-50 text-forest-700">
                      <Building2 className="h-4 w-4" aria-hidden />
                    </span>
                    <div>
                      <dt className="text-xs font-semibold uppercase tracking-wide text-stone-500">
                        {t("companyLabel")}
                      </dt>
                      <dd className="mt-1 text-sm text-stone-700">{t("companyValue")}</dd>
                    </div>
                  </div>
                </dl>
              </div>

              <div className="rounded-2xl border border-forest-100 bg-forest-50/70 p-5 sm:p-6">
                <div className="flex items-start gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-forest-700 shadow-sm">
                    <Leaf className="h-4 w-4" aria-hidden />
                  </span>
                  <div>
                    <h3 className="text-sm font-semibold text-forest-900">{t("helpTitle")}</h3>
                    <ul className="mt-3 space-y-2 text-sm leading-relaxed text-stone-700">
                      {(["item1", "item2", "item3", "item4"] as const).map((key) => (
                        <li key={key} className="flex gap-2">
                          <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-forest-500" aria-hidden />
                          <span>{t(key)}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </aside>

            <div className="min-w-0">
              <div className="mb-5 sm:mb-6">
                <h2 className="text-xl font-semibold text-stone-900 sm:text-2xl">{t("formTitle")}</h2>
                <p className="mt-2 text-sm leading-relaxed text-stone-600 sm:text-base">{t("formSubtitle")}</p>
              </div>
              <ContactForm />
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
