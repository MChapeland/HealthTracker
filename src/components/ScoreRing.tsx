import type { ReactNode } from "react";

export function ScoreRing({
  percent,
  label,
  ringColorClass,
  ringTrackClass,
  size = 52,
  stroke = 7,
  center,
}: {
  percent: number;
  label?: string;
  ringColorClass: string;
  ringTrackClass: string;
  size?: number;
  stroke?: number;
  center?: ReactNode;
}) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.max(0, percent) / 100;
  const dashOffset = circumference - progress * circumference;

  return (
    <div className="flex flex-col items-center text-center">
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg
          width={size}
          height={size}
          className="relative z-0 -rotate-90"
          aria-hidden
        >
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={stroke}
            className={ringTrackClass}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={stroke}
            strokeLinecap="round"
            className={ringColorClass}
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
          />
        </svg>
        <div className="pointer-events-none absolute inset-0 z-10 flex flex-col items-center justify-center">
          {center ?? (
            <span
              className={`font-semibold tabular-nums ${
                Math.round(percent) <= 0 ? "text-slate-500" : "text-slate-100"
              } ${
                size >= 100 ? "text-2xl" : size >= 72 ? "text-base" : "text-sm"
              }`}
            >
              {Math.round(percent)}
            </span>
          )}
        </div>
      </div>
      {label && (
        <p className="mt-1.5 text-xs font-medium text-slate-300">{label}</p>
      )}
    </div>
  );
}
