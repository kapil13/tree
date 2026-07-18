"use client";

import { Crosshair, MapPin, Navigation, Radar } from "lucide-react";
import type { ProgramField, ProgramFormValues } from "./types";
import { FormFieldsGrid } from "./form-fields";
import { cn } from "@/lib/cn";

type LocationPanelProps = {
  fields: ProgramField[];
  values: ProgramFormValues;
  onChange: (values: ProgramFormValues) => void;
  onUseLocation?: () => void;
  locating?: boolean;
};

export function LocationPanel({
  fields,
  values,
  onChange,
  onUseLocation,
  locating,
}: LocationPanelProps) {
  const hasCoords = Boolean(values.latitude && values.longitude);

  return (
    <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
      <div className="space-y-5">
        <div className="rounded-3xl border border-stone-200 bg-white/80 p-5 backdrop-blur dark:border-stone-800 dark:bg-stone-900/70">
          <FormFieldsGrid fields={fields} values={values} onChange={onChange} />
        </div>
      </div>

      <div className="space-y-4">
        <div className="relative overflow-hidden rounded-3xl border border-stone-200 bg-stone-950 p-6 text-white shadow-2xl dark:border-stone-800">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(34,197,94,0.35),transparent_45%),radial-gradient(circle_at_80%_0%,rgba(14,165,233,0.25),transparent_35%)]" />
          <div className="absolute inset-0 opacity-30 [background-image:linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] [background-size:24px_24px]" />
          <div className="relative space-y-5">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10 backdrop-blur">
                <MapPin className="h-5 w-5 text-emerald-300" />
              </div>
              <div>
                <p className="text-sm text-white/70">Live geotag</p>
                <p className="text-lg font-semibold">Pin this tree on the map</p>
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur">
              {hasCoords ? (
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <Crosshair className="mt-0.5 h-4 w-4 text-emerald-300" />
                    <div>
                      <p className="text-xs uppercase tracking-[0.2em] text-white/50">Coordinates</p>
                      <p className="font-mono text-sm">
                        {values.latitude}, {values.longitude}
                      </p>
                    </div>
                  </div>
                  {values.accuracy_m ? (
                    <div className="flex items-start gap-3">
                      <Radar className="mt-0.5 h-4 w-4 text-sky-300" />
                      <div>
                        <p className="text-xs uppercase tracking-[0.2em] text-white/50">Accuracy</p>
                        <p className="text-sm">± {values.accuracy_m} meters</p>
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : (
                <p className="text-sm leading-relaxed text-white/75">
                  GPS is required for MRV verification. Capture your current location while standing
                  next to the tree.
                </p>
              )}
            </div>

            {onUseLocation && (
              <button
                type="button"
                onClick={onUseLocation}
                disabled={locating}
                className={cn(
                  "inline-flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold transition",
                  "bg-white text-stone-900 hover:bg-emerald-50 disabled:opacity-60",
                )}
              >
                <Navigation className={cn("h-4 w-4", locating && "animate-pulse")} />
                {locating ? "Locating…" : hasCoords ? "Refresh GPS lock" : "Capture my location"}
              </button>
            )}
          </div>
        </div>

        <p className="text-xs leading-relaxed text-stone-500">
          Stand within 5 meters of the tree trunk for best accuracy. Avoid registering from photos
          taken elsewhere.
        </p>
      </div>
    </div>
  );
}
