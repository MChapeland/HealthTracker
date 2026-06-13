import { useCallback, useEffect, useRef, useState } from "react";
import {
  calorieTargetPercents,
  normalizeCalorieTargets,
  type CalorieTargets,
} from "../lib/calories";
import { NumberInput } from "./NumberInput";
import { CalorieZoneTrack } from "./CalorieZoneTrack";

type ThresholdKey =
  | "calorieWarningBelow"
  | "calorieIdealMin"
  | "calorieIdealMax"
  | "calorieWarning";

const THRESHOLD_STEP = 50;

function snapThreshold(value: number): number {
  return Math.round(value / THRESHOLD_STEP) * THRESHOLD_STEP;
}

const THRESHOLDS: { key: ThresholdKey; label: string }[] = [
  { key: "calorieWarningBelow", label: "Warning below" },
  { key: "calorieIdealMin", label: "Ideal min" },
  { key: "calorieIdealMax", label: "Ideal max" },
  { key: "calorieWarning", label: "Warning above" },
];

type Props = {
  targets: CalorieTargets;
  onChange: (next: CalorieTargets) => void;
};

function markerTransform(pct: number): string {
  if (pct <= 8) return "translateX(0)";
  if (pct >= 92) return "translateX(-100%)";
  return "translateX(-50%)";
}

function clampValueForKey(
  key: ThresholdKey,
  value: number,
  current: CalorieTargets
): number {
  const gap = 50;
  const max = current.calorieMax;
  switch (key) {
    case "calorieWarningBelow":
      return Math.max(0, Math.min(value, current.calorieIdealMin - gap));
    case "calorieIdealMin":
      return Math.max(
        current.calorieWarningBelow + gap,
        Math.min(value, current.calorieIdealMax - gap)
      );
    case "calorieIdealMax":
      return Math.max(
        current.calorieIdealMin + gap,
        Math.min(value, current.calorieWarning - gap)
      );
    case "calorieWarning":
      return Math.max(
        current.calorieIdealMax + gap,
        Math.min(value, max - gap)
      );
  }
}

export function CalorieTargetsEditor({ targets, onChange }: Props) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState<ThresholdKey | null>(null);
  const [maxDraft, setMaxDraft] = useState<string | null>(null);

  useEffect(() => {
    setMaxDraft(null);
  }, [
    targets.calorieIdealMin,
    targets.calorieIdealMax,
    targets.calorieWarningBelow,
    targets.calorieWarning,
    targets.calorieMax,
  ]);

  const {
    calorieWarningBelow,
    calorieIdealMin,
    calorieIdealMax,
    calorieWarning,
    calorieMax,
  } = targets;
  const pcts = calorieTargetPercents(targets);

  const applyTargets = useCallback(
    (patch: Partial<CalorieTargets>) => {
      onChange(normalizeCalorieTargets({ ...targets, ...patch }));
    },
    [onChange, targets]
  );

  const commitMaxInput = useCallback(() => {
    const raw = maxDraft ?? String(calorieMax);
    setMaxDraft(null);
    if (raw === "") return;
    const n = parseInt(raw, 10);
    if (Number.isNaN(n)) return;
    if (n !== calorieMax) {
      applyTargets({ calorieMax: n });
    }
  }, [applyTargets, calorieMax, maxDraft]);

  const positionToValue = useCallback(
    (clientX: number, key: ThresholdKey) => {
      const el = trackRef.current;
      if (!el || calorieMax <= 0) return;
      const rect = el.getBoundingClientRect();
      const ratio = Math.max(
        0,
        Math.min(1, (clientX - rect.left) / rect.width)
      );
      const raw = snapThreshold(Math.round(ratio * calorieMax));
      applyTargets({ [key]: clampValueForKey(key, raw, targets) });
    },
    [applyTargets, calorieMax, targets]
  );

  useEffect(() => {
    if (!dragging) return;

    const onMove = (e: PointerEvent) => {
      positionToValue(e.clientX, dragging);
    };
    const onUp = () => setDragging(null);

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [dragging, positionToValue]);

  const thresholdPct = (key: ThresholdKey) => {
    const value = targets[key];
    return calorieMax > 0 ? (value / calorieMax) * 100 : 0;
  };

  const markerRows: { value: number; pct: number }[] = [
    { value: 0, pct: 0 },
    { value: calorieWarningBelow, pct: pcts.warnBelowEnd },
    { value: calorieIdealMin, pct: pcts.idealStart },
    { value: calorieIdealMax, pct: pcts.idealEnd },
    { value: calorieWarning, pct: pcts.warnEnd },
    { value: calorieMax, pct: 100 },
  ];

  return (
    <div>
      <p className="mb-3 text-xs text-slate-500">
        Daily calories range targets (Drag the markers to set custom ranges).
      </p>

      <div className="flex items-start gap-4">
        <div className="min-w-0 flex-1">
          <div ref={trackRef}>
            <CalorieZoneTrack {...targets}>
              {THRESHOLDS.map(({ key, label }) => (
                <div
                  key={key}
                  className="absolute top-0 bottom-0 z-10 w-4 -translate-x-1/2 cursor-ew-resize touch-none"
                  style={{ left: `${thresholdPct(key)}%` }}
                  onPointerDown={(e) => {
                    e.preventDefault();
                    setDragging(key);
                  }}
                  role="slider"
                  aria-label={label}
                  aria-valuemin={0}
                  aria-valuemax={calorieMax}
                  aria-valuenow={targets[key]}
                >
                  <div className="absolute top-1/2 left-1/2 h-5 w-0.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white shadow" />
                </div>
              ))}
            </CalorieZoneTrack>
          </div>

          <div className="relative mt-1 h-5 text-xs text-slate-500">
            {markerRows.map((m) => (
              <span
                key={`${m.pct}-${m.value}`}
                className="absolute font-medium whitespace-nowrap text-slate-400"
                style={{
                  left: `${m.pct}%`,
                  transform: markerTransform(m.pct),
                }}
              >
                {m.value}
              </span>
            ))}
          </div>
        </div>

        <div className="relative w-24 shrink-0 -mt-2">
          <label className="absolute bottom-full left-0 mb-0.5 block whitespace-nowrap text-[10px] leading-tight text-slate-500">
            Max (kcal)
          </label>
          <NumberInput
            className="w-full rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1.5 text-sm tabular-nums"
            value={maxDraft ?? String(calorieMax)}
            onChange={(e) => setMaxDraft(e.target.value)}
            onBlur={commitMaxInput}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.currentTarget.blur();
              }
            }}
          />
        </div>
      </div>
    </div>
  );
}
