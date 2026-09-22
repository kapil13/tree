"use client";

import Link from "next/link";
import { useState } from "react";
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
        className="rounded-2xl border border-forest-200 bg-forest-50/80 p-8 shadow-sm"
        role="status"
        aria-live="polite"
      >
        <h2 className="text-2xl font-semibold text-forest-900">Thank you - we received your inquiry</h2>
        <p className="mt-3 text-sm leading-relaxed text-stone-700">
          {successMessage || "Thank you for contacting us. We will respond shortly."}
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/" className="btn-primary">Back to home</Link>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => {
              setSubmitted(false);
              setSuccessMessage(null);
            }}
          >
            Submit another inquiry
          </button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm sm:p-8">
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="full_name">Full name *</label>
          <input
            id="full_name"
            required
            className="input"
            value={form.full_name}
            onChange={(e) => updateField("full_name", e.target.value)}
          />
        </div>
        <div>
          <label className="label" htmlFor="email">Work email *</label>
          <input
            id="email"
            type="email"
            required
            className="input"
            value={form.email}
            onChange={(e) => updateField("email", e.target.value)}
          />
        </div>
      </div>

      <div className="mt-5 grid gap-5 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="phone">Phone / WhatsApp *</label>
          <input
            id="phone"
            type="tel"
            required
            className="input"
            placeholder="+91 98765 43210"
            value={form.phone}
            onChange={(e) => updateField("phone", e.target.value)}
          />
        </div>
        <div>
          <label className="label" htmlFor="organization">Organization *</label>
          <input
            id="organization"
            required
            className="input"
            value={form.organization}
            onChange={(e) => updateField("organization", e.target.value)}
          />
        </div>
      </div>

      <div className="mt-5 grid gap-5 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="organization_type">Organization type *</label>
          <select
            id="organization_type"
            required
            className="input"
            value={form.organization_type}
            onChange={(e) => updateField("organization_type", e.target.value)}
          >
            <option value="">Select type</option>
            {ORGANIZATION_TYPES.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="state">State / region *</label>
          <input
            id="state"
            required
            className="input"
            placeholder="e.g. Maharashtra"
            value={form.state}
            onChange={(e) => updateField("state", e.target.value)}
          />
        </div>
      </div>

      <div className="mt-5 grid gap-5 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="land_hectares_band">Land under management *</label>
          <select
            id="land_hectares_band"
            required
            className="input"
            value={form.land_hectares_band}
            onChange={(e) => updateField("land_hectares_band", e.target.value)}
          >
            <option value="">Select hectares band</option>
            {LAND_HECTARES_BANDS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="site_count_band">Number of sites *</label>
          <select
            id="site_count_band"
            required
            className="input"
            value={form.site_count_band}
            onChange={(e) => updateField("site_count_band", e.target.value)}
          >
            <option value="">Select site count</option>
            {SITE_COUNT_BANDS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="mt-5">
        <label className="label" htmlFor="message">How can we help? *</label>
        <textarea
          id="message"
          required
          minLength={20}
          rows={5}
          className="input min-h-[120px] resize-y"
          placeholder="Describe your plantation programme, monitoring needs, timeline, and any compliance or audit requirements."
          value={form.message}
          onChange={(e) => updateField("message", e.target.value)}
        />
      </div>

      {error && (
        <div className="mt-5 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {error}
        </div>
      )}

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-stone-500">
          By submitting, you agree we may contact you about your plantation inquiry.
        </p>
        <button type="submit" className="btn-primary" disabled={busy}>
          {busy ? "Sending..." : "Submit inquiry"}
        </button>
      </div>
    </form>
  );
}
