import type { Match, WeatherSnapshot } from "@/lib/tennis";

export type WeatherUnits = "Metric" | "Imperial";

/** What to ask the weather service about: the pinned position first, else the court name. */
export function weatherQuery(court: string, location?: { lat: number; lon: number }): { query: string; place: string } | null {
  if (location) return { query: `${location.lat.toFixed(4)},${location.lon.toFixed(4)}`, place: court.trim() || "Pinned court" };
  const name = court.trim();
  if (name.length < 3) return null;
  return { query: name, place: name };
}

export function matchWeatherQuery(m: Match) {
  return weatherQuery(m.court, m.location);
}

export class WeatherError extends Error {}

const CODES: Record<number, string> = {
  0: "Clear sky", 1: "Mostly sunny", 2: "Partly cloudy", 3: "Cloudy",
  45: "Fog", 48: "Fog",
  51: "Light drizzle", 53: "Drizzle", 55: "Heavy drizzle", 56: "Freezing drizzle", 57: "Freezing drizzle",
  61: "Light rain", 63: "Rain", 65: "Heavy rain", 66: "Freezing rain", 67: "Freezing rain",
  71: "Light snow", 73: "Snow", 75: "Heavy snow", 77: "Snow grains",
  80: "Light showers", 81: "Showers", 82: "Heavy showers", 85: "Snow showers", 86: "Snow showers",
  95: "Thunderstorm", 96: "Thunderstorm with hail", 99: "Thunderstorm with hail",
};

function num(v: unknown): number | undefined {
  return typeof v === "number" && Number.isFinite(v) ? v : undefined;
}

async function getJson(url: string): Promise<unknown> {
  let res: Response;
  try {
    res = await fetch(url);
  } catch {
    throw new WeatherError("You appear to be offline. Weather needs a connection.");
  }
  if (!res.ok) throw new WeatherError("The weather service did not answer. Try again in a moment.");
  return res.json();
}

/** Returns current conditions, or null when no place matches. Free Open-Meteo service, no account or key. */
export async function fetchCurrentWeather(query: string, place: string, units: WeatherUnits): Promise<WeatherSnapshot | null> {
  let lat: number | undefined;
  let lon: number | undefined;
  const pair = /^\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*$/.exec(query);
  if (pair) {
    lat = Number(pair[1]);
    lon = Number(pair[2]);
  } else {
    const geo = (await getJson(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=1&language=en&format=json`)) as {
      results?: { latitude?: number; longitude?: number }[];
    };
    lat = num(geo.results?.[0]?.latitude);
    lon = num(geo.results?.[0]?.longitude);
    if (lat === undefined || lon === undefined) return null;
  }
  const metric = units === "Metric";
  const params = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lon),
    current: "temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,wind_speed_10m,uv_index",
    temperature_unit: metric ? "celsius" : "fahrenheit",
    wind_speed_unit: metric ? "kmh" : "mph",
  });
  const data = (await getJson(`https://api.open-meteo.com/v1/forecast?${params}`)) as {
    current?: Record<string, unknown>;
  };
  const c = data.current;
  const temp = num(c?.temperature_2m);
  if (!c || temp === undefined) return null;
  const code = num(c.weather_code);
  return {
    temp,
    feels: num(c.apparent_temperature),
    caption: (code !== undefined && CODES[code]) || "Current conditions",
    wind: num(c.wind_speed_10m),
    humidity: num(c.relative_humidity_2m),
    uv: num(c.uv_index),
    tempUnit: metric ? "°C" : "°F",
    speedUnit: metric ? "km/h" : "mph",
    place,
    capturedAt: Date.now(),
  };
}
