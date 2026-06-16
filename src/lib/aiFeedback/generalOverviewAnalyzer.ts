import type { ProgressAnalysisResult } from "../../types";
import {
  computeDomainLogRate,
  confidenceFromCompleteness,
  countLoggedDays,
  hasCalorieLog,
  hasStepsLog,
  hasTeethLog,
  hasWaterLog,
  hasWeightLog,
  hasWorkoutLog,
  isAnyLoggedDay,
} from "./analysisUtils";
import { getTopicDefinition, slimLogsForTopic } from "./topics";
import type { AnalysisContext } from "./types";
import type { GeneralOverviewStatus } from "./statuses";

const MIN_LOGGED_DAYS = 10;

export function analyzeGeneralOverview(
  ctx: AnalysisContext
): ProgressAnalysisResult {
  const def = getTopicDefinition("generalOverview");
  const loggedDays = countLoggedDays(ctx.metrics, isAnyLoggedDay);

  if (loggedDays < MIN_LOGGED_DAYS) {
    return {
      sufficiency: "insufficient",
      localStatus: "notEnoughData",
      localStatusReason: def.emptyMessage,
      confidence: "low",
      confidenceReason: "Not enough logged days.",
      metrics: { loggedDays30: loggedDays },
      warnings: ["insufficient_data"],
      recentLogs: slimLogsForTopic(ctx.metrics, "generalOverview"),
      emptyMessage: def.emptyMessage,
    };
  }

  const rates = {
    calories: computeDomainLogRate(ctx.metrics, hasCalorieLog),
    steps: computeDomainLogRate(ctx.metrics, hasStepsLog),
    workouts: computeDomainLogRate(ctx.metrics, hasWorkoutLog),
    water: computeDomainLogRate(ctx.metrics, hasWaterLog),
    teeth: computeDomainLogRate(ctx.metrics, hasTeethLog),
    weight: computeDomainLogRate(ctx.metrics, hasWeightLog),
  };

  const avgScore =
    (rates.calories + rates.steps + rates.workouts + rates.water + rates.teeth) /
    5;

  const sorted = Object.entries(rates).sort((a, b) => b[1] - a[1]);
  const strongest = sorted[0]?.[0] ?? "calories";
  const weakest = sorted[sorted.length - 1]?.[0] ?? "workouts";

  let status: GeneralOverviewStatus = "onTrack";
  if (avgScore < 0.4) status = "needsAttention";
  else if (avgScore < 0.65) status = "mixed";

  const { confidence, reason } = confidenceFromCompleteness(
    loggedDays,
    MIN_LOGGED_DAYS,
    ctx.metrics.length
  );

  return {
    sufficiency: "sufficient",
    localStatus: status,
    localStatusReason:
      status === "onTrack"
        ? "Logging coverage is solid across most areas."
        : status === "mixed"
          ? `Strongest area: ${strongest}. Weakest: ${weakest}.`
          : `Several domains have sparse logging — ${weakest} is the biggest gap.`,
    confidence,
    confidenceReason: reason,
    metrics: {
      loggedDays30: loggedDays,
      ...rates,
      overallLoggingScore: avgScore,
      goodDayPercent30: ctx.periodSummary.goodDayPercent,
      weightChange30Kg: ctx.periodSummary.weightLostKg,
      avgCalories30: ctx.periodSummary.avgCalories,
      avgSteps30: ctx.periodSummary.avgSteps,
      workoutCount30: ctx.periodSummary.workoutCount,
      strongestDomain: strongest,
      weakestDomain: weakest,
    },
    warnings: status === "needsAttention" ? ["sparse_logging"] : [],
    recentLogs: slimLogsForTopic(ctx.metrics, "generalOverview"),
  };
}
