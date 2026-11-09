import { create } from "zustand";
import type { FinalSetMode, Match, MatchEvent, MatchFormat, PointTag, Side, WeatherSnapshot } from "@/lib/tennis";
import { replay } from "@/lib/tennis";

export interface CoachMatch {
  id: string;
  court: string;
  names: [string, string];
  /** Games per set, one entry per set. */
  sets: [number, number][];
  done: boolean;
}

export interface Settings {
  announce: boolean;
  keepScreenAwake: boolean;
  lang: "en-GB" | "pt-PT" | "es-ES" | "fr-FR" | "de-DE" | "it-IT";
  voiceURI: string;
  showCues: boolean;
  showTags: boolean;
  surface: "hard" | "clay" | "grass";
  captureWeather: boolean;
  weatherUnits: "Metric" | "Imperial";
}

/** The choices from the last match set up on this device, used to prefill the next one. */
export interface LastSetup {
  mode: "match" | "game";
  format: MatchFormat;
  names: string[][];
  playerNotes: string[][];
  firstServer: Side;
  startLeft: Side;
  order: [number[], number[]];
  court: string;
  location?: { lat: number; lon: number };
}

interface Persisted {
  lastSetup: LastSetup | null;
  matches: Match[];
  activeId: string | null;
  coach: CoachMatch[];
  settings: Settings;
  recentNames: string[];
}

interface MatchStore extends Persisted {
  startMatch: (input: {
    format: MatchFormat;
    names: string[][];
    playerNotes: string[][];
    firstServer: Side;
    startLeft: Side;
    court: string;
    location?: { lat: number; lon: number };
    weather?: WeatherSnapshot;
    order: [number[], number[]];
  }) => string;
  point: (w: Side) => void;
  tagLast: (tag: PointTag | undefined) => void;
  undo: () => void;
  swapOrder: (team: Side) => void;
  setFinalMode: (mode: Exclude<FinalSetMode, "advantage">) => void;
  suspendActive: () => void;
  resume: (id: string) => void;
  closeActive: () => void;
  updateMatch: (id: string, patch: Partial<Pick<Match, "court" | "notes" | "names" | "playerNotes" | "weather" | "location">>) => void;
  deleteMatches: (ids: string[]) => void;
  setSettings: (patch: Partial<Settings>) => void;
  saveLastSetup: (setup: LastSetup) => void;
  clearLastSetup: () => void;
  addCoachMatch: (court: string, names: [string, string]) => void;
  updateCoach: (id: string, patch: Partial<CoachMatch>) => void;
  removeCoach: (id: string) => void;
  clearCoach: () => void;
  exportBackup: () => string;
  importBackup: (text: string) => { matches: number; coach: number };
}

const STORAGE_KEY = "tennis-scorecard-v1";

const DEFAULT_SETTINGS: Settings = {
  announce: false,
  keepScreenAwake: false,
  lang: "en-GB",
  voiceURI: "",
  showCues: true,
  showTags: true,
  surface: "hard",
  captureWeather: true,
  weatherUnits: "Metric",
};

function isGrid(v: unknown): v is string[][] {
  return Array.isArray(v) && v.length === 2 && v.every((row) => Array.isArray(row) && row.every((x) => typeof x === "string"));
}

function isLastSetup(v: unknown): v is LastSetup {
  if (!v || typeof v !== "object") return false;
  const o = v as Record<string, unknown>;
  return (
    (o.mode === "match" || o.mode === "game") &&
    !!o.format && typeof o.format === "object" &&
    isGrid(o.names) && isGrid(o.playerNotes) &&
    (o.firstServer === 0 || o.firstServer === 1) &&
    (o.startLeft === 0 || o.startLeft === 1) &&
    Array.isArray(o.order) && o.order.length === 2 &&
    typeof o.court === "string"
  );
}

function sanitize(parsed: Partial<Persisted>): Persisted {
  return {
    matches: Array.isArray(parsed.matches) ? parsed.matches : [],
    activeId: typeof parsed.activeId === "string" ? parsed.activeId : null,
    coach: Array.isArray(parsed.coach) ? parsed.coach : [],
    settings: {
      ...DEFAULT_SETTINGS,
      ...(parsed.settings ?? {}),
      keepScreenAwake: parsed.settings?.keepScreenAwake === true,
    },
    recentNames: Array.isArray(parsed.recentNames) ? parsed.recentNames : [],
    lastSetup: isLastSetup(parsed.lastSetup) ? parsed.lastSetup : null,
  };
}

function load(): Persisted {
  const empty: Persisted = { lastSetup: null, matches: [], activeId: null, coach: [], settings: DEFAULT_SETTINGS, recentNames: [] };
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return empty;
    return sanitize(JSON.parse(raw) as Partial<Persisted>);
  } catch {
    return empty;
  }
}

function newId(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }
}

function withEvents(m: Match, events: MatchEvent[]): Match {
  const s = replay({ ...m, events });
  const complete = s.winner !== null;
  return {
    ...m,
    events,
    updatedAt: Date.now(),
    status: complete ? "complete" : "live",
    endedAt: complete ? Date.now() : undefined,
  };
}

