import { parseISO } from "date-fns";
import type { ProgressAnalysisResult } from "../../types";
import {
  computeDomainLogRate,
  confidenceFromCompleteness,
  countLoggedDays,
  findLongestMissStreak,
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
import type { ConsistencyStatus } from "./statuses";

const MIN_WINDOW_DAYS = 14;

function dayFullyLogged(p: import("../../types").MetricsPoint): boolean {
  return (
    hasCalorieLog(p) &&
    hasStepsLog(p) &&
    hasWaterLog(p) &&
    hasTeethLog(p)
  );
}

export function analyzeConsistency(ctx: AnalysisContext): ProgressAnalysisResult {
  const def = getTopicDefinition("consistency");
  const windowDays = ctx.metrics.length;

  if (windowDays < MIN_WINDOW_DAYS) {
    return {
      sufficiency: "insufficient",
      localStatus: "notEnoughData",
      localStatusReason: def.emptyMessage,
      confidence: "low",
      confidenceReason: "Window too short.",
      metrics: { windowDays },
      warnings: ["insufficient_data"],
      recentLogs: slimLogsForTopic(ctx.metrics, "consistency"),
      emptyMessage: def.emptyMessage,
    };
  }

  const rates = {
    calorieLogRate: computeDomainLogRate(ctx.metrics, hasCalorieLog),
    stepsLogRate: computeDomainLogRate(ctx.metrics, hasStepsLog),
    workoutLogRate: computeDomainLogRate(ctx.metrics, hasWorkoutLog),
    waterLogRate: computeDomainLogRate(ctx.metrics, hasWaterLog),
    teethLogRate: computeDomainLogRate(ctx.metrics, hasTeethLog),
    weightLogRate: computeDomainLogRate(ctx.metrics, hasWeightLog),
  };

  const overallLoggingScore =
    (rates.calorieLogRate +
      rates.stepsLogRate +
      rates.workoutLogRate +
      rates.waterLogRate +
      rates.teethLogRate) /
    5;

  let fullyLoggedDays = 0;
  let partiallyLoggedDays = 0;
  let emptyDays = 0;
  for (const p of ctx.metrics) {
    if (!isAnyLoggedDay(p)) emptyDays += 1;
    else if (dayFullyLogged(p)) fullyLoggedDays += 1;
    else partiallyLoggedDays += 1;
  }

  const patterns: string[] = [];
  if (rates.calorieLogRate > 0.5 && rates.stepsLogRate < 0.3) {
    patterns.push("logs_food_but_not_activity");
  }

  const weekendDays = ctx.metrics.filter((p) => {
    const d = parseISO(p.date).getDay();
    return d === 0 || d === 6;
  });
  const weekdayDays = ctx.metrics.filter((p) => {
    const d = parseISO(p.date).getDay();
    return d >= 1 && d <= 5;
  });
  const weekendRate =
    countLoggedDays(weekendDays, isAnyLoggedDay) / Math.max(1, weekendDays.length);
  const weekdayRate =
    countLoggedDays(weekdayDays, isAnyLoggedDay) / Math.max(1, weekdayDays.length);
  if (weekdayRate - weekendRate > 0.25) patterns.push("weekend_dropoff");

  const recentHalf = ctx.metrics.slice(Math.floor(windowDays / 2));
  const priorHalf = ctx.metrics.slice(0, Math.floor(windowDays / 2));
  const recentRate =
    countLoggedDays(recentHalf, isAnyLoggedDay) / Math.max(1, recentHalf.length);
  const priorRate =
    countLoggedDays(priorHalf, isAnyLoggedDay) / Math.max(1, priorHalf.length);

  let status: ConsistencyStatus = "mixedConsistency";
  if (overallLoggingScore >= 0.75) status = "strongConsistency";
  else if (overallLoggingScore < 0.4) status = "weakConsistency";
  if (recentRate > priorRate + 0.1) status = "improvingLogging";
  if (recentRate < priorRate - 0.1) status = "decliningLogging";

  const { confidence, reason } = confidenceFromCompleteness(
    countLoggedDays(ctx.metrics, isAnyLoggedDay),
    MIN_WINDOW_DAYS,
    windowDays
  );

  return {
    sufficiency: "sufficient",
    localStatus: status,
    localStatusReason:
      status === "strongConsistency"
        ? "You log most habits on most days."
        : status === "weakConsistency"
          ? "Many days are missing one or more habit logs."
          : status === "improvingLogging"
            ? "Logging frequency improved in the second half of the period."
            : status === "decliningLogging"
              ? "Logging trailed off in recent weeks."
              : "Some domains are logged regularly, others less so.",
    confidence,
    confidenceReason: reason,
    metrics: {
      ...rates,
      overallLoggingScore,
      fullyLoggedDays,
      partiallyLoggedDays,
      emptyDays,
      longestCalorieMissStreak: findLongestMissStreak(
        ctx.metrics,
        hasCalorieLog
      ),
      longestStepsMissStreak: findLongestMissStreak(ctx.metrics, hasStepsLog),
      currentLoggingStreak: ctx.streaks.loggedDays,
      patternFlags: patterns.join(","),
      weekendLogRate: weekendRate,
      weekdayLogRate: weekdayRate,
    },
    warnings: patterns,
    recentLogs: slimLogsForTopic(ctx.metrics, "consistency"),
  };
}
