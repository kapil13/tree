import Link from "next/link";
import { CheckCircle2, ExternalLink } from "lucide-react";
import { SettingsSection } from "@/components/settings/settings-section";

const SPRINT_CHECKS = [
  {
    sprint: "Sprint 1–2 · Measurement time-series",
    items: [
      {
        label: "Tree measurement history",
        href: "/trees",
        hint: "Open any tree → Measurement history panel (source, method, DBH/height ± uncertainty)",
      },
      {
        label: "Add measurement via re-geotag",
        href: "/trees",
        hint: "Survival survey / re-geotag appends a new row (not overwrite)",
      },
    ],
  },
  {
    sprint: "Sprint 2–3 · Uncertainty (90% CI)",
    items: [
      {
        label: "Carbon calculator with CI range",
        href: "/settings/carbon",
        hint: "Calculate → CO₂e shown as lower–upper range; ±% uncertainty note",
      },
      {
        label: "API smoke test",
        href: "http://localhost:8000/docs#/carbon/estimate_carbon_estimate_post",
        external: true,
        hint: "Try measurement_method: tape vs visual_estimate — tape should be tighter",
      },
    ],
  },
  {
    sprint: "Sprint 3–4 · Mortality + dynamic buffer",
    items: [
      {
        label: "Ex-ante projected credits",
        href: "/settings/carbon",
        hint: "Results show Ex-ante lifetime, Buffer applied, Mortality %",
      },
      {
        label: "Project credit ledger",
        href: "/projects",
        hint: "Project → Credits tab → Recalculate; buffer hint shows NPRT when assessed",
      },
      {
        label: "NPRT risk assessment",
        href: "/projects",
        hint: "Project → Credits tab → NPRT assessment form (score 0–100 → 10–30% buffer)",
      },
    ],
  },
  {
    sprint: "Sprint 4–5 · DPDP privacy",
    items: [
      {
        label: "Privacy & data export",
        href: "/settings/privacy",
        hint: "Download JSON export, manage consent, file grievance, delete account",
      },
      {
        label: "Privacy policy (grievance officer)",
        href: "/privacy",
        hint: "Public page lists Data Protection Officer contact",
      },
    ],
  },
  {
    sprint: "Sprint 5–6 · Tamper-evident audit + signed evidence",
    items: [
      {
        label: "Evidence bundle download (signed zip)",
        href: "/projects",
        hint: "Project → Compliance tab → Download evidence bundle; check response headers for X-BYOT-Evidence-Signature",
      },
      {
        label: "Public signing key",
        href: "http://localhost:8000/api/v1/evidence/signing-key",
        external: true,
        hint: "Ed25519 public key for offline bundle verification",
      },
      {
        label: "Audit chain verification",
        href: "http://localhost:8000/docs#/audit/verify_audit_chain_endpoint_api_v1_audit_chain_verify_get",
        external: true,
        hint: "Admin: GET /audit/chain/verify — tampering any row breaks the chain",
      },
    ],
  },
  {
    sprint: "Sprint 7–8 · Registry ledger + verifier workflow",
    items: [
      {
        label: "Credit serials & retirement",
        href: "/projects",
        hint: "Project → Credits tab → issue ledger → retire serial → download certificate PDF",
      },
      {
        label: "Verifier sample attestation",
        href: "/projects",
        hint: "Project → Credits tab → Create sample → Approve/Reject items (verifier role)",
      },
      {
        label: "Double-claim prevention API",
        href: "http://localhost:8000/docs#/credits/register_claim_api_v1_credits_claims_post",
        external: true,
        hint: "POST /credits/claims — second exclusive claim in same scheme family returns 409",
      },
    ],
  },
  {
    sprint: "Sprint 8–9 · BRSR Core export (SEBI)",
    items: [
      {
        label: "BRSR Principle 6 assurance pack",
        href: "/reports",
        hint: "Reports → BRSR (SEBI) tab → Export zip (JSON + Excel with scope-tagged GHG lines)",
      },
      {
        label: "Auditor read-only access",
        href: "/settings",
        hint: "Org admin invites member with org_role=viewer — can export BRSR without write access",
      },
      {
        label: "BRSR API",
        href: "http://localhost:8000/docs#/reports/export_brsr_report_api_v1_reports_brsr_post",
        external: true,
        hint: "POST /reports/brsr — format json | xlsx | zip",
      },
    ],
  },
  {
    sprint: "Sprint 9–10 · ISO 14064-2 + Hindi web + WCAG",
    items: [
      {
        label: "ISO 14064-2 project report",
        href: "/reports",
        hint: "Reports → ISO 14064-2 tab → enter project UUID → Export zip",
      },
      {
        label: "Hindi language (auth + dashboard + trees)",
        href: "/settings",
        hint: "Settings → Language preference → Hindi; check /auth, /dashboard, /trees/new",
      },
      {
        label: "ISO 14064 API",
        href: "http://localhost:8000/docs#/reports/export_iso14064_report_api_v1_reports_iso14064_post",
        external: true,
        hint: "POST /reports/iso14064 — format json | xlsx | zip",
      },
      {
        label: "Locale profile sync",
        href: "http://localhost:8000/docs#/auth/update_me_api_v1_auth_me_patch",
        external: true,
        hint: "PATCH /auth/me { locale: \"hi\" } — syncs with mobile preference",
      },
    ],
  },
  {
    sprint: "Sprint 11–12 · TNFD + GHG Land Sector + Darwin Core",
    items: [
      {
        label: "TNFD LEAP nature disclosure",
        href: "/reports",
        hint: "Reports → TNFD (LEAP) tab → Export zip (bioacoustic + IUCN + NDVI)",
      },
      {
        label: "GHG Protocol Land Sector inventory",
        href: "/reports",
        hint: "Reports → GHG Land Sector tab → scope-tagged removal lines",
      },
      {
        label: "Darwin Core (GBIF DwC-A)",
        href: "/reports",
        hint: "Reports → Darwin Core tab → project UUID → Export DwC-A zip",
      },
      {
        label: "STAC catalog + OGC GeoJSON",
        href: "http://localhost:8000/docs#/ogc/stac_catalog_api_v1_ogc_stac_catalog_get",
        external: true,
        hint: "GET /ogc/stac/catalog and /ogc/projects/{id}/features",
      },
    ],
  },
  {
    sprint: "Sprint 12–13 · India Stack + Green Credit Rules",
    items: [
      {
        label: "Green Credit estimate (MoEFCC)",
        href: "/projects",
        hint: "Green Credit scheme project → Credits tab → vested/provisional GC, trees/ha, 5-yr vesting",
      },
      {
        label: "India Stack integration status",
        href: "/settings/india-stack",
        hint: "Settings → India Stack — eSign, DigiLocker, Aadhaar e-KYC, Bhuvan WMS layers",
      },
      {
        label: "Verifier eSign attestation",
        href: "/projects",
        hint: "Project → Credits → Create sample → Approve — item shows eSign ref (stub in dev)",
      },
      {
        label: "Green Credit API",
        href: "http://localhost:8000/docs#/credits/get_project_green_credit_estimate_api_v1_credits_projects__project_id__green_credit_get",
        external: true,
        hint: "GET /credits/projects/{id}/green-credit",
      },
      {
        label: "India Stack API",
        href: "http://localhost:8000/docs#/india-stack/india_stack_status_api_v1_india_stack_status_get",
        external: true,
        hint: "GET /india-stack/status, /india-stack/bhuvan/layers",
      },
    ],
  },
];

