"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ImagePlus, X } from "lucide-react";
import { trees, errorMessage } from "@/lib/api";

const MAX_PHOTOS = 10;
const MAX_BYTES = 10 * 1024 * 1024;

type PendingPhoto = {
  id: string;
  file: File;
  previewUrl: string;
};

export default function NewTreePage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({
    species_text: "Neem",
    planted_at: new Date().toISOString().slice(0, 10),
    latitude: "12.9716",
    longitude: "77.5946",
    altitude_m: "",
    accuracy_m: "",
  });
  const [photos, setPhotos] = useState<PendingPhoto[]>([]);
  const photosRef = useRef(photos);
  photosRef.current = photos;
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    return () => {
      photosRef.current.forEach((p) => URL.revokeObjectURL(p.previewUrl));
    };
  }, []);

  function geo() {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition((p) => {
      setForm((f) => ({
        ...f,
        latitude: p.coords.latitude.toFixed(6),
        longitude: p.coords.longitude.toFixed(6),
        altitude_m: p.coords.altitude ? p.coords.altitude.toFixed(1) : f.altitude_m,
        accuracy_m: p.coords.accuracy ? p.coords.accuracy.toFixed(1) : f.accuracy_m,
      }));
    });
  }

  function onPickPhotos(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (!picked.length) return;

    const room = MAX_PHOTOS - photos.length;
    if (room <= 0) {
      setError(`You can attach up to ${MAX_PHOTOS} photos.`);
      return;
    }

    const next: PendingPhoto[] = [];
    for (const file of picked.slice(0, room)) {
      if (!file.type.startsWith("image/")) {
        setError("Only image files are supported.");
        continue;
      }
      if (file.size > MAX_BYTES) {
        setError("Each photo must be 10 MB or smaller.");
        continue;
      }
      next.push({
        id: crypto.randomUUID(),
        file,
        previewUrl: URL.createObjectURL(file),
      });
    }

    if (next.length) {
      setPhotos((prev) => [...prev, ...next]);
      setError(null);
    }
  }

  function removePhoto(id: string) {
    setPhotos((prev) => {
      const target = prev.find((p) => p.id === id);
      if (target) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((p) => p.id !== id);
    });
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const photo_keys: string[] = [];
      for (const photo of photos) {
        const uploaded = await trees.uploadPhoto(photo.file);
        photo_keys.push(uploaded.key);
      }

      const t = await trees.create({
        species_text: form.species_text,
        planted_at: form.planted_at,
        latitude: parseFloat(form.latitude),
        longitude: parseFloat(form.longitude),
        altitude_m: form.altitude_m ? parseFloat(form.altitude_m) : undefined,
        accuracy_m: form.accuracy_m ? parseFloat(form.accuracy_m) : undefined,
        photo_keys,
      });
      router.push(`/trees/${t.id}`);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <h1 className="text-2xl font-semibold">Register a tree</h1>
      <form onSubmit={onSubmit} className="card space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="label">Species (common or scientific name)</label>
            <input
              className="input"
              value={form.species_text}
              onChange={(e) => setForm({ ...form, species_text: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="label">Planted on</label>
            <input
              type="date"
              className="input"
              value={form.planted_at}
              onChange={(e) => setForm({ ...form, planted_at: e.target.value })}
            />
          </div>
          <div>
            <label className="label">Latitude</label>
            <input
              className="input"
              value={form.latitude}
              onChange={(e) => setForm({ ...form, latitude: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="label">Longitude</label>
            <input
              className="input"
              value={form.longitude}
              onChange={(e) => setForm({ ...form, longitude: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="label">Altitude (m)</label>
            <input
              className="input"
              value={form.altitude_m}
              onChange={(e) => setForm({ ...form, altitude_m: e.target.value })}
            />
          </div>
          <div>
            <label className="label">GPS accuracy (m)</label>
            <input
              className="input"
              value={form.accuracy_m}
              onChange={(e) => setForm({ ...form, accuracy_m: e.target.value })}
            />
          </div>
        </div>

        <div>
          <label className="label">Photos (optional)</label>
          <p className="mb-3 text-xs text-stone-500">
            Add up to {MAX_PHOTOS} images. The first photo is used as the primary image for AI analysis.
          </p>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            multiple
            className="hidden"
            onChange={onPickPhotos}
          />

          <div className="flex flex-wrap gap-3">
            {photos.map((photo) => (
              <div key={photo.id} className="group relative h-24 w-24 overflow-hidden rounded-lg border border-stone-200">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photo.previewUrl}
                  alt={photo.file.name}
                  className="h-full w-full object-cover"
                />
                <button
                  type="button"
                  onClick={() => removePhoto(photo.id)}
                  className="absolute right-1 top-1 rounded-full bg-black/60 p-1 text-white opacity-0 transition group-hover:opacity-100"
                  aria-label="Remove photo"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}

            {photos.length < MAX_PHOTOS && (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex h-24 w-24 flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-stone-300 text-stone-500 hover:border-forest-500 hover:text-forest-700"
              >
                <ImagePlus className="h-5 w-5" />
                <span className="text-xs">Add photo</span>
              </button>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={geo} className="btn-secondary">
            Use my location
          </button>
          <button type="submit" disabled={busy} className="btn-primary">
            {busy ? "Saving…" : "Register tree"}
          </button>
        </div>

        {error && <div className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</div>}

        <p className="text-xs text-stone-500">
          After registration the AI service will analyse photos (if any) and the satellite
          service will queue a baseline NDVI scan. A unique passport (QR + PDF) is generated.
        </p>
      </form>
    </div>
  );
}
