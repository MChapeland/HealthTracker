import type { ProgressAnalysisResult } from "../../types";
import {
  averageOf,
  confidenceFromCompleteness,
  detectRecentChange,
  hasStepsLog,
  slopePerWeekKg,
} from "./analysisUtils";
import { getTopicDefinition, slimLogsForTopic } from "./topics";
import type { AnalysisContext } from "./types";
import type { ActivityStatus } from "./statuses";

const MIN_DAYS = 7;
const INACTIVE_THRESHOLD = 3000;

export function analyzeActivity(ctx: AnalysisContext): ProgressAnalysisResult {
  const def = getTopicDefinition("activity");
  const stepDays = ctx.metrics.filter(hasStepsLog);
  const logged = stepDays.length;

  if (logged < MIN_DAYS) {
    return {
      sufficiency: "insufficient",
      localStatus: "notEnoughData",
      localStatusReason: def.emptyMessage,
      confidence: "low",
      confidenceReason: "Not enough step logs.",
      metrics: { stepLogDays30: logged },
      warnings: ["insufficient_data"],
      recentLogs: slimLogsForTopic(ctx.metrics, "activity"),
      emptyMessage: def.emptyMessage,
    };
  }

  const steps = stepDays.map((p) => p.steps as number);
  const dates = stepDays.map((p) => p.date);
  const avg7 = averageOf(steps.slice(-7));
  const avg14 = averageOf(steps.slice(-14));
  const avg30 = averageOf(steps);
  const trend = slopePerWeekKg(dates, steps);
  const change = detectRecentChange(steps, 7, 14);
  const inactiveDays = stepDays.filter(
    (p) => (p.steps as number) < INACTIVE_THRESHOLD
  ).length;
  const goalHits = stepDays.filter(
    (p) => (p.steps as number) >= ctx.settings.dailyStepsGoal
  ).length;

  let status: ActivityStatus = "consistent";
  if (change && change.pctChange > 15) status = "improving";
  else if (change && change.pctChange < -15) status = "declining";
  else if (inactiveDays > logged * 0.4) status = "inactivePattern";

  const { confidence, reason } = confidenceFromCompleteness(
    logged,
    MIN_DAYS,
    ctx.metrics.length
  );

  return {
    sufficiency: "sufficient",
    localStatus: status,
    localStatusReason:
      status === "improving"
        ? "Your recent weekly step average is up compared to the prior period."
        : status === "declining"
          ? "Steps have dipped compared to earlier in the window."
          : status === "inactivePattern"
            ? "Several days fall well below an active baseline."
            : "Step totals are fairly steady week to week.",
    confidence,
    confidenceReason: reason,
    metrics: {
      stepLogDays30: logged,
      avgSteps7: avg7,
      avgSteps14: avg14,
      avgSteps30: avg30,
      stepTrendPerWeek: trend,
      inactiveDays30: inactiveDays,
      stepsGoalHitRate: goalHits / logged,
    },
    warnings: [],
    recentLogs: slimLogsForTopic(ctx.metrics, "activity"),
  };
}
