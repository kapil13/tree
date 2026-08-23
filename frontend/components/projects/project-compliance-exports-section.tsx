"use client";

import { Download, FileText } from "lucide-react";
import type { FrameworkProfileCode } from "@/lib/api";
import { cn } from "@/lib/cn";

type ExportMutations = {
  busy: boolean;
  exportMrv: { mutate: (format: "pdf" | "xlsx") => void; isPending: boolean };
  exportBundle: { mutate: () => void; isPending: boolean };
  exportFramework: { mutate: (format: "pdf" | "xlsx") => void; isPending: boolean };
  exportGreenCreditPortal: { mutate: () => void; isPending: boolean };
  exportCampaState: { mutate: () => void; isPending: boolean };
  exportEsfPs5: { mutate: () => void; isPending: boolean };
  exportEsfPs6: { mutate: () => void; isPending: boolean };
  exportUndpSes: { mutate: () => void; isPending: boolean };
  exportMultilateralPack: { mutate: () => void; isPending: boolean };
  exportEudrDueDiligence: { mutate: (format: "xlsx" | "zip") => void; isPending: boolean };
  exportSbtiFlag: { mutate: () => void; isPending: boolean };
};

export function ProjectComplianceExportsSection({
  schemeCode,
  frameworkProfile,
  frameworks,
  selectedFramework,
  onFrameworkChange,
  exports: ex,
}: {
  schemeCode?: string | null;
  frameworkProfile: FrameworkProfileCode;
  frameworks: Array<{
    code: string;
    short_label: string;
    description?: string;
    reference?: string;
    disclaimer?: string;
  }>;
  selectedFramework?: {
    description?: string;
    reference?: string;
    disclaimer?: string;
  };
  onFrameworkChange: (code: FrameworkProfileCode) => void;
  exports: ExportMutations;
}) {
  const showIndiaPortal =
    schemeCode === "green_credit_india" ||
    schemeCode === "campa_ca" ||
    schemeCode === "nhai_highway";
  const showMultilateral =
    schemeCode === "dfi_green_corridor" ||
    schemeCode === "nhai_highway" ||
    schemeCode === "campa_ca";

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-stone-900">Audit exports</h2>
        <p className="mt-1 text-sm text-stone-600">
          Download MRV packs, framework-mapped reports, and scheme-specific handoffs for third-party
          review — not certification or issuance.
        </p>
      </div>

      <ExportGroup
        title="Core MRV"
        description="Project monitoring report and signed evidence bundle."
      >
        <div className="flex flex-wrap gap-2">
          <ExportButton
            disabled={ex.busy}
            pending={ex.exportMrv.isPending}
            pendingLabel="Exporting…"
            label="MRV PDF"
            onClick={() => ex.exportMrv.mutate("pdf")}
          />
          <ExportButton
            disabled={ex.busy}
            pending={ex.exportMrv.isPending}
            pendingLabel="Exporting…"
            label="MRV Excel"
            onClick={() => ex.exportMrv.mutate("xlsx")}
          />
          <ExportButton
            primary
            disabled={ex.busy}
            pending={ex.exportBundle.isPending}
            pendingLabel="Building…"
            label="Evidence bundle (.zip)"
            onClick={() => ex.exportBundle.mutate()}
          />
        </div>
      </ExportGroup>

      <ExportGroup
        title="Framework-mapped report"
        description="Profile-specific PDF or Excel aligned to VM0047, GS, REDD+, Paris/NDC, Green Credit, and more."
      >
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-[220px]">
            <label className="label text-xs">Framework profile</label>
            <select
              className="input text-sm"
              value={frameworkProfile}
              onChange={(e) => onFrameworkChange(e.target.value as FrameworkProfileCode)}
            >
              {frameworks.map((f) => (
                <option key={f.code} value={f.code}>
                  {f.short_label}
                </option>
              ))}
            </select>
          </div>
        </div>
        {selectedFramework ? (
          <div className="space-y-2 rounded-lg border border-stone-200 bg-white px-3 py-2.5 text-xs text-stone-600">
            <p>{selectedFramework.description}</p>
            <p>
              <span className="font-medium text-stone-800">Reference:</span>{" "}
              {selectedFramework.reference}
            </p>
            {selectedFramework.disclaimer ? (
              <p className="leading-relaxed text-stone-500">{selectedFramework.disclaimer}</p>
            ) : null}
          </div>
        ) : null}
        <div className="flex flex-wrap gap-2">
          <ExportButton
            primary
            disabled={ex.busy}
            pending={ex.exportFramework.isPending}
            pendingLabel="Exporting…"
            label="Framework PDF"
            onClick={() => ex.exportFramework.mutate("pdf")}
          />
          <ExportButton
            disabled={ex.busy}
            pending={ex.exportFramework.isPending}
            pendingLabel="Exporting…"
            label="Framework Excel"
            onClick={() => ex.exportFramework.mutate("xlsx")}
          />
        </div>
      </ExportGroup>

      {showIndiaPortal ? (
        <ExportGroup
          title="India portal handoffs"
          description="State CAMPA monitoring or MoEFCC Green Credit registrar spreadsheets."
          accent="emerald"
        >
          <div className="flex flex-wrap gap-2">
            {(schemeCode === "campa_ca" || schemeCode === "nhai_highway") && (
              <ExportButton
                disabled={ex.busy}
                pending={ex.exportCampaState.isPending}
                pendingLabel="Exporting…"
                label="State CAMPA pack (.xlsx)"
                onClick={() => ex.exportCampaState.mutate()}
              />
            )}
            {schemeCode === "green_credit_india" && (
              <ExportButton
                disabled={ex.busy}
                pending={ex.exportGreenCreditPortal.isPending}
                pendingLabel="Exporting…"
                label="Green Credit handoff (.xlsx)"
                onClick={() => ex.exportGreenCreditPortal.mutate()}
              />
            )}
          </div>
        </ExportGroup>
      ) : null}

      {showMultilateral ? (
        <ExportGroup
          title="Multilateral & DFI"
          description="World Bank ESF PS5/PS6, UNDP SES screening, and combined audit pack."
          accent="indigo"
        >
          <div className="flex flex-wrap gap-2">
            <ExportButton
              disabled={ex.busy}
              pending={ex.exportEsfPs5.isPending}
              pendingLabel="Exporting…"
              label="ESF PS5 tenure (.xlsx)"
              onClick={() => ex.exportEsfPs5.mutate()}
            />
            <ExportButton
              disabled={ex.busy}
              pending={ex.exportEsfPs6.isPending}
              pendingLabel="Exporting…"
              label="ESF PS6 biodiversity (.xlsx)"
              onClick={() => ex.exportEsfPs6.mutate()}
            />
            <ExportButton
              disabled={ex.busy}
              pending={ex.exportUndpSes.isPending}
              pendingLabel="Exporting…"
              label="UNDP SES screening (.xlsx)"
              onClick={() => ex.exportUndpSes.mutate()}
            />
            <ExportButton
              primary
              disabled={ex.busy}
              pending={ex.exportMultilateralPack.isPending}
              pendingLabel="Building…"
              label="Multilateral audit pack (.zip)"
              onClick={() => ex.exportMultilateralPack.mutate()}
            />
          </div>
        </ExportGroup>
      ) : null}

      <ExportGroup
        title="Science & buyer due diligence"
        description="SBTi FLAG worksheet and EUDR geo-coordinate pack with BRSR value-chain linkage."
        accent="teal"
      >
        <div className="flex flex-wrap gap-2">
          <ExportButton
            disabled={ex.busy}
            pending={ex.exportSbtiFlag.isPending}
            pendingLabel="Exporting…"
            label="SBTi FLAG worksheet (.xlsx)"
            onClick={() => ex.exportSbtiFlag.mutate()}
          />
          <ExportButton
            disabled={ex.busy}
            pending={ex.exportEudrDueDiligence.isPending}
            pendingLabel="Exporting…"
            label="EUDR geo due diligence (.xlsx)"
            onClick={() => ex.exportEudrDueDiligence.mutate("xlsx")}
          />
          <ExportButton
            disabled={ex.busy}
            pending={ex.exportEudrDueDiligence.isPending}
            pendingLabel="Building…"
            label="EUDR pack (.zip)"
            onClick={() => ex.exportEudrDueDiligence.mutate("zip")}
          />
        </div>
      </ExportGroup>
    </div>
  );
}

