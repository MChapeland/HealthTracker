import type { DayScore, DayRecord, Settings } from "../types";

export interface ScoreBreakdown {
  calories: number;
  walking: number;
  water: number;
  teeth: number;
  total: number;
  rating: DayScore;
}

/** Ring stroke color from score vs good/okay day thresholds (0–100). */
export function scoreRingColor(
  score: number,
  goodThreshold: number,
  okayThreshold: number
): string {
  if (score >= 100) return "text-violet-400";
  if (score >= goodThreshold) return "text-emerald-400";
  if (score >= okayThreshold) return "text-amber-400";
  return "text-red-400";
}

/** Full ring track behind the progress arc (unfilled portion). */
export function scoreRingTrackColor(
  score: number,
  goodThreshold: number,
  okayThreshold: number
): string {
  if (score >= 100) return "text-violet-500/38";
  if (score >= goodThreshold) return "text-emerald-500/38";
  if (score >= okayThreshold) return "text-amber-500/38";
  return "text-red-500/38";
}

/** Overall daily ring from stored/display rating. */
export function ratingRingColor(rating: DayScore): string {
  switch (rating) {
    case "perfect":
      return "text-violet-400";
    case "good":
      return "text-emerald-400";
    case "okay":
      return "text-amber-400";
    case "bad":
      return "text-red-400";
  }
}

export function ratingRingTrackColor(rating: DayScore): string {
  switch (rating) {
    case "perfect":
      return "text-violet-500/38";
    case "good":
      return "text-emerald-500/38";
    case "okay":
      return "text-amber-500/38";
    case "bad":
      return "text-red-500/38";
  }
}

/** Progress vs goal for ring arc (can exceed 100 when over target). */
export function macroRingProgressPercent(
  actual: number | null | undefined,
  goal: number | null | undefined
): number | null {
  if (goal == null || goal <= 0) return null;
  const a = actual ?? 0;
  if (a <= 0) return 0;
  return (a / goal) * 100;
}

/** Up to three concentric rings: each full ring = 100% of goal (two overflow rings max). */
export type MacroRingLayers = {
  ringCount: 1 | 2 | 3;
  /** Fill 0–100 for each ring, innermost first. */
  fills: number[];
};

export function macroRingLayers(
  actual: number | null | undefined,
  goal: number | null | undefined
): MacroRingLayers | null {
  if (goal == null || goal <= 0) return null;
  const a = actual ?? 0;
  if (a <= 0) return { ringCount: 1, fills: [0] };

  const totalPercent = (a / goal) * 100;
  const ringCount: 1 | 2 | 3 =
    totalPercent > 200 ? 3 : totalPercent > 100 ? 2 : 1;

  const fills: number[] = [
    Math.min(100, totalPercent),
    Math.min(100, Math.max(0, totalPercent - 100)),
    Math.min(100, Math.max(0, totalPercent - 200)),
  ].slice(0, ringCount);

  return { ringCount, fills };
}

/** Within ±this fraction of goal counts as a perfect macro score. */
const MACRO_GOAL_TOLERANCE = 0.05;

/**
 * Macro score 0–100. Within ±5% of goal = 100.
 * Below that band, scales up linearly; above, loses 1 point per 1% over the band.
 */
export function scoreMacroAmount(
  actual: number | null | undefined,
  goal: number | null | undefined
): number | null {
  if (goal == null || goal <= 0) return null;
  const a = actual ?? 0;
  if (a <= 0) return 0;
  const ratio = a / goal;
  const low = 1 - MACRO_GOAL_TOLERANCE;
  const high = 1 + MACRO_GOAL_TOLERANCE;
  if (ratio >= low && ratio <= high) return 100;
  if (ratio < low) return Math.round((ratio / low) * 100);
  const overshootPercent = (ratio - high) * 100;
  return Math.max(0, Math.round(100 - overshootPercent));
}

function scoreFood(
  day: Pick<
    DayRecord,
    | "totalCalories"
    | "totalCarbs"
    | "totalFat"
    | "totalProtein"
    | "totalFiber"
    | "totalSalt"
  >,
  settings: Settings
): number {
  const calorieScore = scoreCalories(day.totalCalories, settings);

  const macroScores = [
    scoreMacroAmount(day.totalCarbs, settings.macroGoalCarbs),
    scoreMacroAmount(day.totalFat, settings.macroGoalFat),
    scoreMacroAmount(day.totalProtein, settings.macroGoalProtein),
    scoreMacroAmount(day.totalFiber, settings.macroGoalFiber),
    scoreMacroAmount(day.totalSalt, settings.macroGoalSalt),
  ].filter((s): s is number => s != null);

  if (macroScores.length === 0) return calorieScore;

  const macroAvg = Math.round(
    macroScores.reduce((sum, s) => sum + s, 0) / macroScores.length
  );
  const wKcal = settings.scoreWeightFoodKcal;
  const wMacro = settings.scoreWeightFoodMacros;
  const wTotal = wKcal + wMacro;
  const w = wTotal > 0 ? wTotal : 100;
  return Math.round((calorieScore * wKcal + macroAvg * wMacro) / w);
}

