"use client";

import { Building2, Clock3, Leaf, Mail, MapPin } from "lucide-react";
import { useTranslations } from "next-intl";
import { ContactForm } from "@/components/marketing/contact-form";

const CONTACT_EMAIL = "kapil@axentis.tech";

export function ContactPageContent() {
  const t = useTranslations("marketing.contact");

  return (
    <>
      <section className="marketing-hero relative overflow-hidden border-b border-forest-900/30">
        <div className="marketing-hero-noise" aria-hidden />
        <div className="relative mx-auto max-w-7xl px-6 py-14 sm:py-16 lg:py-20">
          <div className="max-w-3xl">
            <span className="marketing-pill marketing-pill--hero">{t("eyebrow")}</span>
            <h1 className="marketing-hero-headline mt-5">{t("title")}</h1>
            <p className="mt-4 max-w-2xl text-base leading-relaxed text-emerald-100/80 sm:text-lg">
              {t("subtitle")}
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-12 sm:py-16">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] lg:items-start">
          <aside className="space-y-6">
            <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-stone-900">{t("infoTitle")}</h2>
              <p className="mt-2 text-sm leading-relaxed text-stone-600">{t("infoBody")}</p>

              <dl className="mt-6 space-y-4">
                <div className="flex gap-3">
                  <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-forest-50 text-forest-700">
                    <Mail className="h-4 w-4" />
                  </span>
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-wide text-stone-500">
                      {t("emailLabel")}
                    </dt>
                    <dd className="mt-1">
                      <a
                        href={`mailto:${CONTACT_EMAIL}`}
                        className="text-sm font-medium text-forest-700 underline decoration-forest-200 underline-offset-2 hover:text-forest-800"
                      >
                        {CONTACT_EMAIL}
                      </a>
                    </dd>
                  </div>
                </div>

                <div className="flex gap-3">
                  <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-forest-50 text-forest-700">
                    <Clock3 className="h-4 w-4" />
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
                    <MapPin className="h-4 w-4" />
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
                    <Building2 className="h-4 w-4" />
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

            <div className="rounded-2xl border border-forest-100 bg-forest-50/70 p-6">
              <div className="flex items-start gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-forest-700 shadow-sm">
                  <Leaf className="h-4 w-4" />
                </span>
                <div>
                  <h3 className="text-sm font-semibold text-forest-900">{t("helpTitle")}</h3>
                  <ul className="mt-3 space-y-2 text-sm leading-relaxed text-stone-700">
                    {(["item1", "item2", "item3", "item4"] as const).map((key) => (
                      <li key={key} className="flex gap-2">
                        <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-forest-500" />
                        <span>{t(key)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </aside>

          <div>
            <div className="mb-5">
              <h2 className="text-xl font-semibold text-stone-900">{t("formTitle")}</h2>
              <p className="mt-2 text-sm leading-relaxed text-stone-600">{t("formSubtitle")}</p>
            </div>
            <ContactForm />
          </div>
        </div>
      </section>
    </>
  );
}
