// Pure tennis scoring engine. A match is a list of events; every view of the
// match (score, server, ends, statistics) is derived by replaying that list, so
// undo is simply "drop the last event".

export type Side = 0 | 1;
export type PointTag = "ace" | "doubleFault" | "winner" | "error";
export type FinalSetMode = "standard" | "matchTiebreak" | "advantage";
export type PresetId = "standard" | "tiebreakFinal" | "proSet" | "fast4" | "advantage" | "custom";

export interface MatchFormat {
  mode: "match" | "game";
  type: "singles" | "doubles";
  bestOf: 1 | 3 | 5;
  gamesPerSet: number;
  setWinBy: 1 | 2;
  /** Games-all score at which a tiebreak is played; null = advantage sets. */
  tiebreakAt: number | null;
  tiebreakTo: number;
  tiebreakWinBy: 1 | 2;
  finalSet: FinalSetMode;
  matchTiebreakTo: number;
  noAd: boolean;
  preset: PresetId;
}

export type MatchEvent =
  | { k: "pt"; w: Side; t: number; tag?: PointTag }
  | { k: "swap"; team: Side; t: number }
  | { k: "final"; mode: "standard" | "matchTiebreak"; t: number };

export interface Match {
  id: string;
  createdAt: number;
  updatedAt: number;
  endedAt?: number;
  status: "live" | "complete" | "suspended";
  format: MatchFormat;
  /** names[team][player] — one player per team in singles, two in doubles. */
  names: string[][];
  playerNotes: string[][];
  firstServer: Side;
  /** Team on the left end of the court diagram at the start. */
  startLeft: Side;
  /** Doubles: which player of each team serves that team's first service game. */
  startOrder?: [number[], number[]];
  events: MatchEvent[];
  court: string;
  /** Device position captured when the match was set up (never from a connector). */
  location?: { lat: number; lon: number };
  /** Conditions captured near the start of play. */
  weather?: WeatherSnapshot;
  notes: string;
}

export interface WeatherSnapshot {
  temp: number;
  feels?: number;
  caption: string;
  wind?: number;
  humidity?: number;
  uv?: number;
  tempUnit: string;
  speedUnit: string;
  /** The place the user asked about (court name or "pinned court"). */
  place: string;
  capturedAt: number;
}

export const PRESETS: Record<Exclude<PresetId, "custom">, { label: string; summary: string; format: Partial<MatchFormat> }> = {
  standard: {
    label: "Standard",
    summary: "Sets to 6, tiebreak at 6–6 in every set",
    format: { gamesPerSet: 6, setWinBy: 2, tiebreakAt: 6, tiebreakTo: 7, tiebreakWinBy: 2, finalSet: "standard" },
  },
  tiebreakFinal: {
    label: "Match tiebreak",
    summary: "Sets to 6, deciding set played as a 10-point tiebreak",
    format: { gamesPerSet: 6, setWinBy: 2, tiebreakAt: 6, tiebreakTo: 7, tiebreakWinBy: 2, finalSet: "matchTiebreak", matchTiebreakTo: 10 },
  },
  advantage: {
    label: "Advantage final set",
    summary: "Tiebreaks at 6–6, final set won by two clear games",
    format: { gamesPerSet: 6, setWinBy: 2, tiebreakAt: 6, tiebreakTo: 7, tiebreakWinBy: 2, finalSet: "advantage" },
  },
  proSet: {
    label: "Pro set",
    summary: "One set to 8 games, tiebreak at 8–8",
    format: { bestOf: 1, gamesPerSet: 8, setWinBy: 2, tiebreakAt: 8, tiebreakTo: 7, tiebreakWinBy: 2, finalSet: "standard" },
  },
  fast4: {
    label: "Fast4",
    summary: "Sets to 4, tiebreak to 5 at 3–3, no-ad games",
    format: { gamesPerSet: 4, setWinBy: 2, tiebreakAt: 3, tiebreakTo: 5, tiebreakWinBy: 1, finalSet: "standard", noAd: true },
  },
};

