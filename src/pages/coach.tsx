import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Check, ClipboardList, Minus, Plus, Share2, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { EmptyState } from "@/components/states";
import { useConfirm } from "@/hooks/use-confirm";
import { useMatchStore, type CoachMatch } from "@/lib/match-store";
import { coachSummaryText, shareText } from "@/lib/share";
import { cn } from "@/lib/utils";

function CoachCard({ c }: { c: CoachMatch }) {
  const update = useMatchStore((s) => s.updateCoach);
  const remove = useMatchStore((s) => s.removeCoach);
  const confirm = useConfirm();
  const setGames = (setIdx: number, side: 0 | 1, delta: number) => {
    const sets = c.sets.map((g, i) => {
      if (i !== setIdx) return g;
      const n: [number, number] = [g[0], g[1]];
      n[side] = Math.max(0, n[side] + delta);
      return n;
    });
    update(c.id, { sets });
  };
  const setsWon = c.sets.reduce<[number, number]>((acc, g, i) => {
    if (i < c.sets.length - 1 || c.done) {
      if (g[0] > g[1]) acc[0] += 1;
      else if (g[1] > g[0]) acc[1] += 1;
    }
    return acc;
  }, [0, 0]);

  return (
    <article className={cn("space-y-3 rounded-xl border bg-card p-4", c.done && "border-green-700")} aria-label={`${c.names[0]} vs ${c.names[1]}`}>
      <header className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h2 className="font-semibold">{c.court || "Court"}</h2>
          {c.done && <span className="rounded-md bg-green-700 px-1.5 text-xs font-medium text-white">Final</span>}
        </div>
        <Button variant="ghost" size="icon-sm" aria-label={`Remove ${c.court || "match"}`} onClick={async () => {
          if (await confirm({ title: "Remove this match?", confirmLabel: "Remove", destructive: true })) remove(c.id);
        }}>
          <X aria-hidden="true" />
        </Button>
      </header>
      <table className="w-full text-sm">
        <caption className="sr-only">{`Set scores on ${c.court || "court"}`}</caption>
        <thead>
          <tr className="text-xs text-muted-foreground">
            <th scope="col" className="text-left font-medium">Player</th>
            {c.sets.map((_, i) => <th key={i} scope="col" className="w-20 text-center font-medium">{`Set ${i + 1}`}</th>)}
          </tr>
        </thead>
        <tbody>
          {([0, 1] as const).map((side) => (
            <tr key={side} className="border-t">
              <th scope="row" className="py-2 pr-2 text-left font-medium">
                <span className={cn(setsWon[side] > setsWon[side === 0 ? 1 : 0] && "font-semibold")}>{c.names[side]}</span>
              </th>
              {c.sets.map((g, i) => (
                <td key={i} className="py-1 text-center">
                  <span className="inline-flex items-center gap-1">
                    <Button variant="ghost" size="icon-xs" aria-label={`Remove a game from ${c.names[side]} in set ${i + 1}`} disabled={c.done || g[side] === 0} onClick={() => setGames(i, side, -1)}>
                      <Minus aria-hidden="true" />
                    </Button>
                    <span className="w-5 text-center text-base font-semibold tabular-nums">{g[side]}</span>
                    <Button variant="ghost" size="icon-xs" aria-label={`Add a game to ${c.names[side]} in set ${i + 1}`} disabled={c.done} onClick={() => setGames(i, side, 1)}>
                      <Plus aria-hidden="true" />
                    </Button>
                  </span>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <div className="flex flex-wrap gap-2">
        {!c.done && c.sets.length < 5 && (
          <Button size="sm" variant="outline" onClick={() => update(c.id, { sets: [...c.sets, [0, 0]] })}>
            <Plus aria-hidden="true" /> Next set
          </Button>
        )}
        {!c.done && c.sets.length > 1 && (
          <Button size="sm" variant="ghost" onClick={() => update(c.id, { sets: c.sets.slice(0, -1) })}>Remove last set</Button>
        )}
        <Button size="sm" variant={c.done ? "outline" : "default"} aria-pressed={c.done} onClick={() => update(c.id, { done: !c.done })}>
          <Check aria-hidden="true" /> {c.done ? "Reopen" : "Mark final"}
        </Button>
      </div>
    </article>
  );
}

export function CoachPage() {
  const coach = useMatchStore((s) => s.coach);
  const add = useMatchStore((s) => s.addCoachMatch);
  const clear = useMatchStore((s) => s.clearCoach);
  const confirm = useConfirm();
  const [court, setCourt] = useState("");
  const [a, setA] = useState("");
  const [b, setB] = useState("");

  const submit = (e: FormEvent) => {
    e.preventDefault();
    add(court.trim() || `Court ${coach.length + 1}`, [a.trim() || "Player A", b.trim() || "Player B"]);
    setCourt("");
    setA("");
    setB("");
  };

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 px-4 py-6 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">Coach mode</h1>
        {coach.length > 0 && (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={async () => {
              const r = await shareText(coachSummaryText(coach), "Match scores");
              if (r === "copied") toast.success("All scores copied to clipboard");
              if (r === "failed") toast.error("Sharing is not available here");
            }}>
              <Share2 aria-hidden="true" /> Share all
            </Button>
            <Button variant="outline" size="sm" onClick={async () => {
              if (await confirm({ title: "Clear all coach matches?", confirmLabel: "Clear", destructive: true })) clear();
            }}>
              <Trash2 aria-hidden="true" /> Clear
            </Button>
          </div>
        )}
      </div>

      <form onSubmit={submit} className="grid gap-3 rounded-xl border p-4 sm:grid-cols-[1fr_1fr_1fr_auto] sm:items-end">
        <div className="space-y-1.5">
          <Label htmlFor="c-court">Court</Label>
          <Input id="c-court" value={court} onChange={(e) => setCourt(e.target.value)} placeholder={`Court ${coach.length + 1}`} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="c-a">Player A</Label>
          <Input id="c-a" value={a} onChange={(e) => setA(e.target.value)} autoComplete="off" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="c-b">Player B</Label>
          <Input id="c-b" value={b} onChange={(e) => setB(e.target.value)} autoComplete="off" />
        </div>
        <Button type="submit"><Plus aria-hidden="true" /> Add match</Button>
      </form>

      {coach.length === 0 ? (
        <EmptyState icon={ClipboardList} title="No matches on the board" description="Add each court you are watching to track its set scores side by side." />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {coach.map((c) => <CoachCard key={c.id} c={c} />)}
        </div>
      )}
    </div>
  );
}
