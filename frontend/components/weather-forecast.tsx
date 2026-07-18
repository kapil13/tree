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
};

export function WeatherForecastPanel({ fenceId, fenceName }: Props) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["weather", fenceId],
    queryFn: () => plantationFences.weather(fenceId),
    staleTime: 30 * 60_000,
  });

  return (
    <div className="rounded-lg border border-stone-200 bg-white p-3">
      <div className="mb-2 flex items-center gap-2 text-sm font-medium text-stone-800">
        <Sun className="h-4 w-4 text-amber-500" />
        5-day forecast{fenceName ? ` · ${fenceName}` : ""}
      </div>

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
          <p className="mb-2 text-xs text-stone-500">
            Open-Meteo · {data.timezone}
          </p>
          <div className="grid grid-cols-5 gap-1">
            {data.days.map((day) => (
              <div
                key={day.date}
                className="rounded-md bg-stone-50 px-1 py-2 text-center text-xs"
                title={day.description}
              >
                <div className="font-medium text-stone-700">{formatDay(day.date)}</div>
                <div className="my-1 text-lg leading-none">{weatherEmoji(day.weather_code)}</div>
                <div className="font-semibold text-stone-900">{Math.round(day.temp_max_c)}°</div>
                <div className="text-stone-500">{Math.round(day.temp_min_c)}°</div>
                {day.precipitation_mm > 0 && (
                  <div className="mt-1 flex items-center justify-center gap-0.5 text-sky-700">
                    <CloudRain className="h-3 w-3" />
                    {day.precipitation_mm.toFixed(0)}mm
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
