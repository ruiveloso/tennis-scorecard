import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { History as HistoryIcon, List, LocateFixed, Map as MapIcon, MapPin, Play, Search, Share2, Trash2, X } from "lucide-react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { CourtMap } from "@/components/court-map";
import { usePinLocation } from "@/lib/use-pin-location";
import { RecordWeatherButton, WeatherBadge, WeatherDetails } from "@/components/match-weather";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { EmptyState } from "@/components/states";
import { Scoreboard } from "@/components/scoreboard";
import { MatchStats } from "@/components/match-stats";
import { useConfirm } from "@/hooks/use-confirm";
import { useMatchStore } from "@/lib/match-store";
import { matchSummaryText, multiSummaryText, shareText } from "@/lib/share";
import type { Match, Side } from "@/lib/tennis";
import { durationText, formatSummary, matchDuration, playerName, replay, setScoreText, teamName } from "@/lib/tennis";
import { cn } from "@/lib/utils";

const STATUS: Record<Match["status"], { label: string; tone: string }> = {
  complete: { label: "Complete", tone: "bg-green-700 text-white" },
  suspended: { label: "Suspended", tone: "bg-amber-700 text-white" },
  live: { label: "In progress", tone: "bg-blue-700 text-white" },
};

function PinCourt({ match }: { match: Match }) {
  const updateMatch = useMatchStore((s) => s.updateMatch);
  const { status, pin } = usePinLocation((location) => updateMatch(match.id, { location }));
  return (
    <div className="flex flex-wrap items-center gap-2 pt-1" aria-live="polite">
      {match.location ? (
        <>
          <span className="flex items-center gap-1.5 text-sm"><LocateFixed className="size-4" aria-hidden="true" /> Pinned on the courts map</span>
          <Button type="button" variant="ghost" size="sm" onClick={() => updateMatch(match.id, { location: undefined })}><X aria-hidden="true" /> Remove pin</Button>
        </>
      ) : (
        <Button type="button" variant="outline" size="sm" onClick={pin} disabled={status === "locating"}>
          <LocateFixed aria-hidden="true" /> {status === "locating" ? "Locating…" : "Pin my current location"}
        </Button>
      )}
      {status === "error" && <span className="text-sm text-destructive">Your location is not available. Allow location access for this app and try again.</span>}
    </div>
  );
}

