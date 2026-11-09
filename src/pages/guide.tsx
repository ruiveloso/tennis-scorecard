import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const MODES: { title: string; body: string }[] = [
  { title: "Standard", body: "Each set is first to 6 games, won by 2. At 6–6 a tiebreak to 7 points (win by 2) decides the set. Choose 1 set, best of 3 or best of 5." },
  { title: "Match tiebreak", body: "Regular sets, but if the sets are level the deciding set is replaced by a single tiebreak to 10 points, win by 2. Right before the deciding set starts you can switch to a full set instead." },
  { title: "Advantage final set", body: "Tiebreaks at 6–6 in every set except the last, which continues until a player leads by two games." },
  { title: "Pro set", body: "One long set to 8 games, won by 2, with a tiebreak at 8–8. Common in club leagues and high-school matches." },
  { title: "Fast4", body: "Short sets to 4 games with a tiebreak at 3–3 played to 5 points (sudden death at 4–4). Games use no-ad scoring." },
  { title: "Custom", body: "Set the number of games to win a set, the margin (win by 1 or 2), when a tiebreak is played, how long the tiebreak is, and how the final set is decided." },
  { title: "No-ad scoring", body: "Available in every mode. At deuce (40–40) the next point decides the game; the receiver chooses which side to receive from." },
  { title: "Single game", body: "Score one game on its own — handy for practice drills or settling a quick point." },
  { title: "Warmup", body: "Time your warmup, then start the match from the same screen." },
];

const RULES: { title: string; body: string }[] = [
  { title: "Game scoring", body: "Points go 0 (love), 15, 30, 40, game. At 40–40 (deuce) a player needs two points in a row: the first gives advantage, the second wins the game." },
  { title: "Serving", body: "Players alternate serving every game. Each point starts from the right (deuce court) when the points played in the game are even, and from the left (advantage court) when odd. The serve goes diagonally into the opposite service box." },
  { title: "Tiebreak serving", body: "The player due to serve serves the first point. After that, serve passes every two points. The player who served first in the tiebreak receives first in the next set." },
  { title: "Changing ends", body: "Change ends after the first, third and every other odd game of each set, and every six points in a tiebreak. After a set ends with an even number of games, players change after the first game of the next set." },
  { title: "Doubles service order", body: "Teams alternate serving games, and within each team the two partners alternate their service games. The order carries over between sets unless a team chooses to change it at the start of a set." },
  { title: "Break point", body: "A point on which the receiving player would win the game. Converting it 'breaks' serve." },
  { title: "Set and match point", body: "A point that, if won, would win the set or the match. The scoring screen shows these above each player." },
];

const KEYS: [string, string][] = [
  ["A", "Point to the player on the left end"],
  ["L", "Point to the player on the right end"],
  ["U", "Undo the last point"],
];

export function GuidePage() {
  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 px-4 py-6 sm:px-6">
      <h1 className="text-2xl font-semibold tracking-tight">Guide and rules</h1>
      <Tabs defaultValue="modes">
        <TabsList>
          <TabsTrigger value="modes">Match modes</TabsTrigger>
          <TabsTrigger value="rules">Rulebook</TabsTrigger>
          <TabsTrigger value="keys">Shortcuts</TabsTrigger>
        </TabsList>
        <TabsContent value="modes" className="mt-4">
          <dl className="divide-y rounded-xl border bg-card">
            {MODES.map((m) => (
              <div key={m.title} className="space-y-1 p-4">
                <dt className="font-semibold">{m.title}</dt>
                <dd className="text-sm leading-relaxed">{m.body}</dd>
              </div>
            ))}
          </dl>
        </TabsContent>
        <TabsContent value="rules" className="mt-4">
          <dl className="divide-y rounded-xl border bg-card">
            {RULES.map((m) => (
              <div key={m.title} className="space-y-1 p-4">
                <dt className="font-semibold">{m.title}</dt>
                <dd className="text-sm leading-relaxed">{m.body}</dd>
              </div>
            ))}
          </dl>
        </TabsContent>
        <TabsContent value="keys" className="mt-4">
          <p className="mb-3 text-sm">Shortcuts work after you click or tab into the court on the scoring screen.</p>
          <dl className="divide-y rounded-xl border bg-card">
            {KEYS.map(([k, d]) => (
              <div key={k} className="flex items-center gap-4 p-4">
                <dt><kbd className="rounded border bg-muted px-2 py-0.5 font-mono text-sm">{k}</kbd></dt>
                <dd className="text-sm">{d}</dd>
              </div>
            ))}
          </dl>
        </TabsContent>
      </Tabs>
    </div>
  );
}
