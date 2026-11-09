import { useRef } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Scoreboard } from "@/components/scoreboard";
import type { Match, MatchState, Side } from "@/lib/tennis";
import { playerName, teamName } from "@/lib/tennis";

export function GameCompletionDialog({ match, state, open, onContinue, onEdit }: {
  match: Match;
  state: MatchState;
  open: boolean;
  onContinue: () => void;
  onEdit: () => void;
}) {
  const nextButton = useRef<HTMLButtonElement>(null);
  const last = state.log[state.log.length - 1];
  if (!last?.gameEnded) return null;

  const done = state.winner !== null;
  const points: [number, number] = [0, 0];
  for (let i = last.index; i >= 0; i--) {
    const point = state.log[i];
    if (i < last.index && point.gameEnded) break;
    points[point.w] += 1;
  }
  const stage = last.tiebreak ? "Tiebreak" : "Game";
  const title = last.setEnded
    ? done ? `${stage}, set and match complete` : `${stage} and set complete`
    : `${stage} complete`;
  const nextSet = state.sets[state.sets.length - 1];
  const server = playerName(match, state.serverTeam, state.serverPlayer);
  const nextLabel = done
    ? "Finish"
    : state.game.tiebreak
      ? state.game.matchTiebreak ? "Start match tiebreak" : "Start tiebreak"
      : last.setEnded ? "Next set" : "Next game";
  const next = done
    ? `${match.format.mode === "game" ? "This game" : "The match"} is complete. The result is saved in History.`
    : state.game.tiebreak
      ? `Next: a ${state.game.to}-point ${state.game.matchTiebreak ? "match tiebreak" : "tiebreak"}. ${server} serves first.`
      : `Next: game ${nextSet.games[0] + nextSet.games[1] + 1} of set ${state.sets.length}. ${server} serves first.`;
  const changeEnds = !done && state.lastCues.some((cue) => cue.kind === "changeEnds");

  return (
    <AlertDialog open={open} onOpenChange={(value) => { if (!value) onContinue(); }}>
      <AlertDialogContent
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          nextButton.current?.focus();
        }}
        onEscapeKeyDown={(event) => event.preventDefault()}
      >
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>
            {`${teamName(match, last.w)} won the ${last.tiebreak ? "tiebreak" : "game"}${last.setEnded ? ` and set ${last.setIndex + 1}` : ""}${done && match.format.mode !== "game" ? ", winning the match" : ""}.`}
          </AlertDialogDescription>
        </AlertDialogHeader>
        {match.format.mode !== "game" && (
          <div className="min-w-0 overflow-x-auto rounded-lg border p-3">
            <Scoreboard match={match} state={{ ...state, sets: state.sets.slice(0, last.setIndex + 1) }} showPoints={false} />
          </div>
        )}
        <div className="space-y-2">
          <h3 className="text-sm font-semibold">Points won in this {last.tiebreak ? "tiebreak" : "game"}</h3>
          <dl className="space-y-1 text-sm">
            {([0, 1] as Side[]).map((team) => (
              <div key={team} className="flex items-start justify-between gap-4">
                <dt className="min-w-0 break-words">{teamName(match, team)}</dt>
                <dd className="font-semibold tabular-nums">{points[team]}</dd>
              </div>
            ))}
          </dl>
        </div>
        <div className="space-y-1 rounded-lg bg-muted p-3 text-sm" aria-label="What's next">
          <p>{next}</p>
          {changeEnds && <p className="font-semibold">Change ends before continuing.</p>}
        </div>
        <p className="text-xs text-muted-foreground">Edit score undoes the last point so you can correct the game.</p>
        <AlertDialogFooter>
          <AlertDialogCancel className="min-h-12" onClick={onEdit}>Edit score</AlertDialogCancel>
          <AlertDialogAction ref={nextButton} className="min-h-12 font-semibold">
            {nextLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
