import type { CoachMatch } from "@/lib/match-store";
import type { Match } from "@/lib/tennis";
import { durationText, formatSummary, matchDuration, pointLabels, replay, setScoreText, teamName } from "@/lib/tennis";

export function matchSummaryText(m: Match, from: "game" | "history"): string {
  const s = replay(m);
  const a = teamName(m, 0);
  const b = teamName(m, 1);
  const date = new Date(m.createdAt).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
  const lines: string[] = [];
  const status =
    s.winner !== null ? `${teamName(m, s.winner)} won` : from === "game" ? "In Progress" : "Suspended";
  lines.push(`${a} vs ${b} — ${status}`);
  if (m.format.mode === "game") {
    const [pa, pb] = pointLabels(s, m.format.noAd);
    lines.push(`Single game: ${s.winner !== null ? "complete" : `${pa}–${pb}`}`);
  } else {
    const sets = s.sets.filter((x, i) => x.winner !== undefined || i === s.sets.length - 1);
    const shown = sets.filter((x) => x.winner !== undefined || x.games[0] + x.games[1] > 0 || x.tb);
    if (shown.length > 0) lines.push(`Score: ${shown.map(setScoreText).join(", ")}`);
    if (s.winner === null && (s.points[0] > 0 || s.points[1] > 0)) {
      const [pa, pb] = pointLabels(s, m.format.noAd);
      lines.push(`Current game: ${pa}–${pb}`);
    }
  }
  const w = m.weather;
  const weather = w ? `${Math.round(w.temp)}${/^[CF]$/i.test(w.tempUnit) ? `°${w.tempUnit.toUpperCase()}` : w.tempUnit}, ${w.caption}` : "";
  const meta = [date, m.court.trim(), durationText(matchDuration(m)), weather].filter(Boolean);
  lines.push(meta.join(" · "));
  lines.push(formatSummary(m.format));
  return lines.join("\n");
}

export function multiSummaryText(matches: Match[]): string {
  return matches.map((m) => matchSummaryText(m, "history")).join("\n\n");
}

export function coachSummaryText(items: CoachMatch[]): string {
  return items
    .map((c) => {
      const score = c.sets
        .filter((g) => g[0] + g[1] > 0)
        .map((g) => `${g[0]}–${g[1]}`)
        .join(", ");
      const head = `${c.court ? `${c.court}: ` : ""}${c.names[0] || "Player A"} vs ${c.names[1] || "Player B"}`;
      return `${head}${score ? ` — ${score}` : ""}${c.done ? " (final)" : ""}`;
    })
    .join("\n");
}

/** Uses the system share sheet when available, otherwise copies to the clipboard. */
export async function shareText(text: string, title: string): Promise<"shared" | "copied" | "failed"> {
  try {
    if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
      await navigator.share({ title, text });
      return "shared";
    }
  } catch {
    // Fall through to clipboard.
  }
  try {
    await navigator.clipboard.writeText(text);
    return "copied";
  } catch {
    return "failed";
  }
}
