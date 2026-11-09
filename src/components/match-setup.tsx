import { useEffect, useId, useRef, useState } from "react";
import { ChevronDown, LocateFixed, Play, RotateCcw, Timer, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Court } from "@/components/court";
import { SetupWeather } from "@/components/match-weather";
import { usePinLocation } from "@/lib/use-pin-location";
import { useMatchStore } from "@/lib/match-store";
import type { MatchFormat, PresetId, Side, WeatherSnapshot } from "@/lib/tennis";
import { DEFAULT_FORMAT, PRESETS, durationText, formatSummary } from "@/lib/tennis";
import { cn } from "@/lib/utils";

type Mode = "match" | "game" | "warmup";

function Segmented<T extends string>({ label, value, onChange, options }: { label: string; value: T; onChange: (v: T) => void; options: { value: T; label: string }[] }) {
  return (
    <div className="space-y-1.5">
      <p className="text-sm font-medium" id={`seg-${label}`}>{label}</p>
      <ToggleGroup
        type="single"
        variant="outline"
        aria-labelledby={`seg-${label}`}
        value={value}
        onValueChange={(v) => v && onChange(v as T)}
        className="flex-wrap"
      >
        {options.map((o) => (
          <ToggleGroupItem key={o.value} value={o.value} className="h-auto min-h-9 whitespace-normal px-3 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">
            {o.label}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
    </div>
  );
}

function NumberSelect({ id, label, value, onChange, options }: { id: string; label: string; value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger id={id} className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((o) => (
            <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function padGrid(grid?: string[][]): string[][] {
  return [0, 1].map((t) => [0, 1].map((p) => grid?.[t]?.[p] ?? ""));
}

export function MatchSetup() {
  const uid = useId();
  const startMatch = useMatchStore((s) => s.startMatch);
  const recentNames = useMatchStore((s) => s.recentNames);
  const surface = useMatchStore((s) => s.settings.surface);
  const saveLastSetup = useMatchStore((s) => s.saveLastSetup);
  const clearLastSetup = useMatchStore((s) => s.clearLastSetup);
  // Prefill from the last match set up on this device (read once, when the setup opens).
  const [initial] = useState(() => useMatchStore.getState().lastSetup);
  const [mode, setMode] = useState<Mode>(initial?.mode ?? "match");
  const [format, setFormat] = useState<MatchFormat>(() => ({ ...DEFAULT_FORMAT, ...(initial?.format ?? {}) }));
  const [names, setNames] = useState<string[][]>(() => padGrid(initial?.names));
  const [notes, setNotes] = useState<string[][]>(() => padGrid(initial?.playerNotes));
  const [firstServer, setFirstServer] = useState<Side>(initial?.firstServer ?? 0);
  const [startLeft, setStartLeft] = useState<Side>(initial?.startLeft ?? 0);
  const [order, setOrder] = useState<[number[], number[]]>(initial?.order ?? [[0, 1], [0, 1]]);
  const [court, setCourt] = useState(initial?.court ?? "");
  const [location, setLocation] = useState<{ lat: number; lon: number } | undefined>(initial?.location);
  const [prefilled, setPrefilled] = useState(initial !== null);
  const [weather, setWeather] = useState<WeatherSnapshot | undefined>(undefined);
  const { status: locStatus, pin: pinLocation, reset: resetLocStatus } = usePinLocation(setLocation);
  const [customOpen, setCustomOpen] = useState(initial?.format?.preset === "custom");
  const [warmupStart, setWarmupStart] = useState<number | null>(null);
  const [now, setNow] = useState(Date.now());

  // Remember choices as they are made, so they survive even if the match is not started.
  const firstRun = useRef(true);
  useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false;
      return;
    }
    saveLastSetup({
      mode: mode === "game" ? "game" : "match",
      format,
      names: names.map((row) => row.map((x) => x.trim())),
      playerNotes: notes.map((row) => row.map((x) => x.trim())),
      firstServer,
      startLeft,
      order,
      court: court.trim(),
      location,
    });
  }, [mode, format, names, notes, firstServer, startLeft, order, court, location, saveLastSetup]);

  useEffect(() => {
    if (warmupStart === null) return;
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, [warmupStart]);

  const doubles = format.type === "doubles";
  const tName = (team: Side) => {
    const n = names[team].slice(0, doubles ? 2 : 1).map((x) => x.trim()).filter(Boolean);
    return n.length ? n.join(" / ") : team === 0 ? "Team A" : "Team B";
  };
  const pName = (team: Side, p: number) => names[team][p]?.trim() || `${team === 0 ? "A" : "B"}${p + 1}`;

  const applyPreset = (id: PresetId) => {
    if (id === "custom") {
      setFormat((f) => ({ ...f, preset: "custom" }));
      setCustomOpen(true);
      return;
    }
    const p = PRESETS[id];
    setFormat((f) => ({ ...DEFAULT_FORMAT, type: f.type, bestOf: id === "proSet" ? 1 : f.bestOf === 1 ? 3 : f.bestOf, ...p.format, preset: id }));
  };
  const patch = (p: Partial<MatchFormat>) => setFormat((f) => ({ ...f, ...p, preset: "custom" }));

  const setName = (team: number, p: number, v: string, which: "name" | "note") => {
    const setter = which === "name" ? setNames : setNotes;
    setter((prev) => prev.map((row, t) => (t === team ? row.map((x, i) => (i === p ? v : x)) : row)));
  };

  const resetToDefaults = () => {
    setMode("match");
    setFormat(DEFAULT_FORMAT);
    setNames(padGrid());
    setNotes(padGrid());
    setFirstServer(0);
    setStartLeft(0);
    setOrder([[0, 1], [0, 1]]);
    setCourt("");
    setLocation(undefined);
    resetLocStatus();
    setCustomOpen(false);
    clearLastSetup();
    setPrefilled(false);
  };

  const begin = () => {
    const playerCount = doubles ? 2 : 1;
    saveLastSetup({
      mode: mode === "game" ? "game" : "match",
      format,
      names: names.map((row) => row.map((x) => x.trim())),
      playerNotes: notes.map((row) => row.map((x) => x.trim())),
      firstServer,
      startLeft,
      order,
      court: court.trim(),
      location,
    });
    startMatch({
      format: { ...format, mode: mode === "game" ? "game" : "match" },
      names: names.map((row) => row.slice(0, playerCount).map((x) => x.trim())),
      playerNotes: notes.map((row) => row.slice(0, playerCount).map((x) => x.trim())),
      firstServer,
      startLeft,
      court: court.trim(),
      location,
      weather,
      order,
    });
    setWarmupStart(null);
  };

  const presetIds: PresetId[] = ["standard", "tiebreakFinal", "advantage", "proSet", "fast4", "custom"];
  const listId = `${uid}-names`;

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      <div className="space-y-6">
        {prefilled && (
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-muted/40 px-3 py-2 text-sm">
            <span>Using your last setup.</span>
            <Button type="button" variant="ghost" size="sm" onClick={resetToDefaults}>
              <RotateCcw aria-hidden="true" /> Reset to defaults
            </Button>
          </div>
        )}
        <Segmented<Mode>
          label="What are you scoring?"
          value={mode}
          onChange={setMode}
          options={[
            { value: "match", label: "Full match" },
            { value: "game", label: "Single game" },
            { value: "warmup", label: "Warmup" },
          ]}
        />

        {mode === "warmup" && (
          <div className="flex flex-wrap items-center gap-4 rounded-xl border bg-card p-4">
            <Timer className="size-6 text-muted-foreground" aria-hidden="true" />
            <p className="text-3xl font-semibold tabular-nums" aria-live="off">
              {warmupStart === null ? "0:00" : durationText(now - warmupStart)}
            </p>
            {warmupStart === null ? (
              <Button onClick={() => { setWarmupStart(Date.now()); setNow(Date.now()); }}>Start warmup</Button>
            ) : (
              <>
                <Button variant="outline" onClick={() => setWarmupStart(null)}>
                  <RotateCcw aria-hidden="true" /> Reset
                </Button>
                <Button onClick={() => setMode("match")}>Go to match setup</Button>
              </>
            )}
          </div>
        )}

        {mode !== "warmup" && (
          <>
            <Segmented
              label="Players"
              value={format.type}
              onChange={(v) => setFormat((f) => ({ ...f, type: v }))}
              options={[
                { value: "singles", label: "Singles" },
                { value: "doubles", label: "Doubles" },
              ]}
            />
            <datalist id={listId}>
              {recentNames.map((n) => (
                <option key={n} value={n} />
              ))}
            </datalist>
            <div className="grid gap-4 sm:grid-cols-2">
              {([0, 1] as Side[]).map((team) => (
                <fieldset key={team} className="space-y-3 rounded-xl border p-4">
                  <legend className="px-1 text-sm font-semibold">{team === 0 ? "Team A" : "Team B"}</legend>
                  {Array.from({ length: doubles ? 2 : 1 }).map((_, p) => (
                    <div key={p} className="space-y-1.5">
                      <Label htmlFor={`${uid}-n-${team}-${p}`}>{doubles ? `Player ${p + 1}` : "Name"}</Label>
                      <Input
                        id={`${uid}-n-${team}-${p}`}
                        list={listId}
                        autoComplete="off"
                        autoCorrect="off"
                        spellCheck={false}
                        value={names[team][p]}
                        onChange={(e) => setName(team, p, e.target.value, "name")}
                        placeholder={team === 0 ? "Inês" : "Duarte"}
                      />
                      <Input
                        aria-label={`Note for ${doubles ? `team ${team === 0 ? "A" : "B"} player ${p + 1}` : `team ${team === 0 ? "A" : "B"}`}`}
                        value={notes[team][p]}
                        onChange={(e) => setName(team, p, e.target.value, "note")}
                        placeholder="Note (club, ranking…)"
                        className="h-8 text-sm"
                      />
                    </div>
                  ))}
                </fieldset>
              ))}
            </div>

            {mode === "match" && (
              <fieldset className="space-y-3">
                <legend className="text-sm font-medium">Match format</legend>
                <div className="grid gap-2 sm:grid-cols-2" role="radiogroup" aria-label="Match format">
                  {presetIds.map((id) => {
                    const active = format.preset === id;
                    const label = id === "custom" ? "Custom" : PRESETS[id].label;
                    const summary = id === "custom" ? "Set every rule yourself" : PRESETS[id].summary;
                    return (
                      <button
                        key={id}
                        type="button"
                        role="radio"
                        aria-checked={active}
                        onClick={() => applyPreset(id)}
                        className={cn(
                          "rounded-lg border p-3 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                          active ? "border-primary bg-muted ring-1 ring-primary" : "hover:bg-accent",
                        )}
                      >
                        <span className="block text-sm font-semibold">{label}</span>
                        <span className="block text-xs text-muted-foreground">{summary}</span>
                      </button>
                    );
                  })}
                </div>
                {format.preset !== "proSet" && (
                  <Segmented
                    label="Sets"
                    value={String(format.bestOf)}
                    onChange={(v) => setFormat((f) => ({ ...f, bestOf: Number(v) as 1 | 3 | 5 }))}
                    options={[
                      { value: "1", label: "1 set" },
                      { value: "3", label: "Best of 3" },
                      { value: "5", label: "Best of 5" },
                    ]}
                  />
                )}
                <Collapsible open={customOpen} onOpenChange={setCustomOpen}>
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" size="sm" aria-expanded={customOpen}>
                      Rule details
                      <ChevronDown className={cn("transition-transform", customOpen && "rotate-180")} aria-hidden="true" />
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="mt-3 grid gap-4 rounded-xl border p-4 sm:grid-cols-2">
                    <NumberSelect id={`${uid}-gps`} label="Games to win a set" value={String(format.gamesPerSet)} onChange={(v) => patch({ gamesPerSet: Number(v) })} options={[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => ({ value: String(n), label: String(n) }))} />
                    <NumberSelect id={`${uid}-swb`} label="Set margin" value={String(format.setWinBy)} onChange={(v) => patch({ setWinBy: Number(v) as 1 | 2 })} options={[{ value: "2", label: "Win by 2 games" }, { value: "1", label: "Win by 1 game" }]} />
                    <NumberSelect id={`${uid}-tba`} label="Tiebreak at" value={format.tiebreakAt === null ? "none" : String(format.tiebreakAt)} onChange={(v) => patch({ tiebreakAt: v === "none" ? null : Number(v) })} options={[{ value: "none", label: "No tiebreak (advantage set)" }, ...[2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => ({ value: String(n), label: `${n}–${n}` }))]} />
                    <NumberSelect id={`${uid}-tbt`} label="Tiebreak game" value={`${format.tiebreakTo}-${format.tiebreakWinBy}`} onChange={(v) => { const [to, wb] = v.split("-").map(Number); patch({ tiebreakTo: to, tiebreakWinBy: wb as 1 | 2 }); }} options={[{ value: "7-2", label: "First to 7, win by 2" }, { value: "10-2", label: "First to 10, win by 2" }, { value: "5-1", label: "First to 5, sudden death" }, { value: "5-2", label: "First to 5, win by 2" }]} />
                    {format.bestOf > 1 && (
                      <NumberSelect id={`${uid}-fs`} label="Final set" value={format.finalSet} onChange={(v) => patch({ finalSet: v as MatchFormat["finalSet"] })} options={[{ value: "standard", label: "Same as other sets" }, { value: "matchTiebreak", label: "Match tiebreak" }, { value: "advantage", label: "Advantage (no tiebreak)" }]} />
                    )}
                    {format.bestOf > 1 && format.finalSet === "matchTiebreak" && (
                      <NumberSelect id={`${uid}-mtb`} label="Match tiebreak to" value={String(format.matchTiebreakTo)} onChange={(v) => patch({ matchTiebreakTo: Number(v) })} options={[{ value: "10", label: "10 points" }, { value: "7", label: "7 points" }]} />
                    )}
                  </CollapsibleContent>
                </Collapsible>
              </fieldset>
            )}

            <div className="flex items-center gap-3">
              <Switch id={`${uid}-noad`} checked={format.noAd} onCheckedChange={(v) => setFormat((f) => ({ ...f, noAd: v }))} />
              <Label htmlFor={`${uid}-noad`}>No-ad scoring (deciding point at deuce)</Label>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Segmented label="First to serve" value={String(firstServer)} onChange={(v) => setFirstServer(Number(v) as Side)} options={[{ value: "0", label: tName(0) }, { value: "1", label: tName(1) }]} />
              <Segmented label="Left end" value={String(startLeft)} onChange={(v) => setStartLeft(Number(v) as Side)} options={[{ value: "0", label: tName(0) }, { value: "1", label: tName(1) }]} />
            </div>
            {doubles && (
              <div className="grid gap-4 sm:grid-cols-2">
                {([0, 1] as Side[]).map((team) => (
                  <Segmented
                    key={team}
                    label={`${team === 0 ? "Team A" : "Team B"} serves first`}
                    value={String(order[team][0])}
                    onChange={(v) => setOrder((o) => { const n: [number[], number[]] = [[...o[0]], [...o[1]]]; n[team] = v === "0" ? [0, 1] : [1, 0]; return n; })}
                    options={[{ value: "0", label: pName(team, 0) }, { value: "1", label: pName(team, 1) }]}
                  />
                ))}
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor={`${uid}-court`}>Court or club</Label>
              <Input id={`${uid}-court`} value={court} onChange={(e) => setCourt(e.target.value)} placeholder="Clube de Ténis do Estoril, court 3" />
              <div className="flex flex-wrap items-center gap-2 pt-1" aria-live="polite">
                {location ? (
                  <>
                    <span className="flex items-center gap-1.5 text-sm"><LocateFixed className="size-4" aria-hidden="true" /> Court pinned to your current location</span>
                    <Button type="button" variant="ghost" size="sm" onClick={() => setLocation(undefined)}><X aria-hidden="true" /> Remove pin</Button>
                  </>
                ) : (
                  <Button type="button" variant="outline" size="sm" onClick={pinLocation} disabled={locStatus === "locating"}>
                    <LocateFixed aria-hidden="true" /> {locStatus === "locating" ? "Locating…" : "Pin my current location"}
                  </Button>
                )}
                {locStatus === "error" && <span className="text-sm text-destructive">Your location is not available. Allow location access for this app and try again.</span>}
              </div>
            </div>
            <SetupWeather court={court} location={location} onChange={setWeather} />
          </>
        )}
      </div>

      <div className="space-y-4 lg:sticky lg:top-20 lg:self-start">
        <Court
          surface={surface}
          doubles={doubles}
          leftTeam={startLeft}
          serverTeam={firstServer}
          serveSide="deuce"
          leftLabel={tName(startLeft)}
          rightLabel={tName(startLeft === 0 ? 1 : 0)}
          serverLabel={doubles ? pName(firstServer, order[firstServer][0]) : tName(firstServer)}
          receiverLabel={tName(firstServer === 0 ? 1 : 0)}
          leftSlot={<span className="absolute bottom-3 left-3 rounded-md bg-black/55 px-2 py-1 text-sm font-semibold text-white">{tName(startLeft)}</span>}
          rightSlot={<span className="absolute bottom-3 right-3 rounded-md bg-black/55 px-2 py-1 text-sm font-semibold text-white">{tName(startLeft === 0 ? 1 : 0)}</span>}
        />
        <p className="text-sm">{formatSummary({ ...format, mode: mode === "game" ? "game" : "match" })}</p>
        <Button size="lg" className="w-full" onClick={begin} disabled={mode === "warmup" && warmupStart === null}>
          <Play aria-hidden="true" />
          {mode === "game" ? "Start game" : mode === "warmup" ? "Start match from warmup" : "Start match"}
        </Button>
      </div>
    </div>
  );
}
