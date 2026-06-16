import type { ProgressAnalysisResult } from "../../types";
import {
  averageOf,
  coefficientOfVariation,
  confidenceFromCompleteness,
  hasWaterLog,
} from "./analysisUtils";
import { getTopicDefinition, slimLogsForTopic } from "./topics";
import type { AnalysisContext } from "./types";
import type { HydrationStatus } from "./statuses";

const MIN_DAYS = 7;

export function analyzeHydration(ctx: AnalysisContext): ProgressAnalysisResult {
  const def = getTopicDefinition("hydration");
  const waterDays = ctx.metrics.filter(hasWaterLog);
  const logged = waterDays.length;
  const missing = ctx.metrics.length - logged;

  if (logged < MIN_DAYS) {
    return {
      sufficiency: "insufficient",
      localStatus: "notEnoughData",
      localStatusReason: def.emptyMessage,
      confidence: "low",
      confidenceReason: "Not enough water logs.",
      metrics: { waterLogDays30: logged },
      warnings: ["insufficient_data"],
      recentLogs: slimLogsForTopic(ctx.metrics, "hydration"),
      emptyMessage: def.emptyMessage,
    };
  }

  const values = waterDays.map((p) => p.waterMl as number);
  const avg7 = averageOf(values.slice(-7));
  const avg30 = averageOf(values);
  const cv = coefficientOfVariation(values);
  const goalHits = waterDays.filter(
    (p) => (p.waterMl as number) >= ctx.settings.dailyWaterGoalMl
  ).length;

  let status: HydrationStatus = "consistent";
  if (cv != null && cv > 0.3) status = "inconsistent";
  const recent = averageOf(values.slice(-7));
  const prior = averageOf(values.slice(-14, -7));
  if (recent != null && prior != null && recent > prior * 1.15) status = "improving";
  if (recent != null && prior != null && recent < prior * 0.85) status = "declining";

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
        ? "Water intake logging is fairly regular."
        : status === "inconsistent"
          ? "Daily water totals vary quite a bit."
          : status === "improving"
            ? "Recent water intake is up vs the prior week."
            : "Recent water intake is down vs the prior week.",
    confidence,
    confidenceReason: reason,
    metrics: {
      waterLogDays30: logged,
      missingWaterDays30: missing,
      avgWaterMl7: avg7,
      avgWaterMl30: avg30,
      waterGoalHitRate: goalHits / logged,
    },
    warnings: [],
    recentLogs: slimLogsForTopic(ctx.metrics, "hydration"),
  };
}
