import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Cloud, CloudDrizzle, CloudFog, CloudLightning, CloudRain, CloudSnow, CloudSun, Droplets, Sun, Wind, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useMatchStore } from "@/lib/match-store";
import type { Match, WeatherSnapshot } from "@/lib/tennis";
import { fetchCurrentWeather, matchWeatherQuery, weatherQuery } from "@/lib/weather";
import { cn } from "@/lib/utils";

function errorText(e: unknown): string {
  return e instanceof Error && e.message ? e.message : "Weather is not available right now.";
}

function weatherIcon(caption: string): LucideIcon {
  const c = caption.toLowerCase();
  if (c.includes("thunder") || c.includes("storm")) return CloudLightning;
  if (c.includes("snow") || c.includes("sleet")) return CloudSnow;
  if (c.includes("drizzle")) return CloudDrizzle;
  if (c.includes("rain") || c.includes("shower")) return CloudRain;
  if (c.includes("fog") || c.includes("mist") || c.includes("haze")) return CloudFog;
  if (c.includes("partly") || c.includes("mostly sunny") || c.includes("intermittent")) return CloudSun;
  if (c.includes("sun") || c.includes("clear") || c.includes("fair")) return Sun;
  return Cloud;
}

function unit(u: string): string {
  return /^[CF]$/i.test(u) ? `°${u.toUpperCase()}` : u;
}

function tempText(w: WeatherSnapshot): string {
  return `${Math.round(w.temp)}${unit(w.tempUnit)}`;
}

function weatherLine(w: WeatherSnapshot): string {
  return `${tempText(w)}, ${w.caption}`;
}

/** Compact one-line conditions, for headers and list rows. */
export function WeatherBadge({ weather, className }: { weather: WeatherSnapshot; className?: string }) {
  const Icon = weatherIcon(weather.caption);
  return (
    <span className={cn("inline-flex items-center gap-1 whitespace-nowrap", className)}>
      <Icon className="size-4 shrink-0" aria-hidden="true" />
      <span>{weatherLine(weather)}</span>
    </span>
  );
}

/** Full conditions block for the match details. */
export function WeatherDetails({ weather }: { weather: WeatherSnapshot }) {
  const Icon = weatherIcon(weather.caption);
  const items: { icon: LucideIcon; label: string; value: string }[] = [];
  if (weather.feels !== undefined) items.push({ icon: Sun, label: "Feels like", value: `${Math.round(weather.feels)}${unit(weather.tempUnit)}` });
  if (weather.wind !== undefined) items.push({ icon: Wind, label: "Wind", value: `${Math.round(weather.wind)} ${weather.speedUnit}` });
  if (weather.humidity !== undefined) items.push({ icon: Droplets, label: "Humidity", value: `${Math.round(weather.humidity)}%` });
  if (weather.uv !== undefined) items.push({ icon: Sun, label: "UV index", value: String(Math.round(weather.uv)) });
  return (
    <div className="rounded-lg border p-3">
      <div className="flex items-center gap-3">
        <Icon className="size-8 shrink-0 text-primary" aria-hidden="true" />
        <div className="min-w-0">
          <p className="text-2xl font-semibold tabular-nums leading-none">{tempText(weather)}</p>
          <p className="text-sm">{weather.caption}</p>
        </div>
      </div>
      {items.length > 0 && (
        <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-sm sm:grid-cols-4">
          {items.map((it) => (
            <div key={it.label}>
              <dt className="text-muted-foreground">{it.label}</dt>
              <dd className="font-medium tabular-nums">{it.value}</dd>
            </div>
          ))}
        </dl>
      )}
      <p className="mt-2 text-xs text-muted-foreground">
        Recorded {new Date(weather.capturedAt).toLocaleString(undefined, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })} for {weather.place}
      </p>
    </div>
  );
}

function useDebounced(value: string, ms: number): string {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = window.setTimeout(() => setV(value), ms);
    return () => window.clearTimeout(t);
  }, [value, ms]);
  return v;
}

/** Live conditions preview on the setup screen; reports the snapshot to save with the match. */
export function SetupWeather({
  court,
  location,
  onChange,
}: {
  court: string;
  location?: { lat: number; lon: number };
  onChange: (w: WeatherSnapshot | undefined) => void;
}) {
  const settings = useMatchStore((s) => s.settings);
  const setSettings = useMatchStore((s) => s.setSettings);
  const raw = weatherQuery(court, location);
  const debouncedKey = useDebounced(raw ? `${raw.query}\n${raw.place}` : "", 700);
  const target = useMemo(() => {
    if (!debouncedKey) return null;
    const [q, place] = debouncedKey.split("\n");
    return { query: q, place };
  }, [debouncedKey]);
  const enabled = settings.captureWeather && target !== null;
  const query = useQuery({
    queryKey: ["weather-now", target?.query, settings.weatherUnits],
    queryFn: () => fetchCurrentWeather(target!.query, target!.place, settings.weatherUnits),
    enabled,
    staleTime: 10 * 60 * 1000,
    retry: false,
  });
  const data = query.data;
  const snapshot = useMemo(() => (enabled && data && target ? { ...data, place: target.place } : undefined), [enabled, data, target]);
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);
  useEffect(() => {
    onChangeRef.current(snapshot);
  }, [snapshot]);

  if (!settings.captureWeather) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
        <span className="text-muted-foreground">Weather is not recorded with new matches.</span>
        <Button type="button" variant="ghost" size="sm" onClick={() => setSettings({ captureWeather: true })}>Record weather</Button>
      </div>
    );
  }
  return (
    <div className="space-y-1.5" aria-live="polite">
      <p className="text-sm font-medium">Conditions now</p>
      {target === null ? (
        <p className="text-sm text-muted-foreground">Enter the court or club, or pin your location, to record the weather with this match.</p>
      ) : query.isPending ? (
        <p className="text-sm text-muted-foreground">Checking the weather…</p>
      ) : query.isError ? (
        <p className="text-sm text-destructive">{errorText(query.error)}</p>
      ) : snapshot ? (
        <WeatherDetails weather={snapshot} />
      ) : (
        <p className="text-sm text-muted-foreground">No weather found for that place. Try the town or club name.</p>
      )}
    </div>
  );
}

/** Records current conditions on a match that has none yet (live or suspended play). */
export function RecordWeatherButton({ match, size = "sm" }: { match: Match; size?: "sm" | "default" }) {
  const units = useMatchStore((s) => s.settings.weatherUnits);
  const updateMatch = useMatchStore((s) => s.updateMatch);
  const target = matchWeatherQuery(match);
  const mutation = useMutation({
    mutationFn: () => fetchCurrentWeather(target!.query, target!.place, units),
    retry: false,
    onSuccess: (w) => {
      if (w) updateMatch(match.id, { weather: w });
    },
  });
  if (!target) return null;
  return (
    <span className="inline-flex flex-wrap items-center gap-2" aria-live="polite">
      <Button type="button" variant="outline" size={size} onClick={() => mutation.mutate()} disabled={mutation.isPending}>
        <CloudSun aria-hidden="true" /> {mutation.isPending ? "Checking…" : "Record weather now"}
      </Button>
      {mutation.isSuccess && mutation.data === null && <span className="text-sm text-muted-foreground">No weather found for this court.</span>}
      {mutation.isError && <span className="text-sm text-destructive">{errorText(mutation.error)}</span>}
    </span>
  );
}
