"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { trees, errorMessage } from "@/lib/api";

export default function NewTreePage() {
  const router = useRouter();
  const [form, setForm] = useState({
    species_text: "Neem",
    planted_at: new Date().toISOString().slice(0, 10),
    latitude: "12.9716",
    longitude: "77.5946",
    altitude_m: "",
    accuracy_m: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

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

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const t = await trees.create({
        species_text: form.species_text,
        planted_at: form.planted_at,
        latitude: parseFloat(form.latitude),
        longitude: parseFloat(form.longitude),
        altitude_m: form.altitude_m ? parseFloat(form.altitude_m) : undefined,
        accuracy_m: form.accuracy_m ? parseFloat(form.accuracy_m) : undefined,
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
