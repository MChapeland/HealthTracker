import { differenceInCalendarDays, parseISO } from "date-fns";
import { normalizeLoggedWeight } from "../weightAnalytics";
import type { AiFeedbackConfidence, MetricsPoint } from "../../types";

export function linearRegressionSlope(
  points: Array<{ x: number; y: number }>
): number | null {
  if (points.length < 2) return null;
  const n = points.length;
  const sumX = points.reduce((a, p) => a + p.x, 0);
  const sumY = points.reduce((a, p) => a + p.y, 0);
  const sumXY = points.reduce((a, p) => a + p.x * p.y, 0);
  const sumXX = points.reduce((a, p) => a + p.x * p.x, 0);
  const denom = n * sumXX - sumX * sumX;
  if (Math.abs(denom) < 1e-9) return null;
  return (n * sumXY - sumX * sumY) / denom;
}

/** Slope per calendar day → kg/week. */
export function slopePerWeekKg(
  dates: string[],
  values: number[]
): number | null {
  if (dates.length < 2 || dates.length !== values.length) return null;
  const origin = parseISO(dates[0]);
  const points = dates.map((date, i) => ({
    x: differenceInCalendarDays(parseISO(date), origin),
    y: values[i],
  }));
  const slopePerDay = linearRegressionSlope(points);
  return slopePerDay == null ? null : slopePerDay * 7;
}

export function movingAverage(values: number[], window: number): number | null {
  if (values.length === 0) return null;
  const slice = values.slice(-window);
  if (slice.length === 0) return null;
  return slice.reduce((a, b) => a + b, 0) / slice.length;
}

export function countLoggedDays(
  points: MetricsPoint[],
  predicate: (p: MetricsPoint) => boolean
): number {
  return points.filter(predicate).length;
}

export function coefficientOfVariation(values: number[]): number | null {
  if (values.length < 2) return null;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  if (mean === 0) return null;
  const variance =
    values.reduce((a, v) => a + (v - mean) ** 2, 0) / values.length;
  return Math.sqrt(variance) / Math.abs(mean);
}

export function averageOf(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

export function detectRecentChange(
  values: number[],
  recentWindow: number,
  priorWindow: number
): { recentAvg: number; priorAvg: number; pctChange: number } | null {
  if (values.length < recentWindow + priorWindow) return null;
  const prior = values.slice(-(recentWindow + priorWindow), -recentWindow);
  const recent = values.slice(-recentWindow);
  const priorAvg = averageOf(prior);
  const recentAvg = averageOf(recent);
  if (priorAvg == null || recentAvg == null || priorAvg === 0) return null;
  return {
    priorAvg,
    recentAvg,
    pctChange: ((recentAvg - priorAvg) / priorAvg) * 100,
  };
}

export function findLongestMissStreak(
  points: MetricsPoint[],
  hasData: (p: MetricsPoint) => boolean
): number {
  let max = 0;
  let current = 0;
  for (const point of points) {
    if (hasData(point)) {
      current = 0;
    } else {
      current += 1;
      max = Math.max(max, current);
    }
  }
  return max;
}

export function computeDomainLogRate(
  points: MetricsPoint[],
  hasData: (p: MetricsPoint) => boolean
): number {
  if (points.length === 0) return 0;
  return countLoggedDays(points, hasData) / points.length;
}

export function loggedWeights(points: MetricsPoint[]): Array<{
  date: string;
  weight: number;
}> {
  return points.flatMap((p) => {
    const w = normalizeLoggedWeight(p.weight);
    return w != null ? [{ date: p.date, weight: w }] : [];
  });
}

export function confidenceFromCompleteness(
  logged: number,
  required: number,
  totalDays: number
): { confidence: AiFeedbackConfidence; reason: string } {
  const ratio = required > 0 ? logged / required : logged / totalDays;
  if (ratio >= 0.85) {
    return { confidence: "high", reason: "Good logging coverage for this topic." };
  }
  if (ratio >= 0.5) {
    return {
      confidence: "medium",
      reason: "Some gaps in your logs may affect this analysis.",
    };
  }
  return {
    confidence: "low",
    reason: "Limited data — treat this as a rough guide.",
  };
}

export function isAnyLoggedDay(p: MetricsPoint): boolean {
  return (
    normalizeLoggedWeight(p.weight) != null ||
    p.totalCalories > 0 ||
    p.steps != null ||
    p.workedOut ||
    p.waterMl != null ||
    p.teethBrushings != null
  );
}

export function hasCalorieLog(p: MetricsPoint): boolean {
  return p.totalCalories > 0;
}

export function hasStepsLog(p: MetricsPoint): boolean {
  return p.steps != null && p.steps > 0;
}

export function hasWorkoutLog(p: MetricsPoint): boolean {
  return p.workedOut;
}

export function hasWaterLog(p: MetricsPoint): boolean {
  return p.waterMl != null && p.waterMl > 0;
}

export function hasTeethLog(p: MetricsPoint): boolean {
  return p.teethBrushings != null && p.teethBrushings > 0;
}

export function hasWeightLog(p: MetricsPoint): boolean {
  return normalizeLoggedWeight(p.weight) != null;
}
