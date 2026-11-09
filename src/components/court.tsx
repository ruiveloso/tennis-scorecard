import { useId, type ReactNode } from "react";
import type { Side } from "@/lib/tennis";

const SURFACES = {
  hard: { out: "#1f4f7a", in: "#2f6fa3" },
  clay: { out: "#9a4a26", in: "#b85c32" },
  grass: { out: "#2f6a35", in: "#3f8443" },
} as const;

// Court geometry in SVG units (length runs left → right).
const X0 = 60;
const X1 = 720;
const NET = 390;
const Y0 = 30;
const Y1 = 330;
const MID = 180;
const ALLEY = 37.5;
const SVC_L = 212;
const SVC_R = 568;

export interface CourtProps {
  surface: keyof typeof SURFACES;
  doubles: boolean;
  leftTeam: Side;
  serverTeam: Side;
  serveSide: "deuce" | "ad";
  leftLabel: string;
  rightLabel: string;
  serverLabel: string;
  receiverLabel: string;
  /** Interactive overlays rendered above the left and right halves. */
  leftSlot?: ReactNode;
  rightSlot?: ReactNode;
  caption?: string;
}

export function Court(props: CourtProps) {
  const id = useId();
  const c = SURFACES[props.surface];
  const serverOnLeft = props.serverTeam === props.leftTeam;
  // A player facing the net from the left end has their right hand towards the bottom.
  const deuceBottom = serverOnLeft;
  const serverBottom = props.serveSide === "deuce" ? deuceBottom : !deuceBottom;
  const inTop = props.doubles ? Y0 : Y0 + ALLEY;
  const inBottom = props.doubles ? Y1 : Y1 - ALLEY;
  const sy = serverBottom ? (MID + inBottom) / 2 + 10 : (MID + inTop) / 2 - 10;
  const sx = serverOnLeft ? X0 - 26 : X1 + 26;
  // Diagonal target box on the receiver's side.
  const targetBottom = !serverBottom;
  const tx = serverOnLeft ? NET : SVC_L;
  const tw = SVC_R - NET;
  const ty = targetBottom ? MID : Y0 + ALLEY;
  const th = targetBottom ? Y1 - ALLEY - MID : MID - Y0 - ALLEY;
  const rx = serverOnLeft ? X1 + 10 : X0 - 10;
  const ry = targetBottom ? (MID + inBottom) / 2 + 20 : (MID + inTop) / 2 - 20;
  const titleId = `${id}-t`;
  const descId = `${id}-d`;
  const side = props.serveSide === "deuce" ? "deuce court" : "advantage court";

  return (
    <figure className="relative w-full">
      <div className="relative w-full overflow-hidden rounded-xl border border-border" style={{ aspectRatio: "780 / 360" }}>
        <svg viewBox="0 0 780 360" className="absolute inset-0 size-full" role="img" aria-labelledby={`${titleId} ${descId}`}>
          <title id={titleId}>Court diagram</title>
          <desc id={descId}>
            {`${props.leftLabel} on the left end, ${props.rightLabel} on the right end. ${props.serverLabel} serves from the ${side} to ${props.receiverLabel}.`}
          </desc>
          <rect x="0" y="0" width="780" height="360" fill={c.out} />
          <rect x={X0} y={Y0} width={X1 - X0} height={Y1 - Y0} fill={c.in} />
          <rect x={tx} y={ty} width={tw} height={th} fill="#ffffff" opacity="0.18" className="court-target" />
          <g stroke="#ffffff" strokeWidth="3" fill="none">
            <rect x={X0} y={Y0} width={X1 - X0} height={Y1 - Y0} />
            <line x1={X0} y1={Y0 + ALLEY} x2={X1} y2={Y0 + ALLEY} />
            <line x1={X0} y1={Y1 - ALLEY} x2={X1} y2={Y1 - ALLEY} />
            <line x1={SVC_L} y1={Y0 + ALLEY} x2={SVC_L} y2={Y1 - ALLEY} />
            <line x1={SVC_R} y1={Y0 + ALLEY} x2={SVC_R} y2={Y1 - ALLEY} />
            <line x1={SVC_L} y1={MID} x2={SVC_R} y2={MID} />
            <line x1={X0} y1={MID} x2={X0 + 10} y2={MID} />
            <line x1={X1 - 10} y1={MID} x2={X1} y2={MID} />
          </g>
          <line x1={NET} y1={Y0 - 14} x2={NET} y2={Y1 + 14} stroke="#f4f4f5" strokeWidth="5" />
          <line x1={NET} y1={Y0 - 14} x2={NET} y2={Y1 + 14} stroke="#18181b" strokeWidth="1.5" strokeDasharray="3 3" />
          <line x1={sx} y1={sy} x2={tx + tw / 2} y2={ty + th / 2} stroke="#fde047" strokeWidth="2" strokeDasharray="6 6" opacity="0.9" />
          <circle cx={rx} cy={ry} r="9" fill="#ffffff" stroke="#18181b" strokeWidth="2" />
          <circle cx={sx} cy={sy} r="11" fill="#d9f99d" stroke="#3f6212" strokeWidth="2.5" />
          <path
            d={`M ${sx - 8} ${sy - 5} Q ${sx} ${sy} ${sx - 8} ${sy + 5} M ${sx + 8} ${sy - 5} Q ${sx} ${sy} ${sx + 8} ${sy + 5}`}
            stroke="#3f6212"
            strokeWidth="1.5"
            fill="none"
          />
        </svg>
        <div className="absolute inset-0 grid grid-cols-2">
          <div className="relative">{props.leftSlot}</div>
          <div className="relative">{props.rightSlot}</div>
        </div>
      </div>
      {props.caption && <figcaption className="mt-2 text-sm text-muted-foreground">{props.caption}</figcaption>}
    </figure>
  );
}
