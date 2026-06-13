import { eachDayOfInterval, format, parseISO } from "date-fns";
import { interpolateLoggedSeries } from "./analyticsTrend";
import type { MetricsPoint } from "../types";

/** Logged scale reading; 0 means "cleared / not logged" (same as null). */
export function normalizeLoggedWeight(
  weight: number | null | undefined
): number | null {
  if (weight == null || !Number.isFinite(weight) || weight <= 0) return null;
  return weight;
}

/** Y-axis label: whole kg or half kg only (e.g. 82, 82.5). */
export function formatWeightAxisTick(kg: number): string {
  const halfStep = Math.round(kg * 2) / 2;
  if (Math.abs(halfStep - kg) > 0.001) return "";
  if (Number.isInteger(halfStep)) return String(halfStep);
  return halfStep.toFixed(1);
}

function snapDownToHalfKg(kg: number): number {
  return Math.floor(kg * 2) / 2;
}

function snapUpToHalfKg(kg: number): number {
  return Math.ceil(kg * 2) / 2;
}

/** Whole- or half-kg ticks for the analytics weight chart. */
export function weightAxisConfig(values: number[]): {
  domain: [number, number];
  ticks: number[];
} {
  const finite = values.filter((v) => Number.isFinite(v));
  if (finite.length === 0) {
    return { domain: [60, 100], ticks: [60, 70, 80, 90, 100] };
  }

  const padding = 0.5;
  const min = snapDownToHalfKg(Math.min(...finite) - padding);
  const max = snapUpToHalfKg(Math.max(...finite) + padding);
  const range = max - min;

  let step: number;
  if (range <= 4) step = 0.5;
  else if (range <= 10) step = 1;
  else if (range <= 25) step = 2;
  else step = 5;

  const ticks: number[] = [];
  for (let v = min; v <= max + 1e-9; v += step) {
    ticks.push(Math.round(v * 2) / 2);
  }

  return { domain: [min, max], ticks };
}

/** Tooltip display: floor to 2dp, then trim trailing zeros (98.90 → 98.9, 98.00 → 98). */
export function formatWeightTooltipKg(kg: number): string {
  const floored = Math.floor(kg * 100) / 100;
  const fixed = floored.toFixed(2);
  if (fixed.endsWith("00")) return String(Math.trunc(floored));
  if (fixed.endsWith("0")) return floored.toFixed(1);
  return fixed;
}

/** One row per calendar day in [start, end], ascending. */
export function mergeMetricsWithRange(
  records: MetricsPoint[],
  start: string,
  end: string
): MetricsPoint[] {
  const map = new Map(records.map((d) => [d.date, d]));
  const interval = eachDayOfInterval({
    start: parseISO(start),
    end: parseISO(end),
  });
  return interval.map((d) => {
    const key = format(d, "yyyy-MM-dd");
    const existing = map.get(key);
    if (existing) {
      return { ...existing, weight: normalizeLoggedWeight(existing.weight) };
    }
    return (
      {
        date: key,
        weight: null,
        totalCalories: 0,
        steps: null,
        distanceKm: null,
        durationMin: null,
        workedOut: false,
        workoutDurationMin: null,
        workoutIntensity: null,
        workoutCalories: null,
        workoutCaloriesOverride: false,
        dailyScore: null,
        waterMl: null,
        teethBrushings: null,
      }
    );
  });
}

export function averageLoggedWeight(
  points: Array<{ weight: number | null }>
): number | null {
  const vals = points
    .map((p) => normalizeLoggedWeight(p.weight))
    .filter((w): w is number => w != null);
  if (vals.length === 0) return null;
  return vals.reduce((a, b) => a + b, 0) / vals.length;
}

/** Linear weight between logged entries (see {@link interpolateLoggedSeries}). */
export function interpolateWeightSeries(
  points: Array<{ date: string; weight: number | null }>
): Array<number | null> {
  return interpolateLoggedSeries(
    points.map((p) => ({
      date: p.date,
      value: normalizeLoggedWeight(p.weight),
    }))
  );
}
