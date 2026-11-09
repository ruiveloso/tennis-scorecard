import type { Match, MatchState, Side } from "@/lib/tennis";
import { teamName } from "@/lib/tennis";
import type { Settings } from "@/lib/match-store";

type Lang = Settings["lang"];

interface Phrases {
  calls: string[];
  all: string;
  deuce: string;
  advantage: (n: string) => string;
  game: (n: string) => string;
  set: (n: string) => string;
  match: (n: string) => string;
  changeEnds: string;
  tiebreak: string;
  matchTiebreak: string;
  decidingPoint: string;
  leads: (n: string) => string;
  serving: (n: string) => string;
}

const PHRASES: Record<Lang, Phrases> = {
  "en-GB": {
    calls: ["love", "fifteen", "thirty", "forty"],
    all: "all",
    deuce: "Deuce",
    advantage: (n) => `Advantage ${n}`,
    game: (n) => `Game, ${n}`,
    set: (n) => `Set, ${n}`,
    match: (n) => `Game, set and match, ${n}`,
    changeEnds: "Change ends",
    tiebreak: "Tiebreak",
    matchTiebreak: "Match tiebreak",
    decidingPoint: "Deciding point",
    leads: (n) => `${n} leads`,
    serving: (n) => `${n} to serve`,
  },
  "pt-PT": {
    calls: ["zero", "quinze", "trinta", "quarenta"],
    all: "iguais",
    deuce: "Iguais",
    advantage: (n) => `Vantagem ${n}`,
    game: (n) => `Jogo, ${n}`,
    set: (n) => `Set, ${n}`,
    match: (n) => `Jogo, set e encontro, ${n}`,
    changeEnds: "Troca de campo",
    tiebreak: "Tie-break",
    matchTiebreak: "Super tie-break",
    decidingPoint: "Ponto decisivo",
    leads: (n) => `${n} lidera`,
    serving: (n) => `Serve ${n}`,
  },
  "es-ES": {
    calls: ["nada", "quince", "treinta", "cuarenta"],
    all: "iguales",
    deuce: "Iguales",
    advantage: (n) => `Ventaja ${n}`,
    game: (n) => `Juego, ${n}`,
    set: (n) => `Set, ${n}`,
    match: (n) => `Juego, set y partido, ${n}`,
    changeEnds: "Cambio de lado",
    tiebreak: "Tie-break",
    matchTiebreak: "Super tie-break",
    decidingPoint: "Punto decisivo",
    leads: (n) => `${n} adelante`,
    serving: (n) => `Saca ${n}`,
  },
  "fr-FR": {
    calls: ["zéro", "quinze", "trente", "quarante"],
    all: "partout",
    deuce: "Égalité",
    advantage: (n) => `Avantage ${n}`,
    game: (n) => `Jeu, ${n}`,
    set: (n) => `Set, ${n}`,
    match: (n) => `Jeu, set et match, ${n}`,
    changeEnds: "Changement de côté",
    tiebreak: "Tie-break",
    matchTiebreak: "Super tie-break",
    decidingPoint: "Point décisif",
    leads: (n) => `${n} mène`,
    serving: (n) => `Service ${n}`,
  },
  "de-DE": {
    calls: ["null", "fünfzehn", "dreißig", "vierzig"],
    all: "beide",
    deuce: "Einstand",
    advantage: (n) => `Vorteil ${n}`,
    game: (n) => `Spiel, ${n}`,
    set: (n) => `Satz, ${n}`,
    match: (n) => `Spiel, Satz und Sieg, ${n}`,
    changeEnds: "Seitenwechsel",
    tiebreak: "Tiebreak",
    matchTiebreak: "Match-Tiebreak",
    decidingPoint: "Entscheidungspunkt",
    leads: (n) => `${n} führt`,
    serving: (n) => `Aufschlag ${n}`,
  },
  "it-IT": {
    calls: ["zero", "quindici", "trenta", "quaranta"],
    all: "pari",
    deuce: "Parità",
    advantage: (n) => `Vantaggio ${n}`,
    game: (n) => `Gioco, ${n}`,
    set: (n) => `Set, ${n}`,
    match: (n) => `Gioco, set e partita, ${n}`,
    changeEnds: "Cambio campo",
    tiebreak: "Tie-break",
    matchTiebreak: "Match tie-break",
    decidingPoint: "Punto decisivo",
    leads: (n) => `${n} in vantaggio`,
    serving: (n) => `Serve ${n}`,
  },
};