function scoreCalories(
  totalCalories: number,
  settings: Settings
): number {
  const {
    calorieIdealMin,
    calorieIdealMax,
    calorieWarningBelow,
    calorieWarning,
    calorieMax,
  } = settings;
  if (totalCalories >= calorieMax || totalCalories > calorieWarning) return 0;
  if (totalCalories >= calorieIdealMin && totalCalories <= calorieIdealMax) {
    return 100;
  }
  if (totalCalories < calorieWarningBelow) {
    const gap = calorieWarningBelow - totalCalories;
    const range = Math.max(calorieWarningBelow, 1);
    return Math.max(0, 100 - (gap / range) * 100);
  }
  if (totalCalories < calorieIdealMin) {
    const gap = calorieIdealMin - totalCalories;
    const range = Math.max(calorieIdealMin - calorieWarningBelow, 1);
    return Math.max(0, 100 - (gap / range) * 80);
  }
  const gap = totalCalories - calorieIdealMax;
  const range = calorieWarning - calorieIdealMax;
  return Math.max(0, 100 - (gap / Math.max(range, 1)) * 80);
}

function scoreWalking(steps: number | null, settings: Settings): number {
  if (steps == null || steps <= 0) return 0;
  const goal = settings.dailyStepsGoal;
  if (steps >= goal) return 100;
  return Math.round((steps / goal) * 100);
}

function scoreWater(waterMl: number | null, settings: Settings): number {
  if (waterMl == null || waterMl <= 0) return 0;
  const goal = settings.dailyWaterGoalMl;
  if (goal <= 0) return 0;
  if (waterMl >= goal) return 100;
  return Math.round((waterMl / goal) * 100);
}

function scoreTeethBrushings(
  teethBrushings: number | null,
  settings: Settings
): number {
  if (teethBrushings == null || teethBrushings <= 0) return 0;
  const goal = settings.dailyTeethBrushingsGoal;
  if (goal <= 0) return 0;
  if (teethBrushings >= goal) return 100;
  return Math.round((teethBrushings / goal) * 100);
}

export function dayHasScoreData(
  day: Pick<
    DayRecord,
    | "exists"
    | "totalCalories"
    | "steps"
    | "waterMl"
    | "teethBrushings"
    | "weight"
  >
): boolean {
  return (
    day.exists ||
    day.totalCalories > 0 ||
    day.waterMl != null ||
    day.teethBrushings != null ||
    day.steps != null ||
    day.weight != null
  );
}

/** Live rating from current settings — not the stale value stored on the day row. */
export function resolveDayRating(
  day: Pick<
    DayRecord,
    | "totalCalories"
    | "totalCarbs"
    | "totalFat"
    | "totalProtein"
    | "totalFiber"
    | "totalSalt"
    | "steps"
    | "waterMl"
    | "teethBrushings"
    | "weight"
    | "exists"
  >,
  settings: Settings
): DayScore | null {
  if (!dayHasScoreData(day)) return null;
  return computeDailyScore(day, settings).rating;
}

export function computeDailyScore(
  day: Pick<
    DayRecord,
    | "totalCalories"
    | "totalCarbs"
    | "totalFat"
    | "totalProtein"
    | "totalFiber"
    | "totalSalt"
    | "steps"
    | "waterMl"
    | "teethBrushings"
  >,
  settings: Settings
): ScoreBreakdown {
  const calories = scoreFood(day, settings);
  const walking = scoreWalking(day.steps, settings);
  const water = scoreWater(day.waterMl, settings);
  const teeth = scoreTeethBrushings(day.teethBrushings, settings);

  const totalWeight =
    settings.scoreWeightCalories +
    settings.scoreWeightWalking +
    settings.scoreWeightWorkout +
    settings.scoreWeightTeeth;
  const w = totalWeight > 0 ? totalWeight : 100;

  const total = Math.round(
    (calories * settings.scoreWeightCalories +
      walking * settings.scoreWeightWalking +
      water * settings.scoreWeightWorkout +
      teeth * settings.scoreWeightTeeth) /
      w
  );

  const warning = settings.calorieWarning;
  const overCalorieWarning = warning > 0 && day.totalCalories > warning;

  let rating: DayScore;
  if (overCalorieWarning) {
    rating = "bad";
  } else if (total >= 100) {
    rating = "perfect";
  } else if (total >= settings.scoreGoodThreshold) {
    rating = "good";
  } else if (total >= settings.scoreOkayThreshold) {
    rating = "okay";
  } else {
    rating = "bad";
  }

  return { calories, walking, water, teeth, total, rating };
}

/** Mean composite score (0–100) for days on or after periodStart (yyyy-MM-dd). */
export function averageDailyScore(
  days: Pick<
    DayRecord,
    | "totalCalories"
    | "totalCarbs"
    | "totalFat"
    | "totalProtein"
    | "totalFiber"
    | "totalSalt"
    | "steps"
    | "waterMl"
    | "teethBrushings"
    | "date"
  >[],
  settings: Settings,
  periodStart: string
): number | null {
  const inPeriod = days.filter((d) => d.date >= periodStart);
  if (inPeriod.length === 0) return null;
  const sum = inPeriod.reduce(
    (acc, d) => acc + computeDailyScore(d, settings).total,
    0
  );
  return Math.round(sum / inPeriod.length);
}
