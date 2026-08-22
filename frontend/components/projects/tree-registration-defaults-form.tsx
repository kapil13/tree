"use client";

import { cn } from "@/lib/cn";
import type { TreeRegistrationDefaults } from "@/lib/tree-registration-defaults";

type TreeRegistrationDefaultsFormProps = {
  values: TreeRegistrationDefaults;
  errors?: Record<string, string>;
  onChange: (key: keyof TreeRegistrationDefaults, value: string) => void;
  className?: string;
};

export function TreeRegistrationDefaultsForm({
  values,
  errors,
  onChange,
  className,
}: TreeRegistrationDefaultsFormProps) {
  return (
    <div className={cn("space-y-4 rounded-xl border border-forest-100 bg-forest-50/40 p-4", className)}>
      <div>
        <h3 className="text-sm font-medium text-stone-900">Tree registration defaults</h3>
        <p className="mt-1 text-xs leading-relaxed text-stone-600">
          Every tree you register in this project inherits these values automatically — you will
          not be asked again in the tree wizard. They are prefilled from scheme references above;
          edit if your field team uses different labels.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="kpi-label">Permit / PCA reference *</label>
          <input
            className="input mt-1"
            value={values.permit_reference}
            onChange={(e) => onChange("permit_reference", e.target.value)}
            placeholder="PCA/STATE/2025/… or FC reference"
          />
          {errors?.permit_reference && (
            <p className="mt-1 text-xs text-rose-600">{errors.permit_reference}</p>
          )}
        </div>
        <div>
          <label className="kpi-label">Site / block / zone *</label>
          <input
            className="input mt-1"
            value={values.site_zone}
            onChange={(e) => onChange("site_zone", e.target.value)}
            placeholder="Block name, parcel ID, or district"
          />
          {errors?.site_zone && (
            <p className="mt-1 text-xs text-rose-600">{errors.site_zone}</p>
          )}
        </div>
        <div>
          <label className="kpi-label">Implementing agency *</label>
          <input
            className="input mt-1"
            value={values.implementing_agency}
            onChange={(e) => onChange("implementing_agency", e.target.value)}
            placeholder="State CAMPA / NHAI contractor / ULB"
          />
          {errors?.implementing_agency && (
            <p className="mt-1 text-xs text-rose-600">{errors.implementing_agency}</p>
          )}
        </div>
        <div>
          <label className="kpi-label">Maintenance responsible party *</label>
          <input
            className="input mt-1"
            value={values.maintenance_responsible}
            onChange={(e) => onChange("maintenance_responsible", e.target.value)}
            placeholder="Agency or team maintaining saplings"
          />
          {errors?.maintenance_responsible && (
            <p className="mt-1 text-xs text-rose-600">{errors.maintenance_responsible}</p>
          )}
        </div>
      </div>
    </div>
  );
}
