"use client";

import { useQuery } from "@tanstack/react-query";
import { CloudRain, Loader2, Sun } from "lucide-react";
import { plantationFences, errorMessage } from "@/lib/api";

export type WeatherForecast = {
  latitude: number;
  longitude: number;
  timezone: string;
  provider: string;
  days: {
    date: string;
    weather_code: number;
    description: string;
    temp_min_c: number;
    temp_max_c: number;
    precipitation_mm: number;
    wind_max_kmh: number | null;
  }[];
};

function weatherEmoji(code: number): string {
  if (code === 0) return "☀️";
  if (code <= 3) return "⛅";
  if (code === 45 || code === 48) return "🌫️";
  if (code >= 95) return "⛈️";
  if (code >= 51 && code <= 67) return "🌧️";
  if (code >= 80) return "🌦️";
  if (code >= 71) return "❄️";
  return "🌤️";
}

function formatDay(dateStr: string): string {
  const d = new Date(`${dateStr}T12:00:00`);
  return d.toLocaleDateString(undefined, { weekday: "short", day: "numeric" });
}

type Props = {
  fenceId: string;
  fenceName?: string;
  variant?: "compact" | "expanded";
};

export function WeatherForecastPanel({ fenceId, fenceName, variant = "compact" }: Props) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["weather", fenceId],
    queryFn: () => plantationFences.weather(fenceId),
    staleTime: 30 * 60_000,
  });

  const expanded = variant === "expanded";

  return (
    <div className={expanded ? "" : "rounded-lg border border-stone-200 bg-white p-3"}>
      <div className={`flex items-center gap-2 font-medium text-stone-800 ${expanded ? "text-base" : "mb-2 text-sm"}`}>
        <Sun className={`text-amber-500 ${expanded ? "h-5 w-5" : "h-4 w-4"}`} />
        5-day forecast{fenceName ? ` · ${fenceName}` : ""}
      </div>
      {expanded && (
        <p className="mt-1 text-xs text-stone-500">
          Field operations and stress risk — precipitation and temperature at site centroid
        </p>
      )}

      {isLoading && (
        <div className="flex items-center gap-2 text-sm text-stone-500">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading forecast…
        </div>
      )}

      {error && (
        <p className="text-sm text-rose-700">{errorMessage(error)}</p>
      )}

      {data && (
        <>
          <p className={`text-stone-500 ${expanded ? "mt-3 text-sm" : "mb-2 text-xs"}`}>
            Open-Meteo · {data.timezone}
          </p>
          <div className={expanded ? "mt-3 grid grid-cols-2 gap-3 sm:grid-cols-5" : "grid grid-cols-5 gap-1"}>
            {data.days.map((day) => (
              <div
                key={day.date}
                className={
                  expanded
                    ? "rounded-xl border border-stone-100 bg-gradient-to-b from-sky-50/80 to-white px-3 py-4 text-center"
                    : "rounded-md bg-stone-50 px-1 py-2 text-center text-xs"
                }
                title={day.description}
              >
                <div className={expanded ? "text-sm font-semibold text-stone-800" : "font-medium text-stone-700"}>
                  {formatDay(day.date)}
                </div>
                <div className={expanded ? "my-2 text-3xl leading-none" : "my-1 text-lg leading-none"}>
                  {weatherEmoji(day.weather_code)}
                </div>
                <div className={expanded ? "text-xl font-bold text-stone-900" : "font-semibold text-stone-900"}>
                  {Math.round(day.temp_max_c)}°
                </div>
                <div className={expanded ? "text-sm text-stone-500" : "text-stone-500"}>
                  {Math.round(day.temp_min_c)}° low
                </div>
                <p className={expanded ? "mt-2 line-clamp-2 text-xs text-stone-500" : "hidden"}>
                  {day.description}
                </p>
                {day.precipitation_mm > 0 && (
                  <div
                    className={
                      expanded
                        ? "mt-2 inline-flex items-center gap-1 rounded-full bg-sky-100 px-2 py-1 text-xs font-medium text-sky-800"
                        : "mt-1 flex items-center justify-center gap-0.5 text-sky-700"
                    }
                  >
                    <CloudRain className={expanded ? "h-3.5 w-3.5" : "h-3 w-3"} />
                    {day.precipitation_mm.toFixed(0)} mm
                  </div>
                )}
                {expanded && day.wind_max_kmh != null && (
                  <p className="mt-2 text-[11px] text-stone-400">Wind up to {Math.round(day.wind_max_kmh)} km/h</p>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
