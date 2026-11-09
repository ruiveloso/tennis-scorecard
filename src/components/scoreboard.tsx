import { cn } from "@/lib/utils";
import type { Match, MatchState, Side } from "@/lib/tennis";
import { playerName, pointLabels, teamName } from "@/lib/tennis";

export function Scoreboard({ match, state, size = "md", showPoints = true }: { match: Match; state: MatchState; size?: "md" | "xl"; showPoints?: boolean }) {
  const labels = pointLabels(state, match.format.noAd);
  const isGame = match.format.mode === "game";
  const sets = isGame ? [] : state.sets.filter((s, i) => s.winner !== undefined || i === state.sets.length - 1);
  const xl = size === "xl";
  const live = state.winner === null;
  return (
    <table className={cn("w-full border-collapse", xl ? "text-4xl md:text-6xl" : "text-base")}>
      <caption className="sr-only">Scoreboard</caption>
      <thead>
        <tr className={cn("text-muted-foreground", xl ? "text-xl md:text-2xl" : "text-xs")}>
          <th scope="col" className="py-1 text-left font-medium">Player</th>
          {sets.map((s, i) => (
            <th key={i} scope="col" className="w-[1.8em] py-1 text-center font-medium">
              {s.matchTiebreak ? "TB" : `S${i + 1}`}
            </th>
          ))}
          {showPoints && live && (
            <th scope="col" className="w-[2.6em] py-1 text-center font-medium">
              {state.game.tiebreak ? (state.game.matchTiebreak ? "MTB" : "TB") : "Pts"}
            </th>
          )}
        </tr>
      </thead>
      <tbody>
        {([0, 1] as Side[]).map((team) => {
          const serving = live && state.serverTeam === team;
          const won = state.winner === team;
          return (
            <tr key={team} className="border-t border-border">
              <th scope="row" className={cn("py-2 pr-2 text-left align-middle", xl ? "font-semibold" : "font-medium")}>
                <span className="flex min-w-0 items-center gap-2">
                  <span
                    className={cn(
                      "inline-block shrink-0 rounded-full border-2",
                      xl ? "size-5 md:size-7" : "size-3",
                      serving ? "border-lime-800 bg-lime-300" : "border-transparent",
                    )}
                    aria-hidden="true"
                  />
                  <span className="min-w-0 break-words">
                    {teamName(match, team)}
                    {serving && match.format.type === "doubles" && (
                      <span className={cn("block font-normal text-muted-foreground", xl ? "text-lg md:text-2xl" : "text-xs")}>
                        {`${playerName(match, team, state.serverPlayer)} serving`}
                      </span>
                    )}
                  </span>
                  {serving && <span className="sr-only">(serving)</span>}
                  {won && <span className={cn("rounded-md bg-green-700 px-1.5 font-medium text-white", xl ? "text-lg" : "text-xs")}>Winner</span>}
                </span>
              </th>
              {sets.map((s, i) => {
                const g = s.matchTiebreak ? s.tb?.[team] ?? 0 : s.games[team];
                const setWon = s.winner === team;
                return (
                  <td key={i} className={cn("py-2 text-center tabular-nums", setWon ? "font-bold" : s.winner !== undefined ? "text-muted-foreground" : "font-semibold")}>
                    {g}
                    {s.tb && !s.matchTiebreak && s.winner !== undefined && s.winner !== team && (
                      <sup className="ml-0.5 text-[0.55em]">{s.tb[team]}</sup>
                    )}
                  </td>
                );
              })}
              {showPoints && live && (
                <td className="py-2 text-center">
                  <span className={cn("inline-block min-w-[2.2em] rounded-md bg-primary px-1 font-bold tabular-nums text-primary-foreground")}>
                    {labels[team]}
                  </span>
                </td>
              )}
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