function ExportGroup({
  title,
  description,
  accent = "stone",
  children,
}: {
  title: string;
  description: string;
  accent?: "stone" | "emerald" | "indigo" | "teal";
  children: React.ReactNode;
}) {
  const accentClass =
    accent === "emerald"
      ? "border-emerald-200 bg-emerald-50/40"
      : accent === "indigo"
        ? "border-indigo-200 bg-indigo-50/40"
        : accent === "teal"
          ? "border-teal-200 bg-teal-50/40"
          : "border-stone-200 bg-white";

  return (
    <section className={cn("space-y-3 rounded-xl border p-4", accentClass)}>
      <div className="flex items-start gap-2">
        <FileText className="mt-0.5 h-4 w-4 shrink-0 text-forest-700" aria-hidden />
        <div>
          <h3 className="text-sm font-medium text-stone-800">{title}</h3>
          <p className="mt-0.5 text-xs text-stone-600">{description}</p>
        </div>
      </div>
      {children}
    </section>
  );
}

function ExportButton({
  label,
  pendingLabel,
  pending,
  disabled,
  primary = false,
  onClick,
}: {
  label: string;
  pendingLabel: string;
  pending: boolean;
  disabled: boolean;
  primary?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={primary ? "btn-primary text-xs" : "btn-secondary text-xs"}
      disabled={disabled}
      onClick={onClick}
    >
      <Download className="h-3.5 w-3.5" />
      {pending ? pendingLabel : label}
    </button>
  );
}
