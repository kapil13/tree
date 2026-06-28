"use client";

import { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import type { Tree } from "@/lib/api";

const DEFAULT_CENTER: [number, number] = [77.5946, 12.9716];

type TreesSatelliteMapProps = {
  trees: Tree[];
  className?: string;
};

export function TreesSatelliteMap({ trees, className }: TreesSatelliteMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    if (!token) {
      containerRef.current.innerHTML =
        '<div class="flex h-full items-center justify-center p-8 text-center text-stone-600"><div>Set <code class="rounded bg-stone-100 px-1 font-mono text-sm">NEXT_PUBLIC_MAPBOX_TOKEN</code> in <code class="rounded bg-stone-100 px-1 font-mono text-sm">frontend/.env.local</code> to show the satellite map.</div></div>';
      return;
    }

    mapboxgl.accessToken = token;
    mapRef.current = new mapboxgl.Map({
      container: containerRef.current,
      style: "mapbox://styles/mapbox/satellite-streets-v12",
      center: DEFAULT_CENTER,
      zoom: 11,
    });

    mapRef.current.addControl(new mapboxgl.NavigationControl(), "top-right");

    return () => {
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !process.env.NEXT_PUBLIC_MAPBOX_TOKEN) return;

    const placeMarkers = () => {
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];

      const bounds = new mapboxgl.LngLatBounds();
      let placed = 0;

      trees.forEach((t) => {
        if (t.longitude == null || t.latitude == null) return;
        const lngLat: [number, number] = [t.longitude, t.latitude];
        bounds.extend(lngLat);
        placed += 1;

        const el = document.createElement("div");
        const verified = t.satellite_verified;
        el.style.cssText = [
          "width:16px",
          "height:16px",
          "border-radius:9999px",
          "border:2px solid white",
          `background:${verified ? "#16a34a" : "#94a3b8"}`,
          "box-shadow:0 1px 4px rgba(0,0,0,.45)",
          "cursor:pointer",
        ].join(";");

        const marker = new mapboxgl.Marker(el)
          .setLngLat(lngLat)
          .setPopup(
            new mapboxgl.Popup({ offset: 12 }).setHTML(
              `<div style="font-family:Inter,sans-serif;min-width:180px">
                <div style="font-weight:600">${t.species_text || "Unknown species"}</div>
                <div style="font-size:12px;color:#78716c;margin-top:2px">${t.public_code}</div>
                <div style="font-size:12px;margin-top:8px">
                  Satellite: <strong style="color:${verified ? "#15803d" : "#78716c"}">${verified ? "Verified ✓" : "Pending scan"}</strong>
                </div>
                <div style="font-size:12px;margin-top:4px;color:#78716c">
                  ${Number(t.latitude).toFixed(5)}, ${Number(t.longitude).toFixed(5)}
                </div>
                <a href="/trees/${t.id}" style="display:inline-block;margin-top:10px;font-size:12px;color:#15803d;font-weight:500">NDVI chart →</a>
              </div>`
            )
          )
          .addTo(map);

        markersRef.current.push(marker);
      });

      if (placed > 1) {
        map.fitBounds(bounds, { padding: 72, maxZoom: 15, duration: 800 });
      } else if (placed === 1) {
        map.flyTo({ center: bounds.getCenter(), zoom: 15, duration: 800 });
      }
    };

    if (map.loaded()) placeMarkers();
    else map.on("load", placeMarkers);
  }, [trees]);

  return <div ref={containerRef} className={className} />;
}