export const useMatchStore = create<MatchStore>((set, get) => {
  const mapActive = (fn: (m: Match) => Match) => {
    const { activeId, matches } = get();
    if (!activeId) return;
    set({ matches: matches.map((m) => (m.id === activeId ? fn(m) : m)) });
  };
  return {
    ...load(),
    startMatch: (input) => {
      const id = newId();
      const now = Date.now();
      const events: MatchEvent[] = [];
      const match: Match = {
        id,
        createdAt: now,
        updatedAt: now,
        status: "live",
        format: input.format,
        names: input.names,
        playerNotes: input.playerNotes,
        firstServer: input.firstServer,
        startLeft: input.startLeft,
        startOrder: input.order,
        events,
        court: input.court,
        location: input.location,
        weather: input.weather,
        notes: "",
      };
      const names = input.names.flat().map((n) => n.trim()).filter(Boolean);
      const recent = [...names, ...get().recentNames.filter((n) => !names.includes(n))].slice(0, 30);
      // Starting a new match suspends any match that was still live.
      const matches = get().matches.map((m) =>
        m.id === get().activeId && m.status === "live" ? { ...m, status: "suspended" as const } : m,
      );
      set({ matches: [match, ...matches], activeId: id, recentNames: recent });
      return id;
    },
    point: (w) => mapActive((m) => (m.status === "complete" ? m : withEvents(m, [...m.events, { k: "pt", w, t: Date.now() }]))),
    tagLast: (tag) =>
      mapActive((m) => {
        const events = [...m.events];
        for (let i = events.length - 1; i >= 0; i--) {
          const e = events[i];
          if (e.k === "pt") {
            events[i] = { ...e, tag };
            break;
          }
        }
        return { ...m, events, updatedAt: Date.now() };
      }),
    undo: () => mapActive((m) => (m.events.length === 0 ? m : withEvents(m, m.events.slice(0, -1)))),
    swapOrder: (team) => mapActive((m) => withEvents(m, [...m.events, { k: "swap", team, t: Date.now() }])),
    setFinalMode: (mode) => mapActive((m) => withEvents(m, [...m.events, { k: "final", mode, t: Date.now() }])),
    suspendActive: () => {
      mapActive((m) => (m.status === "live" ? { ...m, status: "suspended", updatedAt: Date.now() } : m));
      set({ activeId: null });
    },
    resume: (id) => {
      const { matches, activeId } = get();
      set({
        activeId: id,
        matches: matches.map((m) => {
          if (m.id === id && m.status !== "complete") return { ...m, status: "live" };
          if (m.id === activeId && m.status === "live") return { ...m, status: "suspended" };
          return m;
        }),
      });
    },
    closeActive: () => set({ activeId: null }),
    updateMatch: (id, patch) =>
      set({ matches: get().matches.map((m) => (m.id === id ? { ...m, ...patch, updatedAt: Date.now() } : m)) }),
    deleteMatches: (ids) => {
      const { matches, activeId } = get();
      set({
        matches: matches.filter((m) => !ids.includes(m.id)),
        activeId: activeId && ids.includes(activeId) ? null : activeId,
      });
    },
    saveLastSetup: (setup) => set({ lastSetup: setup }),
    clearLastSetup: () => set({ lastSetup: null }),
    setSettings: (patch) => set({ settings: { ...get().settings, ...patch } }),
    addCoachMatch: (court, names) =>
      set({ coach: [...get().coach, { id: newId(), court, names, sets: [[0, 0]], done: false }] }),
    updateCoach: (id, patch) => set({ coach: get().coach.map((c) => (c.id === id ? { ...c, ...patch } : c)) }),
    removeCoach: (id) => set({ coach: get().coach.filter((c) => c.id !== id) }),
    clearCoach: () => set({ coach: [] }),
    exportBackup: () => {
      const s = get();
      const data: Persisted = { matches: s.matches, activeId: s.activeId, coach: s.coach, settings: s.settings, recentNames: s.recentNames, lastSetup: s.lastSetup };
      return JSON.stringify({ app: "tennis-scorecard", version: 1, exportedAt: new Date().toISOString(), data }, null, 2);
    },
    importBackup: (text) => {
      let parsed: unknown;
      try {
        parsed = JSON.parse(text);
      } catch {
        throw new Error("That file is not a Tennis Scorecard backup.");
      }
      const box = parsed as { app?: unknown; data?: Partial<Persisted> };
      if (!box || box.app !== "tennis-scorecard" || !box.data || typeof box.data !== "object") {
        throw new Error("That file is not a Tennis Scorecard backup.");
      }
      const incoming = sanitize(box.data);
      const cur = get();
      const haveMatch = new Set(cur.matches.map((m) => m.id));
      const haveCoach = new Set(cur.coach.map((c) => c.id));
      const newMatches = incoming.matches.filter((m) => m && typeof m.id === "string" && Array.isArray(m.events) && !haveMatch.has(m.id));
      const newCoach = incoming.coach.filter((c) => c && typeof c.id === "string" && !haveCoach.has(c.id));
      set({
        matches: [...cur.matches, ...newMatches],
        coach: [...cur.coach, ...newCoach],
        settings: incoming.settings,
        lastSetup: incoming.lastSetup ?? cur.lastSetup,
        recentNames: Array.from(new Set([...cur.recentNames, ...incoming.recentNames])).slice(0, 50),
      });
      return { matches: newMatches.length, coach: newCoach.length };
    },
  };
});

useMatchStore.subscribe((s) => {
  try {
    const data: Persisted = {
      matches: s.matches,
      activeId: s.activeId,
      coach: s.coach,
      settings: s.settings,
      recentNames: s.recentNames,
      lastSetup: s.lastSetup,
    };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // Storage unavailable: keep the session in memory.
  }
});
