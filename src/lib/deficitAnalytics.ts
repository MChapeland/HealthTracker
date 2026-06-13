import { calculateDayEnergyBalance } from "./metabolism";
import type { DayActivityInput } from "./metabolism";
import type { MetricsPoint, Settings } from "../types";

export type DeficitChartPoint = {
  dateKey: string;
  /** TDEE − eaten; positive = deficit (kcal). */
  deficit: number;
  hasDeficit: boolean;
  /** From deficit ÷ kcal/kg (same as timeline); positive = estimated loss. */
  estimatedKgChange: number | null;
  hasEstimatedKg: boolean;
};

function metricsToActivity(point: MetricsPoint): DayActivityInput {
  return {
    steps: point.steps,
    distanceKm: point.distanceKm,
    durationMin: point.durationMin,
    workedOut: point.workedOut,
    workoutDurationMin: point.workoutDurationMin,
    workoutIntensity: point.workoutIntensity,
    workoutCalories: point.workoutCalories,
    workoutCaloriesOverride: point.workoutCaloriesOverride,
  };
}

export function buildDeficitChartData(
  points: MetricsPoint[],
  settings: Settings | null
): DeficitChartPoint[] {
  return points.map((p) => {
    let deficit = 0;
    let hasDeficit = false;
    let estimatedKgChange: number | null = null;

    if (settings && p.totalCalories > 0) {
      const balance = calculateDayEnergyBalance(
        settings,
        p.totalCalories,
        p.weight,
        metricsToActivity(p),
        p.date
      );
      if (balance.complete && balance.deficit != null) {
        deficit = balance.deficit;
        hasDeficit = true;
        estimatedKgChange = balance.estimatedKgChange;
      }
    }

    return {
      dateKey: p.date,
      deficit,
      hasDeficit,
      estimatedKgChange,
      hasEstimatedKg: hasDeficit && estimatedKgChange != null,
    };
  });
}
