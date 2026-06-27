"use client";

import { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { useQuery } from "@tanstack/react-query";
import { trees } from "@/lib/api";

export default function MapPage() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);

  const { data } = useQuery({
    queryKey: ["trees-map"],
    queryFn: () => trees.list({ page_size: 500 }),
  });

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    if (!token) {
      containerRef.current.innerHTML =
        '<div class="p-8 text-stone-600">Set <code class="font-mono">NEXT_PUBLIC_MAPBOX_TOKEN</code> to enable the map.</div>';
      return;
    }
    mapboxgl.accessToken = token;
    mapRef.current = new mapboxgl.Map({
      container: containerRef.current,
      style: "mapbox://styles/mapbox/outdoors-v12",
      center: [77.5946, 12.9716],
      zoom: 11,
    });
  }, []);

  useEffect(() => {
    if (!mapRef.current || !data) return;
    const map = mapRef.current;

    function addMarkers() {
      data!.items.forEach((t) => {
        const el = document.createElement("div");
        el.style.cssText =
          "width:14px;height:14px;border-radius:9999px;border:2px solid white;background:#16a34a;box-shadow:0 1px 3px rgba(0,0,0,.3)";
        if (t.current_health === "moderate") el.style.background = "#f59e0b";
        if (t.current_health === "unhealthy") el.style.background = "#dc2626";
        new mapboxgl.Marker(el)
          .setLngLat([t.longitude, t.latitude])
          .setPopup(
            new mapboxgl.Popup().setHTML(
              `<div style="font-family:Inter,sans-serif">
                <div style="font-weight:600">${t.species_text || "Unknown"}</div>
                <div style="font-size:12px;color:#78716c">${t.public_code}</div>
                <div style="font-size:12px">Carbon: ${Number(t.current_carbon_kg).toFixed(1)} kg</div>
                <a href="/trees/${t.id}" style="font-size:12px;color:#15803d">View →</a>
              </div>`
            )
          )
          .addTo(map);
      });
    }

    if (map.loaded()) addMarkers();
    else map.on("load", addMarkers);
  }, [data]);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Map</h1>
      <div ref={containerRef} className="h-[70vh] w-full rounded-xl border border-stone-200 bg-stone-100" />
    </div>
  );
}
