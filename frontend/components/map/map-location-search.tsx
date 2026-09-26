"use client";

import { FormEvent, useMemo, useState } from "react";
import { Loader2, MapPin, Navigation, Search } from "lucide-react";
import { useMapsLibrary } from "@vis.gl/react-google-maps";
import type { MapLatLng } from "@/lib/map-defaults";

type Props = {
  onSelect: (center: MapLatLng) => void;
  onLocate: () => void;
  locating?: boolean;
  locationError?: string | null;
};

export function MapLocationSearch({
  onSelect,
  onLocate,
  locating = false,
  locationError,
}: Props) {
  const [query, setQuery] = useState("");
  const [searchError, setSearchError] = useState<string | null>(null);
  const [searching, setSearching] = useState(false);
  const geocodingLib = useMapsLibrary("geocoding");
  const geocoder = useMemo(
    () => (geocodingLib ? new geocodingLib.Geocoder() : null),
    [geocodingLib],
  );

  async function handleSearch(e: FormEvent) {
    e.preventDefault();
    const text = query.trim();
    if (!text) return;
    if (!geocoder) {
      setSearchError("Map is still loading — try again in a moment.");
      return;
    }
    setSearching(true);
    setSearchError(null);
    try {
      const response = await geocoder.geocode({
        address: text,
        componentRestrictions: { country: "IN" },
      });
      const result = response.results[0];
      if (!result?.geometry?.location) {
        setSearchError("No matching place found. Try a village, city, or landmark.");
        return;
      }
      onSelect({
        lat: result.geometry.location.lat(),
        lng: result.geometry.location.lng(),
      });
    } catch {
      setSearchError("Search failed. Check your connection and try again.");
    } finally {
      setSearching(false);
    }
  }

  return (
    <div className="pointer-events-auto w-full max-w-md space-y-2">
      <form
        onSubmit={handleSearch}
        className="flex gap-2 rounded-xl border border-stone-200/90 bg-white/95 p-2 shadow-lg backdrop-blur dark:border-stone-700 dark:bg-stone-900/95"
      >
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
          <input
            className="input w-full py-2 pl-9 text-sm"
            placeholder="Search village, city, highway…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <button
          type="submit"
          className="btn-secondary shrink-0 px-3 text-xs"
          disabled={searching || !query.trim()}
        >
          {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : "Go"}
        </button>
        <button
          type="button"
          className="btn-primary shrink-0 px-3 text-xs"
          onClick={onLocate}
          disabled={locating}
          title="Use my current location"
        >
          {locating ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Navigation className="h-4 w-4" />
          )}
        </button>
      </form>
      {(searchError || locationError) && (
        <p className="rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700 shadow">
          {searchError || locationError}
        </p>
      )}
      <p className="flex items-center gap-1.5 text-xs text-stone-600 drop-shadow-sm">
        <MapPin className="h-3.5 w-3.5" />
        Pan the map, search a place, or use GPS — then click Draw and tap vertices.
      </p>
    </div>
  );
}
