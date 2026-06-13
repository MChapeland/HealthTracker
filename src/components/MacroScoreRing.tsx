import type { ReactNode } from "react";
import type { MacroRingLayers } from "../lib/scoring";

const RING_GAP = 2;

type RingGeom = { radius: number; strokeWidth: number };

function buildRingGeometry(
  ringCount: number,
  size: number,
  stroke: number
): { rings: RingGeom[]; canvasSize: number } {
  const thinStroke = stroke / 2;
  const rings: RingGeom[] = [
    { radius: (size - stroke) / 2, strokeWidth: stroke },
  ];

  for (let i = 1; i < ringCount; i++) {
    const prev = rings[i - 1]!;
    rings.push({
      radius: prev.radius + prev.strokeWidth / 2 + RING_GAP + thinStroke / 2,
      strokeWidth: thinStroke,
    });
  }

  const last = rings[rings.length - 1]!;
  const canvasSize = Math.ceil(last.radius * 2 + last.strokeWidth + 2);
  return { rings, canvasSize: Math.max(size, canvasSize) };
}

type Props = {
  layers: MacroRingLayers;
  ringColorClass: string;
  ringTrackClass: string;
  size?: number;
  stroke?: number;
  center?: ReactNode;
};

export function MacroScoreRing({
  layers,
  ringColorClass,
  ringTrackClass,
  size = 44,
  stroke = 5,
  center,
}: Props) {
  const { rings, canvasSize } = buildRingGeometry(
    layers.ringCount,
    size,
    stroke
  );

  return (
    <div
      className="relative shrink-0 overflow-visible"
      style={{ width: size, height: size }}
    >
      <svg
        width={canvasSize}
        height={canvasSize}
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 -rotate-90"
        aria-hidden
      >
        {layers.fills.map((fill, index) => {
          const { radius, strokeWidth } = rings[index]!;
          const circumference = 2 * Math.PI * radius;
          const dashOffset =
            circumference - (Math.max(0, fill) / 100) * circumference;

          return (
            <g key={index}>
              <circle
                cx={canvasSize / 2}
                cy={canvasSize / 2}
                r={radius}
                fill="none"
                stroke="currentColor"
                strokeWidth={strokeWidth}
                className={ringTrackClass}
              />
              <circle
                cx={canvasSize / 2}
                cy={canvasSize / 2}
                r={radius}
                fill="none"
                stroke="currentColor"
                strokeWidth={strokeWidth}
                strokeLinecap="round"
                className={ringColorClass}
                strokeDasharray={circumference}
                strokeDashoffset={dashOffset}
              />
            </g>
          );
        })}
      </svg>
      <div className="pointer-events-none absolute inset-0 z-10 flex flex-col items-center justify-center">
        {center}
      </div>
    </div>
  );
}
