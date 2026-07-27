"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { auth, errorMessage } from "@/lib/api";
import { programThemeForSignup } from "@/lib/program-catalog";
import { cn } from "@/lib/cn";

export type OrgProfileForm = {
  organization_name: string;
  organization_type: "government" | "corporate" | "ngo";
  designation: string;
  city: string;
  state: string;
  country: string;
  work_email: string;
  contact_phone: string;
  website: string;
  registered_address: string;
  registration_id: string;
  department: string;
  use_case_summary: string;
};

function defaultOrgType(programCode: string): OrgProfileForm["organization_type"] {
  if (programCode.includes("corporate") || programCode.includes("esg")) return "corporate";
  if (programCode.includes("ngo")) return "ngo";
  return "government";
}

export function OrgProfileWizard({
  programCode,
  programName,
  userEmail,
  userPhone,
  onSubmitted,
}: {
  programCode: string;
  programName: string;
  userEmail: string;
  userPhone?: string | null;
  onSubmitted: () => void | Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<OrgProfileForm>({
    organization_name: "",
    organization_type: defaultOrgType(programCode),
    designation: "",
    city: "",
    state: "",
    country: "IN",
    work_email: userEmail,
    contact_phone: userPhone ?? "",
    website: "",
    registered_address: "",
    registration_id: "",
    department: "",
    use_case_summary: "",
  });

  function setField<K extends keyof OrgProfileForm>(key: K, value: OrgProfileForm[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function submit() {
    if (!form.organization_name.trim() || !form.designation.trim()) {
      setError("Organization name and your designation are required.");
      return;
    }
    if (!form.city.trim() || !form.state.trim()) {
      setError("City and state are required.");
      return;
    }
    if (form.use_case_summary.trim().length < 10) {
      setError("Please describe your intended use in at least 10 characters.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await auth.submitOnboardingOrgProfile({
        ...form,
        work_email: form.work_email || undefined,
        contact_phone: form.contact_phone || undefined,
        website: form.website || undefined,
        registered_address: form.registered_address || undefined,
        registration_id: form.registration_id || undefined,
        department: form.department || undefined,
      });
      await onSubmitted();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  const theme = programThemeForSignup(programCode);
  const Icon = theme.icon;

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3">
        <div
          className={cn(
            "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-white",
            theme.gradient,
          )}
        >
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-xl font-semibold text-stone-950">Organization details</h1>
          <p className="mt-1 text-sm text-stone-600">
            Complete your <span className="font-medium">{programName}</span> application. An admin will
            review before granting professional access. You can use BYOT features while waiting.
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="md:col-span-2">
          <label className="label">Organization name</label>
          <input
            className="field-input"
            value={form.organization_name}
            onChange={(e) => setField("organization_name", e.target.value)}
          />
        </div>
        <div>
          <label className="label">Organization type</label>
          <select
            className="field-input"
            value={form.organization_type}
            onChange={(e) =>
              setField("organization_type", e.target.value as OrgProfileForm["organization_type"])
            }
          >
            <option value="government">Government / public agency</option>
            <option value="corporate">Corporate / industry</option>
            <option value="ngo">NGO / community</option>
          </select>
        </div>
        <div>
          <label className="label">Your designation</label>
          <input
            className="field-input"
            value={form.designation}
            onChange={(e) => setField("designation", e.target.value)}
            placeholder="e.g. Project Manager"
          />
        </div>
        {form.organization_type === "government" ? (
          <div className="md:col-span-2">
            <label className="label">Department / agency</label>
            <input
              className="field-input"
              value={form.department}
              onChange={(e) => setField("department", e.target.value)}
            />
          </div>
        ) : null}
        <div>
          <label className="label">City</label>
          <input className="field-input" value={form.city} onChange={(e) => setField("city", e.target.value)} />
        </div>
        <div>
          <label className="label">State</label>
          <input className="field-input" value={form.state} onChange={(e) => setField("state", e.target.value)} />
        </div>
        <div>
          <label className="label">Work email</label>
          <input
            className="field-input"
            type="email"
            value={form.work_email}
            onChange={(e) => setField("work_email", e.target.value)}
          />
        </div>
        <div>
          <label className="label">Contact phone</label>
          <input
            className="field-input"
            value={form.contact_phone}
            onChange={(e) => setField("contact_phone", e.target.value)}
          />
        </div>
        <div>
          <label className="label">Website (optional)</label>
          <input
            className="field-input"
            value={form.website}
            onChange={(e) => setField("website", e.target.value)}
          />
        </div>
        <div>
          <label className="label">Registration / GSTIN (optional)</label>
          <input
            className="field-input"
            value={form.registration_id}
            onChange={(e) => setField("registration_id", e.target.value)}
          />
        </div>
        <div className="md:col-span-2">
          <label className="label">Registered address (optional)</label>
          <input
            className="field-input"
            value={form.registered_address}
            onChange={(e) => setField("registered_address", e.target.value)}
          />
        </div>
        <div className="md:col-span-2">
          <label className="label">How will you use this program?</label>
          <textarea
            className="field-input min-h-[100px]"
            value={form.use_case_summary}
            onChange={(e) => setField("use_case_summary", e.target.value)}
            placeholder="Briefly describe your planting program, corridor, or ESG goals."
          />
        </div>
      </div>

      {error ? <p className="text-sm text-rose-700">{error}</p> : null}

      <button type="button" className="btn-primary w-full" disabled={busy} onClick={() => void submit()}>
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        Submit for admin review
      </button>
    </div>
  );
}
