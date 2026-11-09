import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { ChartContainer, type ChartConfig } from "@/components/ui/chart";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { Match, MatchState } from "@/lib/tennis";
import { computeStats, durationText, matchDuration, teamName } from "@/lib/tennis";

const pct = (a: number, b: number) => (b === 0 ? "–" : `${Math.round((a / b) * 100)}%`);

export function MatchStats({ match, state }: { match: Match; state: MatchState }) {
  const [a, b] = computeStats(match, state);
  const nA = teamName(match, 0);
  const nB = teamName(match, 1);
  const tagged = state.log.some((p) => p.tag);
  const rows: { label: string; a: string; b: string }[] = [
    { label: "Total points won", a: String(a.points), b: String(b.points) },
    { label: "Service points won", a: `${a.servicePointsWon}/${a.servicePointsPlayed} (${pct(a.servicePointsWon, a.servicePointsPlayed)})`, b: `${b.servicePointsWon}/${b.servicePointsPlayed} (${pct(b.servicePointsWon, b.servicePointsPlayed)})` },
    { label: "Return points won", a: `${a.returnPointsWon}/${a.returnPointsPlayed} (${pct(a.returnPointsWon, a.returnPointsPlayed)})`, b: `${b.returnPointsWon}/${b.returnPointsPlayed} (${pct(b.returnPointsWon, b.returnPointsPlayed)})` },
    { label: "Break points converted", a: `${a.breakPointsWon}/${a.breakPointChances}`, b: `${b.breakPointsWon}/${b.breakPointChances}` },
    { label: "Service games held", a: `${a.serviceGamesHeld}/${a.serviceGamesPlayed}`, b: `${b.serviceGamesHeld}/${b.serviceGamesPlayed}` },
    { label: "Games won", a: String(a.gamesWon), b: String(b.gamesWon) },
    { label: "Longest point run", a: String(a.longestStreak), b: String(b.longestStreak) },
  ];
  if (tagged) {
    rows.push(
      { label: "Aces", a: String(a.aces), b: String(b.aces) },
      { label: "Double faults", a: String(a.doubleFaults), b: String(b.doubleFaults) },
      { label: "Winners", a: String(a.winners), b: String(b.winners) },
      { label: "Errors", a: String(a.errors), b: String(b.errors) },
    );
  }

  const perSet = state.sets
    .map((_, i) => {
      const pts = state.log.filter((p) => p.setIndex === i);
      if (pts.length === 0) return null;
      return {
        set: `Set ${i + 1}`,
        a: pts.filter((p) => p.w === 0).length,
        b: pts.filter((p) => p.w === 1).length,
        time: pts.length > 1 ? durationText(pts[pts.length - 1].t - pts[0].t) : "–",
      };
    })
    .filter((x): x is { set: string; a: number; b: number; time: string } => x !== null);

  const gaps = state.log.slice(1).map((p, i) => p.t - state.log[i].t).filter((g) => g > 0 && g < 15 * 60 * 1000);
  const avgGap = gaps.length ? gaps.reduce((x, y) => x + y, 0) / gaps.length : 0;

  const config: ChartConfig = {
    a: { label: nA, color: "var(--chart-1)" },
    b: { label: nB, color: "var(--chart-3)" },
  };

  if (state.log.length === 0) {
    return <p className="text-sm text-muted-foreground">No points played yet.</p>;
  }

  return (
    <div className="space-y-6">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="whitespace-normal">Statistic</TableHead>
            <TableHead className="whitespace-normal text-right">{nA}</TableHead>
            <TableHead className="whitespace-normal text-right">{nB}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r) => (
            <TableRow key={r.label}>
              <TableCell className="whitespace-normal">{r.label}</TableCell>
              <TableCell className="text-right tabular-nums">{r.a}</TableCell>
              <TableCell className="text-right tabular-nums">{r.b}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <section aria-labelledby="pts-set-h" className="space-y-3">
        <h3 id="pts-set-h" className="font-semibold">Points won by set</h3>
        <p className="text-sm text-muted-foreground">
          {`${durationText(matchDuration(match))} on court${avgGap ? `, about ${Math.round(avgGap / 1000)} s between points` : ""}.`}
        </p>
        <div className="rounded-lg border bg-card p-3" aria-hidden="true">
          <ChartContainer config={config} className="h-48 w-full">
            <BarChart data={perSet} accessibilityLayer={false}>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="set" tickLine={false} axisLine={false} />
              <YAxis allowDecimals={false} width={28} tickLine={false} axisLine={false} />
              <Bar dataKey="a" fill="var(--color-a)" radius={4} />
              <Bar dataKey="b" fill="var(--color-b)" radius={4} />
            </BarChart>
          </ChartContainer>
          <div className="mt-2 flex gap-4 text-sm">
            <span className="flex items-center gap-1.5"><span className="size-3 rounded-sm" style={{ background: "var(--chart-1)" }} />{nA}</span>
            <span className="flex items-center gap-1.5"><span className="size-3 rounded-sm" style={{ background: "var(--chart-3)" }} />{nB}</span>
          </div>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Set</TableHead>
              <TableHead className="whitespace-normal text-right">{nA}</TableHead>
              <TableHead className="whitespace-normal text-right">{nB}</TableHead>
              <TableHead className="text-right">Time</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {perSet.map((r) => (
              <TableRow key={r.set}>
                <TableCell>{r.set}</TableCell>
                <TableCell className="text-right tabular-nums">{r.a}</TableCell>
                <TableCell className="text-right tabular-nums">{r.b}</TableCell>
                <TableCell className="text-right tabular-nums">{r.time}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </section>
    </div>
  );
}