export const DEFAULT_FORMAT: MatchFormat = {
  mode: "match",
  type: "singles",
  bestOf: 3,
  gamesPerSet: 6,
  setWinBy: 2,
  tiebreakAt: 6,
  tiebreakTo: 7,
  tiebreakWinBy: 2,
  finalSet: "standard",
  matchTiebreakTo: 10,
  noAd: false,
  preset: "standard",
};

export interface SetScore {
  games: [number, number];
  /** Tiebreak points when the set was decided (or is being decided) by a tiebreak. */
  tb?: [number, number];
  winner?: Side;
  matchTiebreak?: boolean;
}

export interface PointRecord {
  index: number;
  w: Side;
  t: number;
  tag?: PointTag;
  serverTeam: Side;
  serverPlayer: number;
  setIndex: number;
  tiebreak: boolean;
  breakPoint: boolean;
  gameEnded: boolean;
  setEnded: boolean;
}

export type Cue =
  | { kind: "game"; side: Side; broke: boolean }
  | { kind: "set"; side: Side }
  | { kind: "match"; side: Side }
  | { kind: "changeEnds" }
  | { kind: "tiebreak"; matchTiebreak: boolean }
  | { kind: "decidingSet" };

export interface GameKind {
  tiebreak: boolean;
  matchTiebreak: boolean;
  to: number;
  winBy: number;
}

export interface MatchState {
  sets: SetScore[];
  setsWon: [number, number];
  points: [number, number];
  game: GameKind;
  winner: Side | null;
  serverTeam: Side;
  serverPlayer: number;
  serveSide: "deuce" | "ad";
  leftTeam: Side;
  gamesPlayed: number;
  order: [number[], number[]];
  finalMode: FinalSetMode;
  deciding: boolean;
  /** True at the very start of a deciding set whose format may still be switched. */
  decidingChoiceOpen: boolean;
  log: PointRecord[];
  lastCues: Cue[];
  /** True when the next point in a no-ad game is a deciding point. */
  decidingPoint: boolean;
}

const other = (s: Side): Side => (s === 0 ? 1 : 0);

function isDecidingSet(f: MatchFormat, setsWon: [number, number]): boolean {
  if (f.mode === "game" || f.bestOf === 1) return false;
  const need = Math.ceil(f.bestOf / 2);
  return setsWon[0] === need - 1 && setsWon[1] === need - 1;
}

function gameKind(f: MatchFormat, set: SetScore, deciding: boolean, finalMode: FinalSetMode): GameKind {
  if (f.mode === "game") return { tiebreak: false, matchTiebreak: false, to: 4, winBy: f.noAd ? 1 : 2 };
  if (deciding && finalMode === "matchTiebreak") {
    return { tiebreak: true, matchTiebreak: true, to: f.matchTiebreakTo, winBy: 2 };
  }
  const tbAt = deciding && finalMode === "advantage" ? null : f.tiebreakAt;
  if (tbAt !== null && set.games[0] === tbAt && set.games[1] === tbAt) {
    return { tiebreak: true, matchTiebreak: false, to: f.tiebreakTo, winBy: f.tiebreakWinBy };
  }
  return { tiebreak: false, matchTiebreak: false, to: 4, winBy: f.noAd ? 1 : 2 };
}

function gameWon(points: [number, number], kind: GameKind): Side | null {
  for (const s of [0, 1] as Side[]) {
    const a = points[s];
    const b = points[other(s)];
    if (a >= kind.to && a - b >= kind.winBy) return s;
  }
  return null;
}

function setWon(f: MatchFormat, games: [number, number]): Side | null {
  for (const s of [0, 1] as Side[]) {
    const a = games[s];
    const b = games[other(s)];
    if (a >= f.gamesPerSet && a - b >= f.setWinBy) return s;
  }
  return null;
}

