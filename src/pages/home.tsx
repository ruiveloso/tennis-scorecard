import { useEffect, useMemo, useRef } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { ArrowLeftRight, BarChart3, Megaphone, Monitor, Pause, Play, Plus, Share2, Undo2, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Court } from "@/components/court";
import { RecordWeatherButton, WeatherBadge } from "@/components/match-weather";
import { Scoreboard } from "@/components/scoreboard";
import { MatchStats } from "@/components/match-stats";
import { MatchSetup } from "@/components/match-setup";
import { useAppShortcut, useShortcutScope } from "@/components/shortcut-provider";
import { useConfirm } from "@/hooks/use-confirm";
import { useScreenWakeLock } from "@/hooks/use-screen-wake-lock";
import { useMatchStore } from "@/lib/match-store";
import { scoreCall, speak } from "@/lib/announcer";
import { matchSummaryText, shareText } from "@/lib/share";
import type { Cue, Match, PointTag, Pressure, Side } from "@/lib/tennis";
import { formatSummary, playerName, pointLabels, pressure, replay, setScoreText, teamName } from "@/lib/tennis";
import { cn } from "@/lib/utils";

const PRESSURE_LABEL: Record<Exclude<Pressure, null>, string> = {
  match: "Match point",
  set: "Set point",
  break: "Break point",
  game: "Game point",
};

const PRESSURE_TONE: Record<Exclude<Pressure, null>, string> = {
  match: "bg-red-700 text-white",
  set: "bg-amber-700 text-white",
  break: "bg-blue-700 text-white",
  game: "bg-zinc-700 text-white",
};

const TAGS: { value: PointTag; label: string }[] = [
  { value: "ace", label: "Ace" },
  { value: "doubleFault", label: "Double fault" },
  { value: "winner", label: "Winner" },
  { value: "error", label: "Error" },
];

function cueText(m: Match, c: Cue): string {
  switch (c.kind) {
    case "game":
      return c.broke ? `${teamName(m, c.side)} breaks serve` : `Game ${teamName(m, c.side)}`;
    case "set":
      return `Set ${teamName(m, c.side)}`;
    case "match":
      return `${teamName(m, c.side)} wins`;
    case "changeEnds":
      return "Change ends";
    case "tiebreak":
      return c.matchTiebreak ? "Match tiebreak" : "Tiebreak";
    case "decidingSet":
      return "Deciding set";
  }
}

