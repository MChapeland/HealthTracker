import type { ProgressAnalysisResult } from "../../types";
import {
  averageOf,
  confidenceFromCompleteness,
  countLoggedDays,
  detectRecentChange,
  hasWorkoutLog,
} from "./analysisUtils";
import { getTopicDefinition, slimLogsForTopic } from "./topics";
import type { AnalysisContext } from "./types";
import type { WorkoutsStatus } from "./statuses";

const MIN_DAYS = 2;

export function analyzeWorkouts(ctx: AnalysisContext): ProgressAnalysisResult {
  const def = getTopicDefinition("workouts");
  const workoutDays = ctx.metrics.filter(hasWorkoutLog);
  const logged = workoutDays.length;

  if (logged < MIN_DAYS) {
    return {
      sufficiency: "insufficient",
      localStatus: "notEnoughData",
      localStatusReason: def.emptyMessage,
      confidence: "low",
      confidenceReason: "Not enough workout days.",
      metrics: { workoutDays30: logged },
      warnings: ["insufficient_data"],
      recentLogs: slimLogsForTopic(ctx.metrics, "workouts"),
      emptyMessage: def.emptyMessage,
    };
  }

  const flags = ctx.metrics.map((p) => (p.workedOut ? 1 : 0));
  const durations = workoutDays.map((p) => p.workoutDurationMin ?? 0);
  const recentWeek = countLoggedDays(ctx.metrics.slice(-7), hasWorkoutLog);
  const priorWeek = countLoggedDays(
    ctx.metrics.slice(-14, -7),
    hasWorkoutLog
  );
  const freqChange = detectRecentChange(flags, 7, 14);
  const avgDuration = averageOf(durations);

  let status: WorkoutsStatus = "consistent";
  if (freqChange && freqChange.pctChange > 50) {
    status = "recentlyIncreasedTrainingLoad";
  } else if (freqChange && freqChange.pctChange < -30) {
    status = "declining";
  } else if (recentWeek > priorWeek && priorWeek > 0) {
    status = "improving";
  } else if (recentWeek < ctx.settings.workoutDaysPerWeek / 4) {
    status = "needsConsistency";
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
      status === "recentlyIncreasedTrainingLoad"
        ? "Workout frequency or volume increased noticeably in the last week."
        : status === "needsConsistency"
          ? "Recent weeks fall short of your workout-day target."
          : status === "improving"
            ? "You are logging more workouts than earlier in the period."
            : status === "declining"
              ? "Workout frequency has dropped compared to prior weeks."
              : "Workout frequency looks fairly steady.",
    confidence,
    confidenceReason: reason,
    metrics: {
      workoutDays30: logged,
      workoutDaysLast7: recentWeek,
      workoutDaysPrior7: priorWeek,
      avgWorkoutDurationMin: avgDuration,
      frequencyChangePct: freqChange?.pctChange ?? null,
    },
    warnings:
      status === "recentlyIncreasedTrainingLoad"
        ? ["recently_increased_training_load"]
        : [],
    recentLogs: slimLogsForTopic(ctx.metrics, "workouts"),
  };
}