function MatchDetail({ match, onClose }: { match: Match; onClose: () => void }) {
  const confirm = useConfirm();
  const navigate = useNavigate();
  const updateMatch = useMatchStore((s) => s.updateMatch);
  const deleteMatches = useMatchStore((s) => s.deleteMatches);
  const resume = useMatchStore((s) => s.resume);
  const state = useMemo(() => replay(match), [match]);
  const doubles = match.format.type === "doubles";

  return (
    <div className="space-y-6 px-4 pb-8">
      <p className="text-sm text-muted-foreground">
        {[new Date(match.createdAt).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }), durationText(matchDuration(match)), formatSummary(match.format)].join(" · ")}
      </p>
      <div className="rounded-xl border bg-card p-4">
        <Scoreboard match={match} state={state} />
      </div>
      <div className="flex flex-wrap gap-2">
        {match.status !== "complete" && (
          <Button size="sm" onClick={() => { resume(match.id); navigate("/"); }}>
            <Play aria-hidden="true" /> Resume
          </Button>
        )}
        <Button size="sm" variant="outline" onClick={async () => {
          const r = await shareText(matchSummaryText(match, "history"), "Tennis match");
          if (r === "copied") toast.success("Summary copied to clipboard");
          if (r === "failed") toast.error("Sharing is not available here");
        }}>
          <Share2 aria-hidden="true" /> Share
        </Button>
        <Button size="sm" variant="outline" onClick={async () => {
          if (await confirm({ title: "Delete this match?", description: "This cannot be undone.", confirmLabel: "Delete", destructive: true })) {
            deleteMatches([match.id]);
            onClose();
          }
        }}>
          <Trash2 aria-hidden="true" /> Delete
        </Button>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="d-court">Court or club</Label>
          <Input id="d-court" value={match.court} onChange={(e) => updateMatch(match.id, { court: e.target.value })} />
          <PinCourt match={match} />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <p className="text-sm font-medium">Weather</p>
          {match.weather ? (
            <WeatherDetails weather={match.weather} />
          ) : match.status !== "complete" ? (
            <RecordWeatherButton match={match} />
          ) : (
            <p className="text-sm text-muted-foreground">No weather was recorded for this match.</p>
          )}
        </div>
        {([0, 1] as Side[]).map((t) =>
          match.names[t].map((_, p) => (
            <div key={`${t}-${p}`} className="space-y-1.5">
              <Label htmlFor={`d-pn-${t}-${p}`}>{`Note for ${playerName(match, t, p)}`}</Label>
              <Input
                id={`d-pn-${t}-${p}`}
                value={match.playerNotes[t]?.[p] ?? ""}
                onChange={(e) => {
                  const next = match.names.map((row, ti) => row.map((__, pi) => (ti === t && pi === p ? e.target.value : match.playerNotes[ti]?.[pi] ?? "")));
                  updateMatch(match.id, { playerNotes: next });
                }}
              />
            </div>
          )),
        )}
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="d-notes">Match notes</Label>
          <Textarea id="d-notes" rows={3} value={match.notes} onChange={(e) => updateMatch(match.id, { notes: e.target.value })} />
        </div>
      </div>
      {doubles && <p className="text-sm">{`Doubles · first server ${playerName(match, match.firstServer, match.startOrder?.[match.firstServer]?.[0] ?? 0)}`}</p>}
      <section className="space-y-3" aria-labelledby="d-stats">
        <h2 id="d-stats" className="text-lg font-semibold">Statistics</h2>
        <MatchStats match={match} state={state} />
      </section>
    </div>
  );
}

