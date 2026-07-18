"use client";

import { useRef, useState } from "react";
import { Camera, ImagePlus, Loader2, Trash2, Upload } from "lucide-react";
import { cn } from "@/lib/cn";

type PhotoUploadZoneProps = {
  minPhotos: number;
  photoKeys: string[];
  previews: string[];
  busy?: boolean;
  onAdd: (files: FileList) => Promise<void>;
  onRemove: (index: number) => void;
};

export function PhotoUploadZone({
  minPhotos,
  photoKeys,
  previews,
  busy,
  onAdd,
  onRemove,
}: PhotoUploadZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  async function handleFiles(files: FileList | null) {
    if (!files?.length || busy) return;
    await onAdd(files);
  }

  return (
    <div className="space-y-5">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          void handleFiles(e.dataTransfer.files);
        }}
        className={cn(
          "relative overflow-hidden rounded-3xl border-2 border-dashed p-8 text-center transition-all",
          dragging
            ? "border-forest-400 bg-forest-50/80 dark:bg-forest-950/30"
            : "border-stone-300 bg-gradient-to-br from-white to-stone-50 dark:border-stone-700 dark:from-stone-900 dark:to-stone-950",
        )}
      >
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(34,197,94,0.08),transparent_55%)]" />
        <div className="relative mx-auto flex max-w-md flex-col items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-forest-600 text-white shadow-xl shadow-forest-600/30">
            {busy ? <Loader2 className="h-7 w-7 animate-spin" /> : <Upload className="h-7 w-7" />}
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-semibold text-stone-900 dark:text-stone-50">
              Drop photos here or browse
            </h3>
            <p className="text-sm text-stone-500">
              Minimum {minPhotos} clear photo{minPhotos === 1 ? "" : "s"} — pit, trunk, and full tree
              where applicable.
            </p>
          </div>
          <div className="flex flex-wrap justify-center gap-3">
            <button
              type="button"
              className="btn-primary"
              disabled={busy}
              onClick={() => inputRef.current?.click()}
            >
              <ImagePlus className="h-4 w-4" />
              Upload images
            </button>
            <button
              type="button"
              className="btn-secondary"
              disabled={busy}
              onClick={() => {
                if (!inputRef.current) return;
                inputRef.current.setAttribute("capture", "environment");
                inputRef.current.click();
                inputRef.current.removeAttribute("capture");
              }}
            >
              <Camera className="h-4 w-4" />
              Use camera
            </button>
          </div>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => {
              void handleFiles(e.target.files);
              e.target.value = "";
            }}
          />
        </div>
      </div>

      <div className="flex items-center justify-between text-sm">
        <span className="text-stone-600 dark:text-stone-300">
          {photoKeys.length} of {minPhotos} required uploaded
        </span>
        <span
          className={cn(
            "rounded-full px-3 py-1 text-xs font-medium",
            photoKeys.length >= minPhotos
              ? "bg-forest-100 text-forest-800 dark:bg-forest-900/50 dark:text-forest-300"
              : "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
          )}
        >
          {photoKeys.length >= minPhotos ? "Requirement met" : "More photos needed"}
        </span>
      </div>

      {previews.length > 0 && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          {previews.map((src, index) => (
            <div
              key={`${photoKeys[index]}-${index}`}
              className="group relative overflow-hidden rounded-2xl border border-stone-200 bg-stone-100 dark:border-stone-800 dark:bg-stone-900"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt={`Upload ${index + 1}`} className="aspect-[4/3] w-full object-cover" />
              <button
                type="button"
                onClick={() => onRemove(index)}
                className="absolute right-2 top-2 rounded-full bg-black/60 p-2 text-white opacity-0 transition group-hover:opacity-100"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
