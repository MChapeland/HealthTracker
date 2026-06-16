import { teethGoalMet } from "../teethBrushing";
import type { ProgressAnalysisResult } from "../../types";
import {
  averageOf,
  confidenceFromCompleteness,
  hasTeethLog,
} from "./analysisUtils";
import { getTopicDefinition, slimLogsForTopic } from "./topics";
import type { AnalysisContext } from "./types";
import type { DentalStatus } from "./statuses";

const MIN_DAYS = 7;

export function analyzeDentalHabits(
  ctx: AnalysisContext
): ProgressAnalysisResult {
  const def = getTopicDefinition("dentalHabits");
  const teethDays = ctx.metrics.filter(hasTeethLog);
  const logged = teethDays.length;

  if (logged < MIN_DAYS) {
    return {
      sufficiency: "insufficient",
      localStatus: "notEnoughData",
      localStatusReason: def.emptyMessage,
      confidence: "low",
      confidenceReason: "Not enough brushing logs.",
      metrics: { teethLogDays30: logged },
      warnings: ["insufficient_data"],
      recentLogs: slimLogsForTopic(ctx.metrics, "dentalHabits"),
      emptyMessage: def.emptyMessage,
    };
  }

  const counts = teethDays.map((p) => p.teethBrushings as number);
  const avg7 = averageOf(counts.slice(-7));
  const goalHits = teethDays.filter((p) =>
    teethGoalMet(p.teethBrushings, ctx.settings.dailyTeethBrushingsGoal)
  ).length;
  const missed = ctx.metrics.length - logged;

  let status: DentalStatus = "consistent";
  const recent = averageOf(counts.slice(-7));
  const prior = averageOf(counts.slice(-14, -7));
  if (recent != null && prior != null && recent > prior + 0.3) status = "improving";
  else if (recent != null && prior != null && recent < prior - 0.3) {
    status = "declining";
  } else if (goalHits / logged < 0.5) status = "inconsistent";

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
        ? "Brushing logs meet your daily goal on most logged days."
        : status === "inconsistent"
          ? "You often log fewer brushings than your daily goal."
          : status === "improving"
            ? "Recent brushing counts are up vs earlier in the period."
            : "Recent brushing counts have dipped.",
    confidence,
    confidenceReason: reason,
    metrics: {
      teethLogDays30: logged,
      missedTeethDays30: missed,
      avgBrushings7: avg7,
      teethGoalHitRate: goalHits / logged,
      currentTeethStreak: ctx.streaks.teethGoalDays,
    },
    warnings: [],
    recentLogs: slimLogsForTopic(ctx.metrics, "dentalHabits"),
  };
}