export function HistoryPage() {
  const confirm = useConfirm();
  const matches = useMatchStore((s) => s.matches);
  const deleteMatches = useMatchStore((s) => s.deleteMatches);
  const [query, setQuery] = useState("");
  const [court, setCourt] = useState<string | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);
  const [view, setView] = useState<"list" | "map">("list");

  const courts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const m of matches) {
      const c = m.court.trim();
      if (c) counts.set(c, (counts.get(c) ?? 0) + 1);
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1]);
  }, [matches]);

  const visible = matches.filter((m) => {
    const q = query.trim().toLowerCase();
    const names = m.names.flat().join(" ").toLowerCase();
    return (!q || names.includes(q) || m.court.toLowerCase().includes(q)) && (court === null || m.court.trim() === court);
  });
  const open = matches.find((m) => m.id === openId) ?? null;
  const allSelected = visible.length > 0 && visible.every((m) => selected.includes(m.id));
  const chosen = matches.filter((m) => selected.includes(m.id));

  const toggle = (id: string, on: boolean) => setSelected((s) => (on ? [...s, id] : s.filter((x) => x !== id)));

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 px-4 py-6 sm:px-6">
      <h1 className="text-2xl font-semibold tracking-tight">Match history</h1>
      {matches.length === 0 ? (
        <EmptyState icon={HistoryIcon} title="No matches yet" description="Matches you score are kept here." />
      ) : (
        <>
          <div className="flex flex-wrap items-end gap-3">
            <div className="relative min-w-56 flex-1">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
              <Input aria-label="Search players or courts" placeholder="Search players or courts" value={query} onChange={(e) => setQuery(e.target.value)} className="pl-8" />
            </div>
            <ToggleGroup type="single" variant="outline" aria-label="View" value={view} onValueChange={(v) => v && setView(v as "list" | "map")}>
              <ToggleGroupItem value="list" className="px-3 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"><List aria-hidden="true" /> List</ToggleGroupItem>
              <ToggleGroupItem value="map" className="px-3 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"><MapIcon aria-hidden="true" /> Map</ToggleGroupItem>
            </ToggleGroup>
            {chosen.length > 0 && (
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" onClick={async () => {
                  const r = await shareText(multiSummaryText(chosen), "Tennis matches");
                  if (r === "copied") toast.success(`${chosen.length} matches copied to clipboard`);
                  if (r === "failed") toast.error("Sharing is not available here");
                }}>
                  <Share2 aria-hidden="true" /> {`Share ${chosen.length}`}
                </Button>
                <Button variant="outline" size="sm" onClick={async () => {
                  if (await confirm({ title: `Delete ${chosen.length} matches?`, description: "This cannot be undone.", confirmLabel: "Delete", destructive: true })) {
                    deleteMatches(chosen.map((m) => m.id));
                    setSelected([]);
                  }
                }}>
                  <Trash2 aria-hidden="true" /> {`Delete ${chosen.length}`}
                </Button>
              </div>
            )}
          </div>

          {courts.length > 0 && (
            <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Filter by court">
              <MapPin className="size-4 text-muted-foreground" aria-hidden="true" />
              <Button size="sm" variant={court === null ? "default" : "outline"} aria-pressed={court === null} onClick={() => setCourt(null)}>All courts</Button>
              {courts.map(([c, n]) => (
                <Button key={c} size="sm" variant={court === c ? "default" : "outline"} aria-pressed={court === c} onClick={() => setCourt(court === c ? null : c)} className="h-auto min-h-8 whitespace-normal">
                  {`${c} (${n})`}
                </Button>
              ))}
            </div>
          )}

          {view === "map" ? (
            <CourtMap matches={visible} onOpen={setOpenId} />
          ) : (
            <>
          <div className="flex items-center gap-2 text-sm">
            <Checkbox id="sel-all" checked={allSelected} onCheckedChange={(v) => setSelected(v ? visible.map((m) => m.id) : [])} />
            <Label htmlFor="sel-all">{`Select all (${visible.length})`}</Label>
          </div>

          <ul className="divide-y rounded-xl border bg-card">
            {visible.map((m) => {
              const s = replay(m);
              const st = STATUS[m.status];
              const score = m.format.mode === "game" ? "Single game" : s.sets.filter((x) => x.winner !== undefined || x.games[0] + x.games[1] > 0 || x.tb).map(setScoreText).join(", ") || "No games";
              return (
                <li key={m.id} className="flex items-start gap-3 p-4">
                  <Checkbox className="mt-1" checked={selected.includes(m.id)} onCheckedChange={(v) => toggle(m.id, v === true)} aria-label={`Select ${teamName(m, 0)} vs ${teamName(m, 1)}`} />
                  <button type="button" className="min-w-0 flex-1 rounded-md text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring" onClick={() => setOpenId(m.id)}>
                    <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span className={cn(s.winner === 0 ? "font-semibold" : "")}>{teamName(m, 0)}</span>
                      <span className="text-muted-foreground">vs</span>
                      <span className={cn(s.winner === 1 ? "font-semibold" : "")}>{teamName(m, 1)}</span>
                      <span className={cn("rounded-md px-1.5 text-xs font-medium", st.tone)}>{st.label}</span>
                    </span>
                    <span className="mt-1 block font-mono text-sm tabular-nums">{score}</span>
                    <span className="mt-1 flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
                      <span>{[new Date(m.createdAt).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" }), m.court, durationText(matchDuration(m))].filter(Boolean).join(" · ")}</span>
                      {m.weather && <WeatherBadge weather={m.weather} className="[&_svg]:size-3.5" />}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
            </>
          )}
          {visible.length === 0 && <p className="text-sm text-muted-foreground">No matches match this filter.</p>}
        </>
      )}

      <Sheet open={open !== null} onOpenChange={(o) => !o && setOpenId(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
          {open && (
            <>
              <SheetHeader>
                <SheetTitle>{`${teamName(open, 0)} vs ${teamName(open, 1)}`}</SheetTitle>
              </SheetHeader>
              <MatchDetail match={open} onClose={() => setOpenId(null)} />
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
