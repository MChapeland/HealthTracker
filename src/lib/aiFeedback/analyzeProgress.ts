import type { AiFeedbackTopic, ProgressAnalysisResult } from "../../types";
import { analyzeActivity } from "./activityAnalyzer";
import { analyzeConsistency } from "./consistencyAnalyzer";
import { analyzeDentalHabits } from "./dentalAnalyzer";
import { analyzeGeneralOverview } from "./generalOverviewAnalyzer";
import { analyzeHydration } from "./hydrationAnalyzer";
import { analyzeNutrition } from "./nutritionAnalyzer";
import { analyzeWeightTrend } from "./weightTrendAnalyzer";
import { analyzeWorkouts } from "./workoutsAnalyzer";
import { getTopicDefinition } from "./topics";
import type { AnalysisContext } from "./types";

export function analyzeProgress(
  topic: AiFeedbackTopic,
  ctx: AnalysisContext
): ProgressAnalysisResult {
  if (topic === "custom") {
    const note = ctx.userNote?.trim() ?? "";
    const overview = analyzeGeneralOverview(ctx);
    if (note.length < 10) {
      const def = getTopicDefinition("custom");
      return {
        ...overview,
        sufficiency: "insufficient",
        localStatus: "notEnoughData",
        localStatusReason: "Add a question of at least 10 characters.",
        emptyMessage: def.emptyMessage,
      };
    }
    if (overview.sufficiency === "insufficient") return overview;
    return overview;
  }

  switch (topic) {
    case "generalOverview":
      return analyzeGeneralOverview(ctx);
    case "consistency":
      return analyzeConsistency(ctx);
    case "weightTrend":
      return analyzeWeightTrend(ctx);
    case "nutrition":
      return analyzeNutrition(ctx);
    case "activity":
      return analyzeActivity(ctx);
    case "workouts":
      return analyzeWorkouts(ctx);
    case "hydration":
      return analyzeHydration(ctx);
    case "dentalHabits":
      return analyzeDentalHabits(ctx);
    default:
      return analyzeGeneralOverview(ctx);
  }
}
