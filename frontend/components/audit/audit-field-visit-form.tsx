"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Camera, LocateFixed, Navigation } from "lucide-react";
import {
  TREE_PRESENCE_OPTIONS,
  type TreePresence,
  captureBrowserLocation,
  mapsDirectionsUrl,
  plotLatLng,
  type AuditSamplingPlot,
} from "@/lib/audit-field-visit";
import { uploads } from "@/lib/api";

export type AuditFieldVisitPayload = {
  tree_presence: TreePresence;
  photo_keys: string[];
  visitor_lat: number;
  visitor_lon: number;
  trees_observed?: number;
  trees_alive?: number;
  canopy_cover_pct?: number;
  verification_outcome: "claim_supported" | "claim_unsupported" | "inconclusive";
  notes?: string;
};

export function AuditFieldVisitForm({
  plot,
  saving,
  onSubmit,
  onCancel,
}: {
  plot: AuditSamplingPlot;
  saving?: boolean;
  onSubmit: (payload: AuditFieldVisitPayload) => void;
  onCancel: () => void;
}) {
  const t = useTranslations("auditSampling");
  const [treePresence, setTreePresence] = useState<TreePresence>("present");
  const [treesObserved, setTreesObserved] = useState("");
  const [treesAlive, setTreesAlive] = useState("");
  const [canopyCover, setCanopyCover] = useState("");
  const [outcome, setOutcome] = useState<AuditFieldVisitPayload["verification_outcome"]>(
    "inconclusive",
  );
  const [notes, setNotes] = useState("");
  const [photoKeys, setPhotoKeys] = useState<string[]>([]);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [gps, setGps] = useState<{ lat: number; lng: number } | null>(null);
  const [gpsBusy, setGpsBusy] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const plotPos = plotLatLng(plot);

  useEffect(() => {
    setGpsBusy(true);
    captureBrowserLocation()
      .then((pos) => {
        setGps(pos);
        setGpsError(null);
      })
      .catch(() => setGpsError(t("gpsCaptureFailed")))
      .finally(() => setGpsBusy(false));
  }, [plot.id, t]);

  async function handlePhotoChange(file: File | null) {
    if (!file) return;
    setPhotoBusy(true);
    setFormError(null);
    try {
      const key = await uploads.uploadImage(file);
      setPhotoKeys((prev) => [...prev, key]);
    } catch {
      setFormError(t("photoUploadFailed"));
    } finally {
      setPhotoBusy(false);
    }
  }

  function handleSubmit() {
    if (!gps) {
      setFormError(t("gpsRequired"));
      return;
    }
    if (photoKeys.length === 0) {
      setFormError(t("photoRequired"));
      return;
    }
    setFormError(null);
    onSubmit({
      tree_presence: treePresence,
      photo_keys: photoKeys,
      visitor_lat: gps.lat,
      visitor_lon: gps.lng,
      trees_observed: treesObserved ? Number(treesObserved) : undefined,
      trees_alive: treesAlive ? Number(treesAlive) : undefined,
      canopy_cover_pct: canopyCover ? Number(canopyCover) : undefined,
      verification_outcome: outcome,
      notes: notes.trim() || undefined,
    });
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        {plotPos ? (
          <>
            <a
              href={mapsDirectionsUrl(plotPos.lat, plotPos.lng)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 rounded-lg bg-sky-50 px-2.5 py-1.5 text-xs font-medium text-sky-900 ring-1 ring-sky-200 hover:bg-sky-100"
            >
              <Navigation className="h-3.5 w-3.5" aria-hidden />
              {t("openInMaps")}
            </a>
            <span className="text-xs text-stone-500">
              {plotPos.lat.toFixed(5)}, {plotPos.lng.toFixed(5)}
            </span>
          </>
        ) : null}
        <button
          type="button"
          className="inline-flex items-center gap-1 rounded-lg border border-stone-200 px-2.5 py-1.5 text-xs text-stone-700 hover:bg-stone-50"
          disabled={gpsBusy}
          onClick={() => {
            setGpsBusy(true);
            captureBrowserLocation()
              .then((pos) => {
                setGps(pos);
                setGpsError(null);
              })
              .catch(() => setGpsError(t("gpsCaptureFailed")))
              .finally(() => setGpsBusy(false));
          }}
        >
          <LocateFixed className="h-3.5 w-3.5" aria-hidden />
          {gpsBusy ? t("capturingGps") : t("refreshGps")}
        </button>
      </div>
      {gps ? (
        <p className="text-xs text-emerald-700">
          {t("gpsCaptured", { lat: gps.lat.toFixed(5), lng: gps.lng.toFixed(5) })}
        </p>
      ) : null}
      {gpsError ? <p className="text-xs text-amber-700">{gpsError}</p> : null}

      <label className="block text-xs text-stone-600">
        {t("treePresence")}
        <select
          className="input mt-1 w-full text-sm"
          value={treePresence}
          onChange={(e) => setTreePresence(e.target.value as TreePresence)}
        >
          {TREE_PRESENCE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {t(opt.labelKey)}
            </option>
          ))}
        </select>
      </label>

      <div className="grid gap-2 sm:grid-cols-3">
        <input
          className="input text-sm"
          placeholder={t("treesObserved")}
          value={treesObserved}
          onChange={(e) => setTreesObserved(e.target.value)}
        />
        <input
          className="input text-sm"
          placeholder={t("treesAlive")}
          value={treesAlive}
          onChange={(e) => setTreesAlive(e.target.value)}
        />
        <input
          className="input text-sm"
          placeholder={t("canopyCover")}
          value={canopyCover}
          onChange={(e) => setCanopyCover(e.target.value)}
        />
      </div>

      <select
        className="input text-sm"
        value={outcome}
        onChange={(e) =>
          setOutcome(e.target.value as AuditFieldVisitPayload["verification_outcome"])
        }
      >
        <option value="inconclusive">{t("outcomeInconclusive")}</option>
        <option value="claim_supported">{t("outcomeSupported")}</option>
        <option value="claim_unsupported">{t("outcomeUnsupported")}</option>
      </select>

      <textarea
        className="input text-sm"
        rows={2}
        placeholder={t("notes")}
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
      />

      <div className="space-y-2">
        <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-forest-800">
          <Camera className="h-4 w-4" aria-hidden />
          <span>{photoBusy ? t("uploadingPhoto") : t("addPhoto")}</span>
          <input
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            disabled={photoBusy || photoKeys.length >= 5}
            onChange={(e) => handlePhotoChange(e.target.files?.[0] ?? null)}
          />
        </label>
        {photoKeys.length > 0 ? (
          <p className="text-xs text-emerald-700">{t("photosAttached", { count: photoKeys.length })}</p>
        ) : (
          <p className="text-xs text-stone-500">{t("photoRequiredHint")}</p>
        )}
      </div>

      {formError ? <p className="text-xs text-rose-700">{formError}</p> : null}

      <div className="flex gap-2">
        <button
          type="button"
          className="btn-primary text-sm"
          disabled={saving || photoBusy || gpsBusy}
          onClick={handleSubmit}
        >
          {t("saveVisit")}
        </button>
        <button type="button" className="text-sm text-stone-500" onClick={onCancel}>
          {t("cancel")}
        </button>
      </div>
    </div>
  );
}
