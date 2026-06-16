import { weightChangeDirectionFromMonthlyKg } from "../metabolism";
import type { ProgressAnalysisResult } from "../../types";
import {
  averageOf,
  confidenceFromCompleteness,
  countLoggedDays,
  detectRecentChange,
  hasCalorieLog,
  hasStepsLog,
  hasWaterLog,
  hasWorkoutLog,
  loggedWeights,
  movingAverage,
  slopePerWeekKg,
} from "./analysisUtils";
import { getTopicDefinition, slimLogsForTopic } from "./topics";
import type { AnalysisContext } from "./types";
import type { WeightTrendStatus } from "./statuses";

const MIN_WEIGHT_LOGS = 4;

export function analyzeWeightTrend(ctx: AnalysisContext): ProgressAnalysisResult {
  const def = getTopicDefinition("weightTrend");
  const weights = loggedWeights(ctx.metrics);
  const weightLogCount30 = weights.length;

  if (weightLogCount30 < MIN_WEIGHT_LOGS) {
    return {
      sufficiency: "insufficient",
      localStatus: "notEnoughData",
      localStatusReason: def.emptyMessage,
      confidence: "low",
      confidenceReason: "Not enough weight entries.",
      metrics: { weightLogCount30 },
      warnings: ["insufficient_data"],
      recentLogs: slimLogsForTopic(ctx.metrics, "weightTrend"),
      emptyMessage: def.emptyMessage,
    };
  }

  const values = weights.map((w) => w.weight);
  const dates = weights.map((w) => w.date);
  const currentWeight = values[values.length - 1];
  const avg7 = movingAverage(values, 7);
  const avgPrev7 =
    values.length >= 14
      ? movingAverage(values.slice(0, -7), 7)
      : movingAverage(values.slice(0, Math.max(0, values.length - 7)), 7);
  const avg14 = movingAverage(values, 14);
  const change30Kg =
    values.length >= 2 ? values[0] - values[values.length - 1] : null;
  const trendKgPerWeek = slopePerWeekKg(dates, values);

  const calorieDays = ctx.metrics.filter(hasCalorieLog);
  const avgCalories7 = averageOf(
    calorieDays.slice(-7).map((p) => p.totalCalories)
  );
  const avgSteps7 = averageOf(
    ctx.metrics.filter(hasStepsLog).slice(-7).map((p) => p.steps as number)
  );
  const workoutDays7 = countLoggedDays(ctx.metrics.slice(-7), hasWorkoutLog);
  const avgWater7 = averageOf(
    ctx.metrics.filter(hasWaterLog).slice(-7).map((p) => p.waterMl as number)
  );

  const workoutChange = detectRecentChange(
    ctx.metrics.map((p) => (p.workedOut ? 1 : 0)),
    7,
    14
  );
  const waterValues = ctx.metrics
    .filter(hasWaterLog)
    .map((p) => p.waterMl as number);
  const waterChange = detectRecentChange(waterValues, 7, 14);

  const direction = weightChangeDirectionFromMonthlyKg(
    ctx.settings.targetMonthlyWeightChangeKg
  );

  let status: WeightTrendStatus = "onTrack";
  const warnings: string[] = [];

  if (trendKgPerWeek != null && direction === "lose") {
    if (trendKgPerWeek < -1.0) {
      status = "losingTooFast";
      warnings.push("rapid_weight_loss");
    } else if (trendKgPerWeek > 0.2) {
      status = "gaining";
    } else if (
      weightLogCount30 >= 10 &&
      Math.abs(trendKgPerWeek) < 0.15 &&
      avgCalories7 != null &&
      avgCalories7 >= ctx.settings.calorieIdealMin &&
      avgCalories7 <= ctx.settings.calorieIdealMax
    ) {
      status = "likelyPlateau";
    } else if (
      weightLogCount30 >= 6 &&
      avg7 != null &&
      avgPrev7 != null &&
      Math.abs(avg7 - avgPrev7) < 0.2
    ) {
      status = "possiblePlateau";
    } else if (Math.abs(trendKgPerWeek) < 0.25) {
      status = "normalFluctuation";
    }
  } else if (trendKgPerWeek != null && direction === "gain") {
    if (trendKgPerWeek < -0.2) status = "gaining";
    else if (trendKgPerWeek > 1.0) warnings.push("rapid_weight_gain");
  }

  if (workoutChange && workoutChange.pctChange > 50) {
    warnings.push("recently_increased_training_load");
  }
  if (waterChange && waterChange.pctChange > 30) {
    warnings.push("recent_water_increase");
  }

  const { confidence, reason } = confidenceFromCompleteness(
    weightLogCount30,
    MIN_WEIGHT_LOGS,
    ctx.metrics.length
  );

  const localStatusReason =
    status === "likelyPlateau"
      ? "Your 7-day average weight has been fairly flat while calories look on target."
      : status === "possiblePlateau"
        ? "Recent weekly averages are close together — scale progress may have slowed."
        : status === "losingTooFast"
          ? "Your computed trend is faster than 1 kg/week loss."
          : status === "gaining"
            ? "The trend line points upward while your goal is weight loss."
            : "Your recent weight trend aligns reasonably with your goal direction.";

  return {
    sufficiency: "sufficient",
    localStatus: status,
    localStatusReason,
    confidence,
    confidenceReason: reason,
    metrics: {
      weightLogCount30,
      currentWeight,
      avg7,
      avgPrev7,
      avg14,
      change30Kg,
      trendKgPerWeek,
      avgCalories7,
      avgSteps7,
      workoutDays7,
      avgWater7,
      missingWeightDays: ctx.metrics.length - weightLogCount30,
      recentWorkoutIncrease: workoutChange?.pctChange ?? null,
      recentWaterIncrease: waterChange?.pctChange ?? null,
    },
    warnings,
    recentLogs: slimLogsForTopic(ctx.metrics, "weightTrend"),
  };
}
