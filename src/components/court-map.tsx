import { useMemo, useState } from "react";
import { ExternalLink, LocateFixed, MapPin } from "lucide-react";
import type { Match } from "@/lib/tennis";
import { replay, setScoreText, teamName } from "@/lib/tennis";
import { cn } from "@/lib/utils";

interface Point {
  lat: number;
  lon: number;
}

interface CourtGroup {
  id: string;
  label: string;
  matches: Match[];
  /** Device-pinned position from one of the court's matches. */
  pos?: Point;
}

function groupCourts(matches: Match[]): { groups: CourtGroup[]; unplaced: number } {
  const byName = new Map<string, CourtGroup>();
  const groups: CourtGroup[] = [];
  let unplaced = 0;
  for (const m of matches) {
    const name = m.court.trim();
    if (name) {
      const key = name.toLowerCase();
      let g = byName.get(key);
      if (!g) {
        g = { id: `court:${key}`, label: name, matches: [] };
        byName.set(key, g);
        groups.push(g);
      }
      g.matches.push(m);
      if (!g.pos && m.location) g.pos = m.location;
    } else if (m.location) {
      groups.push({ id: `pin:${m.id}`, label: "Pinned court", matches: [m], pos: m.location });
    } else {
      unplaced += 1;
    }
  }
  return { groups, unplaced };
}

const W = 640;
const H = 420;
const PAD_X = 120;
const PAD_Y = 64;