function LiveMatch({ match }: { match: Match }) {
  const confirm = useConfirm();
  const settings = useMatchStore((s) => s.settings);
  const point = useMatchStore((s) => s.point);
  const undo = useMatchStore((s) => s.undo);
  const tagLast = useMatchStore((s) => s.tagLast);
  const swapOrder = useMatchStore((s) => s.swapOrder);
  const setFinalMode = useMatchStore((s) => s.setFinalMode);
  const suspendActive = useMatchStore((s) => s.suspendActive);
  const closeActive = useMatchStore((s) => s.closeActive);
  const state = useMemo(() => replay(match), [match]);
  const press = useMemo(() => pressure(match, state), [match, state]);
  const labels = pointLabels(state, match.format.noAd);
  const done = state.winner !== null;
  useScreenWakeLock(settings.keepScreenAwake && !done && match.status === "live");
  const doubles = match.format.type === "doubles";
  const lastPoint = state.log[state.log.length - 1];
  const lastEvent = match.events[match.events.length - 1];
  const lastIsPoint = lastEvent?.k === "pt";
  const currentSet = state.sets[state.sets.length - 1];
  const setStart = currentSet.games[0] === 0 && currentSet.games[1] === 0 && state.points[0] === 0 && state.points[1] === 0;

  const courtScope = useShortcutScope("court");
  const award = (side: Side) => {
    if (!done) point(side);
  };
  useAppShortcut("a", () => award(state.leftTeam), { scope: courtScope, description: "Point to left end" });
  useAppShortcut("l", () => award(state.leftTeam === 0 ? 1 : 0), { scope: courtScope, description: "Point to right end" });
  useAppShortcut("u", () => undo(), { scope: courtScope, description: "Undo last point" });

  const prevLen = useRef(match.events.length);
  useEffect(() => {
    if (match.events.length !== prevLen.current) {
      const grew = match.events.length > prevLen.current;
      prevLen.current = match.events.length;
      if (grew && settings.announce) speak(scoreCall(match, state, settings.lang), settings.lang, settings.voiceURI);
    }
  }, [match, state, settings.announce, settings.lang, settings.voiceURI]);

  const share = async () => {
    const r = await shareText(matchSummaryText(match, "game"), "Tennis score");
    if (r === "copied") toast.success("Score copied to clipboard");
    if (r === "failed") toast.error("Sharing is not available here");
  };
  const suspend = async () => {
    if (await confirm({ title: "Suspend this match?", description: "It stays in History and can be resumed.", confirmLabel: "Suspend" })) suspendActive();
  };

  const serverLabel = playerName(match, state.serverTeam, state.serverPlayer);
  const receiver: Side = state.serverTeam === 0 ? 1 : 0;
  const right: Side = state.leftTeam === 0 ? 1 : 0;
  const cues = settings.showCues ? state.lastCues.filter((c) => c.kind !== "game" || !state.lastCues.some((x) => x.kind === "set" || x.kind === "match")) : [];

  const half = (team: Side, align: "left" | "right") => (
    <button
      type="button"
      onClick={() => award(team)}
      disabled={done}
      aria-label={`Point to ${teamName(match, team)}${press[team] ? `, ${PRESSURE_LABEL[press[team]!]}` : ""}`}
      className={cn(
        "group absolute inset-0 flex flex-col justify-between p-3 text-white transition-colors sm:p-5",
        "hover:bg-white/10 active:bg-white/20 focus-visible:outline-4 focus-visible:-outline-offset-4 focus-visible:outline-yellow-300 disabled:cursor-default",
        align === "left" ? "items-start text-left" : "items-end text-right",
      )}
    >
      <span className="rounded-md bg-black/55 px-2 py-1 text-sm font-semibold sm:text-base">{teamName(match, team)}</span>
      {!done && (
        <span className="text-5xl font-bold tabular-nums drop-shadow-[0_2px_2px_rgba(0,0,0,0.7)] sm:text-7xl">{labels[team]}</span>
      )}
      <span className="flex min-h-7 items-center gap-2">
        {press[team] && <span className={cn("rounded-md px-2 py-0.5 text-sm font-semibold", PRESSURE_TONE[press[team]!])}>{PRESSURE_LABEL[press[team]!]}</span>}
        {!done && <kbd className="hidden rounded border border-white/60 bg-black/40 px-1.5 text-xs sm:inline">{align === "left" ? "A" : "L"}</kbd>}
      </span>
    </button>
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight">{`${teamName(match, 0)} vs ${teamName(match, 1)}`}</h1>
          <p className="text-sm text-muted-foreground">{[formatSummary(match.format), match.court].filter(Boolean).join(" · ")}</p>
          {match.weather ? (
            <WeatherBadge weather={match.weather} className="mt-1 text-sm" />
          ) : match.status !== "complete" && settings.captureWeather ? (
            <div className="mt-1"><RecordWeatherButton match={match} /></div>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="sm"><BarChart3 aria-hidden="true" /> Statistics</Button>
            </SheetTrigger>
            <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
              <SheetHeader>
                <SheetTitle>Statistics</SheetTitle>
              </SheetHeader>
              <div className="px-4 pb-6"><MatchStats match={match} state={state} /></div>
            </SheetContent>
          </Sheet>
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm"><Monitor aria-hidden="true" /> Big scoreboard</Button>
            </DialogTrigger>
            <DialogContent className="flex h-[100dvh] w-screen max-w-none flex-col justify-center gap-8 rounded-none bg-zinc-950 p-6 text-white sm:max-w-none md:p-16">
              <DialogTitle className="text-xl text-zinc-300">{match.court || "Scoreboard"}</DialogTitle>
              <Scoreboard match={match} state={state} size="xl" />
              {cues.length > 0 && <p className="text-2xl text-yellow-300 md:text-4xl">{cues.map((c) => cueText(match, c)).join(" · ")}</p>}
            </DialogContent>
          </Dialog>
          <Button variant="outline" size="sm" onClick={share}><Share2 aria-hidden="true" /> Share</Button>
          {settings.announce && (
            <Button variant="outline" size="sm" onClick={() => speak(scoreCall(match, state, settings.lang), settings.lang, settings.voiceURI)}>
              <Megaphone aria-hidden="true" /> Announce score
            </Button>
          )}
          {done ? (
            <Button size="sm" onClick={closeActive}><Plus aria-hidden="true" /> New match</Button>
          ) : (
            <Button variant="outline" size="sm" onClick={suspend}><Pause aria-hidden="true" /> Suspend</Button>
          )}
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-4" {...courtScope.bindings}>
          {done && state.winner !== null && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-green-700 bg-card p-4">
              <p className="text-lg font-semibold">
                {`${teamName(match, state.winner)} won ${match.format.mode === "game" ? "the game" : state.sets.map(setScoreText).join(", ")}`}
              </p>
              <Button asChild variant="outline" size="sm"><Link to="/history">Open history</Link></Button>
            </div>
          )}
          {state.decidingChoiceOpen && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card p-4">
              <p className="font-medium">{`Deciding set: ${state.finalMode === "matchTiebreak" ? `${match.format.matchTiebreakTo}-point match tiebreak` : "full set"}`}</p>
              <Button size="sm" variant="outline" onClick={() => setFinalMode(state.finalMode === "matchTiebreak" ? "standard" : "matchTiebreak")}>
                {state.finalMode === "matchTiebreak" ? "Play a full set instead" : "Play a match tiebreak instead"}
              </Button>
            </div>
          )}
          <Court
            surface={settings.surface}
            doubles={doubles}
            leftTeam={state.leftTeam}
            serverTeam={state.serverTeam}
            serveSide={state.serveSide}
            leftLabel={teamName(match, state.leftTeam)}
            rightLabel={teamName(match, right)}
            serverLabel={serverLabel}
            receiverLabel={teamName(match, receiver)}
            leftSlot={half(state.leftTeam, "left")}
            rightSlot={half(right, "right")}
          />
          <div aria-live="polite" className="flex min-h-9 flex-wrap items-center gap-2">
            {!done && (
              <Badge className="h-auto whitespace-normal bg-lime-800 py-1 text-sm text-white">
                {`${serverLabel} serving · ${state.serveSide === "deuce" ? "deuce side" : "ad side"}`}
              </Badge>
            )}
            {state.decidingPoint && <Badge className="h-auto whitespace-normal bg-amber-700 py-1 text-sm text-white">Deciding point · receiver picks side</Badge>}
            {cues.map((c, i) => (
              <Badge key={i} className={cn("h-auto whitespace-normal py-1 text-sm text-white", c.kind === "changeEnds" ? "bg-blue-700" : "bg-zinc-700")}>
                {c.kind === "changeEnds" && <ArrowLeftRight aria-hidden="true" />}
                {cueText(match, c)}
              </Badge>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="outline" onClick={undo} disabled={match.events.length === 0}>
              <Undo2 aria-hidden="true" /> Undo <kbd className="ml-1 rounded border px-1 text-xs">U</kbd>
            </Button>
            {settings.showTags && lastPoint && lastIsPoint && (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm text-muted-foreground" id="tag-label">{`Last point (${teamName(match, lastPoint.w)})`}</span>
                <ToggleGroup type="single" variant="outline" size="sm" aria-labelledby="tag-label" value={lastPoint.tag ?? ""} onValueChange={(v) => tagLast((v || undefined) as PointTag | undefined)}>
                  {TAGS.map((t) => (
                    <ToggleGroupItem key={t.value} value={t.value} className="px-2.5 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">{t.label}</ToggleGroupItem>
                  ))}
                </ToggleGroup>
              </div>
            )}
          </div>
        </div>

        <aside className="space-y-4" aria-label="Match details">
          <div className="rounded-xl border bg-card p-4">
            <Scoreboard match={match} state={state} />
          </div>
          {doubles && !done && (
            <div className="space-y-2 rounded-xl border bg-card p-4">
              <h2 className="flex items-center gap-2 font-semibold"><Users className="size-4" aria-hidden="true" /> Service order</h2>
              <ol className="space-y-1 text-sm">
                {[0, 1, 2, 3].map((i) => {
                  const idx = state.gamesPlayed + i;
                  const team = ((match.firstServer + idx) % 2) as Side;
                  const p = state.order[team][Math.floor(idx / 2) % 2];
                  return <li key={i}>{`${i === 0 ? "This game" : `Game +${i}`}: ${playerName(match, team, p)}`}</li>;
                })}
              </ol>
              {setStart && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {([0, 1] as Side[]).map((t) => (
                    <Button key={t} size="sm" variant="outline" onClick={() => swapOrder(t)}>{`Swap ${teamName(match, t)}`}</Button>
                  ))}
                </div>
              )}
            </div>
          )}
          {match.names.some((row, t) => row.some((_, p) => match.playerNotes[t]?.[p])) && (
            <div className="space-y-1 rounded-xl border bg-card p-4 text-sm">
              <h2 className="font-semibold">Player notes</h2>
              {match.names.flatMap((row, t) =>
                row.map((_, p) =>
                  match.playerNotes[t]?.[p] ? <p key={`${t}-${p}`}><span className="font-medium">{playerName(match, t as Side, p)}:</span> {match.playerNotes[t][p]}</p> : null,
                ),
              )}
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

export function HomePage() {
  const matches = useMatchStore((s) => s.matches);
  const activeId = useMatchStore((s) => s.activeId);
  const resume = useMatchStore((s) => s.resume);
  const active = matches.find((m) => m.id === activeId);
  const suspended = matches.filter((m) => m.status === "suspended").slice(0, 4);

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6">
      {active ? (
        <LiveMatch key={active.id} match={active} />
      ) : (
        <div className="space-y-6">
          <h1 className="text-2xl font-semibold tracking-tight">New match</h1>
          {suspended.length > 0 && (
            <div className="space-y-2">
              <h2 className="text-sm font-semibold">Suspended matches</h2>
              <ul className="flex flex-wrap gap-2">
                {suspended.map((m) => {
                  const s = replay(m);
                  return (
                    <li key={m.id}>
                      <Button variant="outline" className="h-auto whitespace-normal py-2 text-left" onClick={() => resume(m.id)}>
                        <Play aria-hidden="true" />
                        <span>
                          <span className="block font-medium">{`${teamName(m, 0)} vs ${teamName(m, 1)}`}</span>
                          <span className="block text-xs text-muted-foreground">{s.sets.filter((x) => x.games[0] + x.games[1] > 0 || x.tb).map(setScoreText).join(", ") || "No games yet"}</span>
                        </span>
                      </Button>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
          <MatchSetup />
        </div>
      )}
    </div>
  );
}