function serverAt(firstServer: Side, order: [number[], number[]], idx: number, doubles: boolean) {
  const team = ((firstServer + idx) % 2) as Side;
  const turn = Math.floor(idx / 2);
  const player = doubles ? order[team][turn % 2] : 0;
  return { team, player };
}

export function replay(m: Pick<Match, "format" | "firstServer" | "startLeft" | "events" | "startOrder">): MatchState {
  const f = m.format;
  const doubles = f.type === "doubles";
  const sets: SetScore[] = [{ games: [0, 0] }];
  const setsWon: [number, number] = [0, 0];
  let score: [number, number] = [0, 0];
  let winner: Side | null = null;
  let gamesPlayed = 0;
  let leftTeam: Side = m.startLeft;
  const order: [number[], number[]] = [
    [...(m.startOrder?.[0] ?? [0, 1])],
    [...(m.startOrder?.[1] ?? [0, 1])],
  ];
  let finalMode: FinalSetMode = f.finalSet;
  const log: PointRecord[] = [];
  let lastCues: Cue[] = [];

  const current = () => sets[sets.length - 1];
  const deciding = () => isDecidingSet(f, setsWon);
  const kindNow = () => gameKind(f, current(), deciding(), finalMode);

  for (const entry of m.events) {
    if (winner !== null) break;
    if (entry.k === "swap") {
      order[entry.team] = [order[entry.team][1], order[entry.team][0]];
      lastCues = [];
      continue;
    }
    if (entry.k === "final") {
      finalMode = entry.mode;
      lastCues = entry.mode === "matchTiebreak" ? [{ kind: "tiebreak", matchTiebreak: true }] : [];
      continue;
    }
    const cues: Cue[] = [];
    const kind = kindNow();
    const k = score[0] + score[1];
    const idx = kind.tiebreak ? gamesPlayed + Math.floor((k + 1) / 2) : gamesPlayed;
    const srv = serverAt(m.firstServer, order, idx, doubles);
    const receiver = other(srv.team);
    // Break point: the receiver wins the game with this point (regular games only).
    let breakPoint = false;
    if (!kind.tiebreak) {
      const test: [number, number] = [score[0], score[1]];
      test[receiver] += 1;
      breakPoint = gameWon(test, kind) === receiver;
    }
    score = entry.w === 0 ? [score[0] + 1, score[1]] : [score[0], score[1] + 1];
    if (kind.tiebreak) current().tb = [score[0], score[1]];
    const rec: PointRecord = {
      index: log.length,
      w: entry.w,
      t: entry.t,
      tag: entry.tag,
      serverTeam: srv.team,
      serverPlayer: srv.player,
      setIndex: sets.length - 1,
      tiebreak: kind.tiebreak,
      breakPoint,
      gameEnded: false,
      setEnded: false,
    };
    log.push(rec);

    const gw = gameWon(score, kind);
    if (gw === null) {
      if (kind.tiebreak && (score[0] + score[1]) % 6 === 0) {
        leftTeam = other(leftTeam);
        cues.push({ kind: "changeEnds" });
      }
      lastCues = cues;
      continue;
    }

    // Game finished.
    rec.gameEnded = true;
    if (f.mode === "game") {
      winner = gw;
      cues.push({ kind: "match", side: gw });
      lastCues = cues;
      break;
    }
    const gameServer = serverAt(m.firstServer, order, gamesPlayed, doubles).team;
    gamesPlayed += 1;
    score = [0, 0];
    const set = current();
    set.games = [set.games[0], set.games[1]];
    set.games[gw] += 1;
    cues.push({ kind: "game", side: gw, broke: !kind.tiebreak && gw !== gameServer });

    const sw = kind.tiebreak ? gw : setWon(f, set.games);
    const setGameTotal = set.games[0] + set.games[1];
    if (sw !== null) {
      rec.setEnded = true;
      set.winner = sw;
      if (kind.matchTiebreak) set.matchTiebreak = true;
      setsWon[sw] += 1;
      const need = Math.ceil(f.bestOf / 2);
      if (setsWon[sw] >= need) {
        winner = sw;
        cues.push({ kind: "match", side: sw });
        lastCues = cues;
        break;
      }
      cues.push({ kind: "set", side: sw });
      if (setGameTotal % 2 === 1) {
        leftTeam = other(leftTeam);
        cues.push({ kind: "changeEnds" });
      }
      sets.push({ games: [0, 0] });
      if (deciding()) {
        cues.push({ kind: "decidingSet" });
        if (finalMode === "matchTiebreak") cues.push({ kind: "tiebreak", matchTiebreak: true });
      }
    } else {
      if (setGameTotal % 2 === 1) {
        leftTeam = other(leftTeam);
        cues.push({ kind: "changeEnds" });
      }
      if (kindNow().tiebreak) cues.push({ kind: "tiebreak", matchTiebreak: false });
    }
    lastCues = cues;
  }

  const kind = kindNow();
  const k = score[0] + score[1];
  const idx = kind.tiebreak ? gamesPlayed + Math.floor((k + 1) / 2) : gamesPlayed;
  const srv = serverAt(m.firstServer, order, idx, doubles);
  const cur = current();
  const isDeciding = deciding();
  return {
    sets,
    setsWon,
    points: score,
    game: kind,
    winner,
    serverTeam: srv.team,
    serverPlayer: srv.player,
    serveSide: k % 2 === 0 ? "deuce" : "ad",
    leftTeam,
    gamesPlayed,
    order,
    finalMode,
    deciding: isDeciding,
    decidingChoiceOpen:
      winner === null &&
      isDeciding &&
      f.finalSet !== "advantage" &&
      cur.games[0] === 0 &&
      cur.games[1] === 0 &&
      k === 0,
    log,
    lastCues,
    decidingPoint: !kind.tiebreak && f.noAd && score[0] === 3 && score[1] === 3,
  };
}

