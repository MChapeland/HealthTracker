import { calorieZoneTextClass, getCalorieZone } from "../lib/calories";
import type { Settings } from "../types";
import { CalorieZoneTrack } from "./CalorieZoneTrack";

interface Props {  calories: number;
  settings: Settings;
  hideTitle?: boolean;
  className?: string;
}

type MarkerEdge = "start" | "center" | "end";

function markerTransform(edge: MarkerEdge): string {
  if (edge === "start") return "translateX(0)";
  if (edge === "end") return "translateX(-100%)";
  return "translateX(-50%)";
}

function cursorLabelTransform(pct: number): string {
  if (pct <= 10) return "translateX(0)";
  if (pct >= 90) return "translateX(-100%)";
  return "translateX(-50%)";
}

export function CalorieZoneBar({
  calories,
  settings,
  hideTitle,
  className = "",
}: Props) {
  const zone = getCalorieZone(
    calories,
    settings.calorieIdealMin,
    settings.calorieIdealMax,
    settings.calorieWarningBelow,
    settings.calorieWarning,
    settings.calorieMax
  );

  const max = settings.calorieMax;
  const pct = Math.min(100, (calories / max) * 100);
  const idealStart = (settings.calorieIdealMin / max) * 100;
  const idealEnd = (settings.calorieIdealMax / max) * 100;
  const warnEnd = (settings.calorieWarning / max) * 100;

  const warnBelowEnd =
    (settings.calorieWarningBelow / max) * 100;

  const markers: { value: number; pct: number; edge: MarkerEdge }[] = [
    { value: 0, pct: 0, edge: "start" },
    {
      value: settings.calorieWarningBelow,
      pct: warnBelowEnd,
      edge: "center",
    },
    { value: settings.calorieIdealMin, pct: idealStart, edge: "center" },
    { value: settings.calorieIdealMax, pct: idealEnd, edge: "center" },
    { value: settings.calorieWarning, pct: warnEnd, edge: "center" },
    { value: max, pct: 100, edge: "end" },
  ];

  return (
    <div className={className}>
      {!hideTitle && (
        <p className="mb-6 text-sm text-slate-400">Daily calories</p>
      )}
      <div className={hideTitle ? "pt-6" : undefined}>
        <div className="relative">
          <div
            className={`pointer-events-none absolute bottom-full z-10 mb-1.5 whitespace-nowrap text-xs font-semibold ${calorieZoneTextClass(zone)}`}
            style={{
              left: `${pct}%`,
              transform: cursorLabelTransform(pct),
            }}
          >
            {calories.toFixed(0)} kcal
          </div>
          <CalorieZoneTrack
            calorieIdealMin={settings.calorieIdealMin}
            calorieIdealMax={settings.calorieIdealMax}
            calorieWarningBelow={settings.calorieWarningBelow}
            calorieWarning={settings.calorieWarning}
            calorieMax={settings.calorieMax}
          >
            <div
              className="pointer-events-none absolute top-0 bottom-0 z-10 w-0.5 bg-white shadow"
              style={{ left: `${pct}%` }}
            />
          </CalorieZoneTrack>
        </div>
        <div className="relative mt-1 h-4 text-xs text-slate-500">
          {markers.map((m) => (
            <span
              key={m.value}
              className="absolute whitespace-nowrap"
              style={{
                left: `${m.pct}%`,
                transform: markerTransform(m.edge),
              }}
            >
              {m.value}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