/** Distance in km between two points (haversine). */
function km(a: Point, b: Point): number {
  const r = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLon = ((b.lon - a.lon) * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return 2 * r * Math.asin(Math.sqrt(h));
}

function niceStep(raw: number): number {
  const p = 10 ** Math.floor(Math.log10(raw));
  const n = raw / p;
  return (n >= 5 ? 5 : n >= 2 ? 2 : 1) * p;
}

/** Fits the pinned courts into the drawing with an equirectangular projection corrected for latitude. */
function useProjection(points: Point[]) {
  return useMemo(() => {
    if (points.length === 0) return null;
    const lats = points.map((p) => p.lat);
    const lons = points.map((p) => p.lon);
    const midLat = (Math.min(...lats) + Math.max(...lats)) / 2;
    const k = Math.cos((midLat * Math.PI) / 180);
    // Show at least ~2 km across so a single court is not infinitely zoomed.
    const minSpan = 0.02;
    const spanX = Math.max((Math.max(...lons) - Math.min(...lons)) * k, minSpan);
    const spanY = Math.max(Math.max(...lats) - Math.min(...lats), minSpan);
    const scale = Math.min((W - PAD_X * 2) / spanX, (H - PAD_Y * 2) / spanY);
    const cx = ((Math.max(...lons) + Math.min(...lons)) / 2) * k;
    const cy = (Math.max(...lats) + Math.min(...lats)) / 2;
    const project = (p: Point) => ({ x: W / 2 + (p.lon * k - cx) * scale, y: H / 2 - (p.lat - cy) * scale });
    // Scale bar: ~1/4 of the width, rounded to a tidy distance.
    const kmPerPx = 111.32 / scale;
    const barKm = niceStep(kmPerPx * (W / 4));
    return { project, barKm, barPx: barKm / kmPerPx };
  }, [points]);
}

function mapsLink(g: CourtGroup): string {
  const p = g.pos!;
  const q = encodeURIComponent(g.label === "Pinned court" ? "Tennis court" : g.label);
  return `https://maps.apple.com/?ll=${p.lat.toFixed(6)},${p.lon.toFixed(6)}&q=${q}`;
}

export function CourtMap({ matches, onOpen }: { matches: Match[]; onOpen: (id: string) => void }) {
  const { groups, unplaced } = useMemo(() => groupCourts(matches), [matches]);
  const placed = useMemo(() => groups.filter((g) => g.pos), [groups]);
  const points = useMemo(() => placed.map((g) => g.pos!), [placed]);
  const proj = useProjection(points);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = placed.find((g) => g.id === selectedId);
  const toggle = (id: string) => setSelectedId((cur) => (cur === id ? null : id));

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="space-y-2">
        <div className="overflow-hidden rounded-xl border bg-card">
          {proj ? (
            <div className="relative">
            <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full" role="group" aria-label={`Map of ${placed.length} pinned ${placed.length === 1 ? "court" : "courts"}`}>
              <defs>
                <pattern id="court-grid" width="32" height="32" patternUnits="userSpaceOnUse">
                  <path d="M 32 0 L 0 0 0 32" fill="none" className="stroke-border" strokeWidth="1" />
                </pattern>
              </defs>
              <rect width={W} height={H} className="fill-muted/40" />
              <rect width={W} height={H} fill="url(#court-grid)" />
              {selected &&
                placed
                  .filter((g) => g.id !== selected.id)
                  .map((g) => {
                    const a = proj.project(selected.pos!);
                    const b = proj.project(g.pos!);
                    const d = km(selected.pos!, g.pos!);
                    return (
                      <g key={`line-${g.id}`} aria-hidden="true">
                        <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} className="stroke-primary/50" strokeWidth="1.5" strokeDasharray="4 4" />
                        <text x={(a.x + b.x) / 2} y={(a.y + b.y) / 2 - 8} textAnchor="middle" strokeWidth="4" className="fill-foreground text-[20px] font-medium tabular-nums [paint-order:stroke] stroke-background">
                          {d < 1 ? `${Math.round(d * 1000)} m` : `${d.toFixed(d < 10 ? 1 : 0)} km`}
                        </text>
                      </g>
                    );
                  })}
              <g aria-hidden="true" transform={`translate(16 ${H - 20})`}>
                <line x1="0" y1="0" x2={proj.barPx} y2="0" className="stroke-foreground" strokeWidth="2" />
                <line x1="0" y1="-5" x2="0" y2="5" className="stroke-foreground" strokeWidth="2" />
                <line x1={proj.barPx} y1="-5" x2={proj.barPx} y2="5" className="stroke-foreground" strokeWidth="2" />
                <text x={proj.barPx / 2} y="-10" textAnchor="middle" className="fill-foreground text-[18px] tabular-nums">
                  {proj.barKm < 1 ? `${Math.round(proj.barKm * 1000)} m` : `${proj.barKm} km`}
                </text>
              </g>
              <g aria-hidden="true" transform={`translate(${W - 24} 28)`}>
                <path d="M0 -14 L6 4 L0 0 L-6 4 Z" className="fill-foreground" />
                <text y="18" textAnchor="middle" className="fill-foreground text-[16px] font-semibold">N</text>
              </g>
            </svg>
            {placed.map((g) => {
              const { x, y } = proj.project(g.pos!);
              const active = g.id === selectedId;
              const n = g.matches.length;
              return (
                <button
                  key={g.id}
                  type="button"
                  aria-pressed={active}
                  aria-label={`${g.label}, ${n} ${n === 1 ? "match" : "matches"}`}
                  onClick={() => toggle(g.id)}
                  style={{ left: `${(x / W) * 100}%`, top: `${(y / H) * 100}%` }}
                  className="group absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center focus-visible:outline-none"
                >
                  <span className={cn("flex items-center justify-center rounded-full border-2 border-background font-semibold tabular-nums text-primary-foreground shadow-md transition-transform group-focus-visible:ring-3 group-focus-visible:ring-ring", active ? "size-10 bg-primary" : "size-8 bg-primary/85 text-sm")}>{n}</span>
                  <span className="pointer-events-none absolute top-full mt-1 max-w-36 truncate rounded bg-background/90 px-1.5 text-xs font-medium shadow-sm">{g.label}</span>
                </button>
              );
            })}
            </div>
          ) : (
            <div className="flex min-h-64 flex-col items-center justify-center gap-2 p-6 text-center">
              <LocateFixed className="size-8 text-muted-foreground" aria-hidden="true" />
              <p className="font-medium">No pinned courts yet</p>
              <p className="max-w-sm text-sm text-muted-foreground">When you set up a match, tap “Pin my current location” and the court appears here.</p>
            </div>
          )}
        </div>
        {proj && <p className="text-sm text-muted-foreground">Select a court to see its matches and how far it is from your other courts.</p>}
      </div>

      <section aria-labelledby="courts-h" className="space-y-3">
        <h2 id="courts-h" className="font-semibold">Courts</h2>
        <ul className="divide-y rounded-xl border bg-card">
          {groups.map((g) => {
            const active = g.id === selectedId;
            return (
              <li key={g.id}>
                <button
                  type="button"
                  aria-pressed={active}
                  onClick={() => toggle(g.id)}
                  className={cn("flex w-full items-start gap-2 p-3 text-left focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring", active ? "bg-muted" : "hover:bg-accent")}
                >
                  <MapPin className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                  <span className="min-w-0">
                    <span className="block font-medium break-words">{g.label}</span>
                    <span className="block text-xs text-muted-foreground">
                      {`${g.matches.length} ${g.matches.length === 1 ? "match" : "matches"}${g.pos ? " · pinned" : " · not pinned"}`}
                    </span>
                  </span>
                </button>
                {active && (
                  <div className="space-y-1 px-3 pb-3 pl-9">
                    {g.pos && (
                      <a href={mapsLink(g)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 rounded-md p-1.5 text-sm font-medium text-primary underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-ring">
                        <ExternalLink className="size-3.5" aria-hidden="true" /> Open in Maps
                      </a>
                    )}
                    <ul className="space-y-1">
                      {g.matches.map((m) => {
                        const s = replay(m);
                        return (
                          <li key={m.id}>
                            <button type="button" className="w-full rounded-md p-1.5 text-left text-sm hover:bg-accent focus-visible:outline-2 focus-visible:outline-ring" onClick={() => onOpen(m.id)}>
                              <span className="block">{`${teamName(m, 0)} vs ${teamName(m, 1)}`}</span>
                              <span className="block font-mono text-xs tabular-nums text-muted-foreground">
                                {`${new Date(m.createdAt).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })} · ${m.format.mode === "game" ? "Single game" : s.sets.filter((x) => x.winner !== undefined || x.games[0] + x.games[1] > 0 || x.tb).map(setScoreText).join(", ") || "No games"}`}
                              </span>
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}
              </li>
            );
          })}
          {groups.length === 0 && <li className="p-3 text-sm">Add a court name or pin your location when you set up a match.</li>}
        </ul>
        {unplaced > 0 && <p className="text-sm text-muted-foreground">{`${unplaced} ${unplaced === 1 ? "match has" : "matches have"} no court or location.`}</p>}
      </section>
    </div>
  );
}