const CALLS = ["0", "15", "30", "40"];

/** Display label for each side's current game score. */
export function pointLabels(s: MatchState, noAd: boolean): [string, string] {
  const [a, b] = s.points;
  if (s.game.tiebreak) return [String(a), String(b)];
  if (a >= 3 && b >= 3 && !noAd) {
    if (a === b) return ["40", "40"];
    return a > b ? ["AD", "40"] : ["40", "AD"];
  }
  return [CALLS[Math.min(a, 3)], CALLS[Math.min(b, 3)]];
}

export type Pressure = "match" | "set" | "break" | "game" | null;

/** What winning the next point would mean for each side. */
export function pressure(m: Match, s: MatchState): [Pressure, Pressure] {
  if (s.winner !== null) return [null, null];
  const out: [Pressure, Pressure] = [null, null];
  for (const side of [0, 1] as Side[]) {
    const next = replay({ ...m, events: [...m.events, { k: "pt", w: side, t: 0 }] });
    if (next.winner === side) out[side] = "match";
    else if (next.setsWon[side] > s.setsWon[side]) out[side] = "set";
    else if (next.gamesPlayed > s.gamesPlayed || (m.format.mode === "game" && next.winner !== null)) {
      out[side] = !s.game.tiebreak && side !== s.serverTeam ? "break" : "game";
    }
  }
  return out;
}

export function teamName(m: Match, team: Side): string {
  const n = m.names[team].filter((x) => x.trim().length > 0);
  if (n.length === 0) return team === 0 ? "Team A" : "Team B";
  return n.join(" / ");
}

export function playerName(m: Match, team: Side, player: number): string {
  return m.names[team][player]?.trim() || (m.format.type === "doubles" ? `${teamName(m, team)} P${player + 1}` : teamName(m, team));
}