export const LANG_LABELS: Record<Lang, string> = {
  "en-GB": "English",
  "pt-PT": "Português",
  "es-ES": "Español",
  "fr-FR": "Français",
  "de-DE": "Deutsch",
  "it-IT": "Italiano",
};

/** Builds the umpire-style call for the current state. */
export function scoreCall(m: Match, s: MatchState, lang: Lang): string {
  const p = PHRASES[lang];
  const name = (side: Side) => teamName(m, side);
  const parts: string[] = [];
  const cues = s.lastCues;
  const matchCue = cues.find((c) => c.kind === "match");
  if (matchCue && matchCue.kind === "match") return p.match(name(matchCue.side));
  const setCue = cues.find((c) => c.kind === "set");
  const gameCue = cues.find((c) => c.kind === "game");
  if (setCue && setCue.kind === "set") parts.push(p.set(name(setCue.side)));
  else if (gameCue && gameCue.kind === "game") parts.push(p.game(name(gameCue.side)));
  if (gameCue) {
    const cur = s.sets[s.sets.length - 1];
    if (!setCue) {
      const [a, b] = cur.games;
      if (a === b) parts.push(`${a} ${p.all}`);
      else parts.push(`${Math.max(a, b)}–${Math.min(a, b)}, ${p.leads(name(a > b ? 0 : 1))}`);
    }
  } else {
    const [a, b] = s.points;
    const srv = s.serverTeam;
    const rcv = srv === 0 ? 1 : 0;
    if (s.game.tiebreak) {
      if (a === b) parts.push(`${a} ${p.all}`);
      else parts.push(`${Math.max(a, b)}–${Math.min(a, b)}, ${name(a > b ? 0 : 1)}`);
    } else if (a >= 3 && b >= 3 && !m.format.noAd) {
      if (a === b) parts.push(p.deuce);
      else parts.push(p.advantage(name(a > b ? 0 : 1)));
    } else if (s.decidingPoint) {
      parts.push(p.decidingPoint);
    } else {
      const sp = s.points[srv];
      const rp = s.points[rcv];
      if (sp === rp && sp > 0) parts.push(`${p.calls[sp]} ${p.all}`);
      else if (sp > 0 || rp > 0) parts.push(`${p.calls[Math.min(sp, 3)]}, ${p.calls[Math.min(rp, 3)]}`);
    }
  }
  for (const c of cues) {
    if (c.kind === "tiebreak") parts.push(c.matchTiebreak ? p.matchTiebreak : p.tiebreak);
    if (c.kind === "changeEnds") parts.push(p.changeEnds);
  }
  if (gameCue) parts.push(p.serving(name(s.serverTeam)));
  return parts.join(". ");
}

export function speechAvailable(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

export function listVoices(lang: Lang): SpeechSynthesisVoice[] {
  if (!speechAvailable()) return [];
  const prefix = lang.slice(0, 2);
  return window.speechSynthesis.getVoices().filter((v) => v.lang.toLowerCase().startsWith(prefix));
}

export function speak(text: string, lang: Lang, voiceURI: string) {
  if (!speechAvailable() || !text) return;
  try {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = lang;
    const voice = window.speechSynthesis.getVoices().find((v) => v.voiceURI === voiceURI);
    if (voice) u.voice = voice;
    u.rate = 1;
    window.speechSynthesis.speak(u);
  } catch {
    // Speech is best-effort.
  }
}

export function sampleCall(lang: Lang): string {
  const p = PHRASES[lang];
  return `${p.calls[1]}, ${p.calls[0]}. ${p.deuce}.`;
}
