import { resolveWeightForMetabolism } from "./metabolism";
import type { ActivityLevel, Settings } from "../types";

const ML_PER_KG = 35;
const MIN_GOAL_ML = 1000;

const ACTIVITY_BONUS_ML: Record<ActivityLevel, number> = {
  sedentary: 0,
  light: 250,
  moderate: 500,
  active: 750,
  very_active: 1000,
};

function snapWaterGoal(ml: number): number {
  return Math.round(Math.max(MIN_GOAL_ML, ml) / 100) * 100;
}

function activityBonusMl(settings: Settings): number {
  if (!settings.activityLevel) return 0;
  return ACTIVITY_BONUS_ML[settings.activityLevel];
}

export function calculateDefaultWaterGoalMl(
  settings: Settings
): { complete: true; goalMl: number } | { complete: false; missing: string[] } {
  const weightKg = resolveWeightForMetabolism(null, settings);
  if (weightKg == null) {
    return { complete: false, missing: ["starting weight"] };
  }

  const goalMl = snapWaterGoal(weightKg * ML_PER_KG + activityBonusMl(settings));
  return { complete: true, goalMl };
}

export function formatWaterMl(ml: number): string {
  if (ml >= 1000) {
    const liters = ml / 1000;
    const rounded =
      liters % 1 === 0 ? liters.toFixed(0) : liters.toFixed(1).replace(/\.0$/, "");
    return `${rounded} L`;
  }
  return `${ml.toLocaleString()} ml`;
}

export function waterGoalMet(
  waterMl: number | null | undefined,
  goalMl: number
): boolean {
  return waterMl != null && waterMl >= goalMl;
}
