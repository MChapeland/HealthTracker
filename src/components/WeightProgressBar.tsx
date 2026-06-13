import { computeWeightProgress } from "../lib/weight";
import { SectionHeader } from "./SectionHeader";

interface Props {
  startingWeight: number | null;
  targetWeight: number | null;
  currentWeight: number | null;
  /** Renders inside another section (e.g. day edit weight card) without its own outer card */
  embedded?: boolean;
}

function markerTransform(edge: "start" | "end"): string {
  return edge === "start" ? "translateX(0)" : "translateX(-100%)";
}

function cursorLabelTransform(pct: number): string {
  if (pct <= 10) return "translateX(0)";
  if (pct >= 90) return "translateX(-100%)";
  return "translateX(-50%)";
}

export function WeightProgressBar({
  startingWeight,
  targetWeight,
  currentWeight,
  embedded = false,
}: Props) {
  const progress = computeWeightProgress(
    startingWeight,
    targetWeight,
    currentWeight
  );

  const wrapperClass = embedded
    ? "mt-4 border-t border-slate-800 pt-4"
    : "rounded-xl border border-slate-800 bg-slate-900/50 p-4";

  if (!progress) {
    return (
      <div className={wrapperClass}>
        <SectionHeader kind="weight" className="mb-4 text-sm font-medium text-slate-400">
          Weight goal
        </SectionHeader>
        <p className="text-sm text-slate-500">
          Set starting and target weight in Settings to see progress.
        </p>
      </div>
    );
  }

  const pct = progress.barPosition;

  return (
    <div className={wrapperClass}>
      <SectionHeader kind="weight" className="mb-4 text-sm font-medium text-slate-400">
        Weight goal
      </SectionHeader>
      <div className="flex flex-col items-stretch gap-4 lg:flex-row lg:items-center lg:gap-5">
        <div className="min-w-0 flex-1">
          <div className="pt-6">
            <div className="relative">
              <div
                className="pointer-events-none absolute bottom-full z-10 mb-1 whitespace-nowrap text-xs font-semibold text-emerald-400"
                style={{
                  left: `${pct}%`,
                  transform: cursorLabelTransform(pct),
                }}
              >
                {progress.current.toFixed(1)} kg
              </div>
              <div className="relative h-4 overflow-hidden rounded-full bg-slate-800">
                <div
                  className="absolute inset-y-0 left-0 bg-emerald-600/50"
                  style={{ width: `${pct}%` }}
                />
                <div
                  className="absolute top-0 bottom-0 z-10 w-0.5 bg-white shadow"
                  style={{ left: `${pct}%` }}
                />
              </div>
              <div className="relative mt-1 h-4 text-xs text-slate-500">
                <span
                  className="absolute whitespace-nowrap"
                  style={{ left: "0%", transform: markerTransform("start") }}
                >
                  {progress.start.toFixed(1)}
                </span>
                <span
                  className="absolute whitespace-nowrap"
                  style={{ left: "100%", transform: markerTransform("end") }}
                >
                  {progress.target.toFixed(1)}
                </span>
              </div>
            </div>
          </div>
        </div>
        <div className="shrink-0 lg:w-44 lg:border-l lg:border-slate-800 lg:pl-5">
          <div className="grid grid-cols-2 gap-2 text-center text-xs">
            <div>
              <p className="text-slate-500">Remaining</p>
              <p className="font-semibold">
                {progress.remainingToGoal.toFixed(1)} kg
              </p>
            </div>
            <div>
              <p className="text-slate-500">Progress</p>
              <p className="font-semibold">
                {progress.percentComplete.toFixed(0)}%
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
