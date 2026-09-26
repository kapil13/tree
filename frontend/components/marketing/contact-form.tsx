"use client";

import Link from "next/link";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { contact, errorMessage } from "@/lib/api";

const ORGANIZATION_TYPES = [
  { value: "corporate_esg", label: "Corporate ESG" },
  { value: "government", label: "Government / public sector" },
  { value: "mining", label: "Mining & industrial reclamation" },
  { value: "ngo", label: "NGO / community" },
  { value: "international", label: "International donor / verifier" },
  { value: "other", label: "Other" },
] as const;

const LAND_HECTARES_BANDS = [
  { value: "under_100", label: "Under 100 ha" },
  { value: "100_1000", label: "100 - 1,000 ha" },
  { value: "1000_10000", label: "1,000 - 10,000 ha" },
  { value: "over_10000", label: "10,000+ ha" },
] as const;

const SITE_COUNT_BANDS = [
  { value: "1", label: "1 site" },
  { value: "2_10", label: "2 - 10 sites" },
  { value: "11_50", label: "11 - 50 sites" },
  { value: "50_plus", label: "50+ sites" },
] as const;

type ContactFormState = {
  full_name: string;
  email: string;
  phone: string;
  organization: string;
  organization_type: string;
  state: string;
  land_hectares_band: string;
  site_count_band: string;
  message: string;
};

const INITIAL_FORM: ContactFormState = {
  full_name: "",
  email: "",
  phone: "",
  organization: "",
  organization_type: "",
  state: "",
  land_hectares_band: "",
  site_count_band: "",
  message: "",
};

export function ContactForm() {
  const t = useTranslations("marketing.contact");
  const [form, setForm] = useState<ContactFormState>(INITIAL_FORM);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  function updateField<K extends keyof ContactFormState>(key: K, value: ContactFormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);

    try {
      const result = await contact.submit({ ...form, website: "" });
      setSuccessMessage(result.message);
      setSubmitted(true);
      setForm(INITIAL_FORM);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  if (submitted) {
    return (
      <div
        className="rounded-2xl border border-forest-200 bg-gradient-to-br from-forest-50 to-white p-8 shadow-sm"
        role="status"
        aria-live="polite"
      >
        <div className="mx-auto max-w-lg text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-forest-100 text-2xl text-forest-700">
            ✓
          </div>
          <h2 className="mt-5 text-2xl font-semibold text-forest-900">{t("successTitle")}</h2>
          <p className="mt-3 text-sm leading-relaxed text-stone-700">
            {successMessage || t("successBody")}
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link href="/" className="btn-primary">{t("backHome")}</Link>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => {
                setSubmitted(false);
                setSuccessMessage(null);
              }}
            >
              {t("submitAnother")}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <form
      onSubmit={onSubmit}
      className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm sm:p-8"
    >
      <div className="border-b border-stone-100 pb-5">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-forest-700">
          {t("sectionProfile")}
        </h3>
        <div className="mt-4 grid gap-5 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="full_name">{t("fullName")} *</label>
            <input
              id="full_name"
              required
              className="input"
              autoComplete="name"
              value={form.full_name}
              onChange={(e) => updateField("full_name", e.target.value)}
            />
          </div>
          <div>
            <label className="label" htmlFor="email">{t("workEmail")} *</label>
            <input
              id="email"
              type="email"
              required
              className="input"
              autoComplete="email"
              value={form.email}
              onChange={(e) => updateField("email", e.target.value)}
            />
          </div>
          <div>
            <label className="label" htmlFor="phone">{t("phone")} *</label>
            <input
              id="phone"
              type="tel"
              required
              className="input"
              autoComplete="tel"
              placeholder="+91 98765 43210"
              value={form.phone}
              onChange={(e) => updateField("phone", e.target.value)}
            />
          </div>
          <div>
            <label className="label" htmlFor="organization">{t("organization")} *</label>
            <input
              id="organization"
              required
              className="input"
              autoComplete="organization"
              value={form.organization}
              onChange={(e) => updateField("organization", e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="border-b border-stone-100 py-5">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-forest-700">
          {t("sectionProgramme")}
        </h3>
        <div className="mt-4 grid gap-5 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="organization_type">{t("organizationType")} *</label>
            <select
              id="organization_type"
              required
              className="input"
              value={form.organization_type}
              onChange={(e) => updateField("organization_type", e.target.value)}
            >
              <option value="">{t("selectType")}</option>
              {ORGANIZATION_TYPES.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="state">{t("state")} *</label>
            <input
              id="state"
              required
              className="input"
              placeholder={t("statePlaceholder")}
              value={form.state}
              onChange={(e) => updateField("state", e.target.value)}
            />
          </div>
          <div>
            <label className="label" htmlFor="land_hectares_band">{t("landBand")} *</label>
            <select
              id="land_hectares_band"
              required
              className="input"
              value={form.land_hectares_band}
              onChange={(e) => updateField("land_hectares_band", e.target.value)}
            >
              <option value="">{t("selectHectares")}</option>
              {LAND_HECTARES_BANDS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="site_count_band">{t("siteBand")} *</label>
            <select
              id="site_count_band"
              required
              className="input"
              value={form.site_count_band}
              onChange={(e) => updateField("site_count_band", e.target.value)}
            >
              <option value="">{t("selectSites")}</option>
              {SITE_COUNT_BANDS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="pt-5">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-forest-700">
          {t("sectionMessage")}
        </h3>
        <div className="mt-4">
          <label className="label" htmlFor="message">{t("message")} *</label>
          <textarea
            id="message"
            required
            minLength={20}
            rows={5}
            className="input min-h-[140px] resize-y"
            placeholder={t("messagePlaceholder")}
            value={form.message}
            onChange={(e) => updateField("message", e.target.value)}
          />
        </div>
      </div>

      {error && (
        <div className="mt-5 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {error}
        </div>
      )}

      <div className="mt-8 flex flex-col gap-4 border-t border-stone-100 pt-6 sm:flex-row sm:items-center sm:justify-between">
        <p className="max-w-md text-xs leading-relaxed text-stone-500">
          {t("consentPrefix")}{" "}
          <Link href="/privacy" className="font-medium text-forest-700 underline-offset-2 hover:underline">
            {t("consentPrivacyLink")}
          </Link>
          {t("consentSuffix")}
        </p>
        <button type="submit" className="btn-primary min-w-[180px] px-6 py-2.5" disabled={busy}>
          {busy ? (
            <span className="inline-flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              {t("submitting")}
            </span>
          ) : (
            t("submit")
          )}
        </button>
      </div>
    </form>
  );
}
