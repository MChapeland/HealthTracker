import type { ProgressAnalysisResult } from "../../types";
import {
  averageOf,
  coefficientOfVariation,
  confidenceFromCompleteness,
  hasCalorieLog,
} from "./analysisUtils";
import { getTopicDefinition, slimLogsForTopic } from "./topics";
import type { AnalysisContext } from "./types";
import type { NutritionStatus } from "./statuses";

const MIN_DAYS = 7;

export function analyzeNutrition(ctx: AnalysisContext): ProgressAnalysisResult {
  const def = getTopicDefinition("nutrition");
  const calorieDays = ctx.metrics.filter(hasCalorieLog);
  const logged = calorieDays.length;
  const missing = ctx.metrics.length - logged;

  if (logged < MIN_DAYS) {
    return {
      sufficiency: "insufficient",
      localStatus: "notEnoughData",
      localStatusReason: def.emptyMessage,
      confidence: "low",
      confidenceReason: "Not enough calorie logs.",
      metrics: { calorieLogDays30: logged, missingCalorieDays30: missing },
      warnings: ["insufficient_data"],
      recentLogs: slimLogsForTopic(ctx.metrics, "nutrition"),
      emptyMessage: def.emptyMessage,
    };
  }

  const cals = calorieDays.map((p) => p.totalCalories);
  const avg7 = averageOf(cals.slice(-7));
  const avg14 = averageOf(cals.slice(-14));
  const avg30 = averageOf(cals);
  const cv = coefficientOfVariation(cals);
  const inIdeal = calorieDays.filter(
    (p) =>
      p.totalCalories >= ctx.settings.calorieIdealMin &&
      p.totalCalories <= ctx.settings.calorieIdealMax
  ).length;
  const idealRate = inIdeal / logged;

  let status: NutritionStatus = "consistent";
  if (missing > ctx.metrics.length * 0.4) status = "missingData";
  else if (cv != null && cv > 0.25) status = "inconsistent";
  else if (avg7 != null && avg7 < ctx.settings.calorieWarningBelow) {
    status = "possiblyTooLow";
  } else if (avg7 != null && avg7 > ctx.settings.calorieMax) {
    status = "possiblyTooHigh";
  }

  const { confidence, reason } = confidenceFromCompleteness(
    logged,
    MIN_DAYS,
    ctx.metrics.length
  );

  return {
    sufficiency: "sufficient",
    localStatus: status,
    localStatusReason:
      status === "consistent"
        ? "Calorie intake has been relatively steady compared to your goal range."
        : status === "inconsistent"
          ? "Day-to-day calorie totals vary quite a bit."
          : status === "possiblyTooLow"
            ? "Recent average calories are below your warning threshold."
            : status === "possiblyTooHigh"
              ? "Recent average calories exceed your upper limit."
              : "Many days are missing food logs.",
    confidence,
    confidenceReason: reason,
    metrics: {
      calorieLogDays30: logged,
      missingCalorieDays30: missing,
      avgCalories7: avg7,
      avgCalories14: avg14,
      avgCalories30: avg30,
      calorieCv: cv,
      idealZoneHitRate: idealRate,
    },
    warnings:
      status === "possiblyTooLow" ? ["low_calorie_pattern"] : [],
    recentLogs: slimLogsForTopic(ctx.metrics, "nutrition"),
  };
}
