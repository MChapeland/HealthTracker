import type { WorkoutIntensity } from "../types";

export function WorkoutSummary({
  workedOut,
  durationMin,
  intensity,
  durationClassName = "",
  intensityClassName = "text-sm font-normal text-slate-500",
  emptyClassName = "",
  showIntensity = true,
}: {
  workedOut: boolean;
  durationMin: number | null;
  intensity: WorkoutIntensity | null;
  durationClassName?: string;
  intensityClassName?: string;
  /** Applied only to the placeholder dash (e.g. timeline empty state). */
  emptyClassName?: string;
  showIntensity?: boolean;
}) {
  const empty = <span className={emptyClassName}>0 min</span>;
  if (!workedOut) return empty;
  const intensityLabel =
    showIntensity && intensity
      ? intensity.charAt(0).toUpperCase() + intensity.slice(1)
      : null;
  if (durationMin == null && !intensityLabel) return empty;
  return (
    <>
      {durationMin != null ? (
        <span className={durationClassName}>{durationMin} mins</span>
      ) : null}
      {intensityLabel ? (
        <span className={intensityClassName}>
          {durationMin != null ? " " : null}({intensityLabel})
        </span>
      ) : null}
    </>
  );
}