export function formatSummary(f: MatchFormat): string {
  if (f.mode === "game") return `Single game${f.noAd ? ", no-ad" : ""}`;
  const parts: string[] = [];
  parts.push(f.bestOf === 1 ? "1 set" : `Best of ${f.bestOf}`);
  parts.push(`sets to ${f.gamesPerSet}`);
  parts.push(f.tiebreakAt === null ? "advantage sets" : `tiebreak to ${f.tiebreakTo} at ${f.tiebreakAt}–${f.tiebreakAt}`);
  if (f.bestOf > 1 && f.finalSet === "matchTiebreak") parts.push(`${f.matchTiebreakTo}-pt match tiebreak`);
  if (f.bestOf > 1 && f.finalSet === "advantage") parts.push("advantage final set");
  if (f.noAd) parts.push("no-ad");
  return parts.join(" · ");
}

export function setScoreText(set: SetScore): string {
  if (set.matchTiebreak && set.tb) return `[${set.tb[0]}–${set.tb[1]}]`;
  const base = `${set.games[0]}–${set.games[1]}`;
  if (set.tb && set.winner !== undefined) return `${base} (${Math.min(set.tb[0], set.tb[1])})`;
  return base;
}

export interface SideStats {
  points: number;
  servicePointsWon: number;
  servicePointsPlayed: number;
  returnPointsWon: number;
  returnPointsPlayed: number;
  breakPointsWon: number;
  breakPointChances: number;
  gamesWon: number;
  serviceGamesHeld: number;
  serviceGamesPlayed: number;
  aces: number;
  doubleFaults: number;
  winners: number;
  errors: number;
  longestStreak: number;
}

export function computeStats(m: Match, s: MatchState): [SideStats, SideStats] {
  const blank = (): SideStats => ({
    points: 0,
    servicePointsWon: 0,
    servicePointsPlayed: 0,
    returnPointsWon: 0,
    returnPointsPlayed: 0,
    breakPointsWon: 0,
    breakPointChances: 0,
    gamesWon: 0,
    serviceGamesHeld: 0,
    serviceGamesPlayed: 0,
    aces: 0,
    doubleFaults: 0,
    winners: 0,
    errors: 0,
    longestStreak: 0,
  });
  const st: [SideStats, SideStats] = [blank(), blank()];
  let streakSide: Side | null = null;
  let streak = 0;
  for (const p of s.log) {
    const r = other(p.serverTeam);
    st[p.w].points += 1;
    st[p.serverTeam].servicePointsPlayed += 1;
    st[r].returnPointsPlayed += 1;
    if (p.w === p.serverTeam) st[p.w].servicePointsWon += 1;
    else st[p.w].returnPointsWon += 1;
    if (p.breakPoint) {
      st[r].breakPointChances += 1;
      if (p.w === r) st[r].breakPointsWon += 1;
    }
    if (p.gameEnded) {
      st[p.w].gamesWon += 1;
      if (!p.tiebreak) {
        st[p.serverTeam].serviceGamesPlayed += 1;
        if (p.w === p.serverTeam) st[p.serverTeam].serviceGamesHeld += 1;
      }
    }
    if (p.tag === "ace") st[p.serverTeam].aces += 1;
    if (p.tag === "doubleFault") st[p.serverTeam].doubleFaults += 1;
    if (p.tag === "winner") st[p.w].winners += 1;
    if (p.tag === "error") st[other(p.w)].errors += 1;
    if (streakSide === p.w) streak += 1;
    else {
      streakSide = p.w;
      streak = 1;
    }
    st[p.w].longestStreak = Math.max(st[p.w].longestStreak, streak);
  }
  void m;
  return st;
}

export function durationText(ms: number): string {
  const total = Math.max(0, Math.round(ms / 1000));
  const h = Math.floor(total / 3600);
  const min = Math.floor((total % 3600) / 60);
  const sec = total % 60;
  if (h > 0) return `${h}h ${String(min).padStart(2, "0")}m`;
  return `${min}:${String(sec).padStart(2, "0")}`;
}

export function matchDuration(m: Match): number {
  const pts = m.events.filter((e) => e.k === "pt");
  if (pts.length === 0) return 0;
  const end = m.endedAt ?? (m.status === "live" ? Date.now() : pts[pts.length - 1].t);
  return end - m.createdAt;
}