export default function SprintVerifyPage() {
  return (
    <div className="space-y-8">
      <SettingsSection
        title="Sprint verification checklist"
        description="Navigate here to verify MRV sprints 1–2 through 12–13 before starting the next sprint."
      >
        <p className="text-sm text-stone-600">
          Demo login: <code className="rounded bg-stone-100 px-1">demo@byot.earth</code> /{" "}
          <code className="rounded bg-stone-100 px-1">byotdemo1234!</code> after{" "}
          <code className="rounded bg-stone-100 px-1">make seed</code>.
        </p>
      </SettingsSection>

      {SPRINT_CHECKS.map((block) => (
        <SettingsSection key={block.sprint} title={block.sprint}>
          <ul className="card divide-y divide-stone-200 p-0 dark:divide-stone-800">
            {block.items.map((item) => (
              <li key={item.label}>
                <Link
                  href={item.href}
                  target={item.external ? "_blank" : undefined}
                  rel={item.external ? "noreferrer" : undefined}
                  className="flex items-start gap-3 px-5 py-4 transition hover:bg-stone-50 dark:hover:bg-stone-800/50"
                >
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-forest-600" />
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-1.5 font-medium text-stone-900 dark:text-stone-50">
                      {item.label}
                      {item.external ? <ExternalLink className="h-3.5 w-3.5 text-stone-400" /> : null}
                    </p>
                    <p className="mt-1 text-sm text-stone-500">{item.hint}</p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </SettingsSection>
      ))}
    </div>
  );
}
