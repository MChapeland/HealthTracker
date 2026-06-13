import type { Settings } from "../types";

export const SCORE_WEIGHT_KEYS = [
  "scoreWeightCalories",
  "scoreWeightWalking",
  "scoreWeightWorkout",
  "scoreWeightTeeth",
] as const;

export const FOOD_SCORE_WEIGHT_KEYS = [
  "scoreWeightFoodKcal",
  "scoreWeightFoodMacros",
] as const;

export type ScoreWeightKey = (typeof SCORE_WEIGHT_KEYS)[number];
export type FoodScoreWeightKey = (typeof FOOD_SCORE_WEIGHT_KEYS)[number];

export const DEFAULT_SCORE_WEIGHTS: Pick<
  Settings,
  ScoreWeightKey
> = {
  scoreWeightCalories: 60,
  scoreWeightWalking: 20,
  scoreWeightWorkout: 10,
  scoreWeightTeeth: 10,
};

export const DEFAULT_FOOD_SCORE_WEIGHTS: Pick<
  Settings,
  FoodScoreWeightKey
> = {
  scoreWeightFoodKcal: 75,
  scoreWeightFoodMacros: 25,
};

export function scoreWeightTotal(s: Settings): number {
  return (
    s.scoreWeightCalories +
    s.scoreWeightWalking +
    s.scoreWeightWorkout +
    s.scoreWeightTeeth
  );
}

export function foodScoreWeightTotal(s: Settings): number {
  return s.scoreWeightFoodKcal + s.scoreWeightFoodMacros;
}

/** Points left before the group hits the 100 cap (0 when at or over). */
export function scoreWeightHeadroom(total: number): number {
  return Math.max(0, 100 - total);
}

export function maxScoreWeightFor(s: Settings, key: ScoreWeightKey): number {
  const headroom = scoreWeightHeadroom(scoreWeightTotal(s));
  return Math.min(100, s[key] + headroom);
}

export function maxFoodScoreWeightFor(
  s: Settings,
  key: FoodScoreWeightKey
): number {
  const headroom = scoreWeightHeadroom(foodScoreWeightTotal(s));
  return Math.min(100, s[key] + headroom);
}

function clampWeight(value: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, value));
}

export function patchScoreWeight(
  s: Settings,
  key: ScoreWeightKey,
  requested: number
): Partial<Pick<Settings, ScoreWeightKey>> {
  return { [key]: clampWeight(requested, 0, maxScoreWeightFor(s, key)) };
}

export function patchFoodScoreWeight(
  s: Settings,
  key: FoodScoreWeightKey,
  requested: number
): Partial<Pick<Settings, FoodScoreWeightKey>> {
  return { [key]: clampWeight(requested, 0, maxFoodScoreWeightFor(s, key)) };
}
