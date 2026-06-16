export type WeightTrendStatus =
  | "notEnoughData"
  | "onTrack"
  | "normalFluctuation"
  | "possiblePlateau"
  | "likelyPlateau"
  | "gaining"
  | "losingTooFast";

export type NutritionStatus =
  | "notEnoughData"
  | "consistent"
  | "inconsistent"
  | "possiblyTooLow"
  | "possiblyTooHigh"
  | "missingData";

export type ActivityStatus =
  | "notEnoughData"
  | "consistent"
  | "improving"
  | "declining"
  | "inactivePattern";

export type WorkoutsStatus =
  | "notEnoughData"
  | "consistent"
  | "improving"
  | "declining"
  | "recentlyIncreasedTrainingLoad"
  | "needsConsistency";

export type ConsistencyStatus =
  | "notEnoughData"
  | "strongConsistency"
  | "mixedConsistency"
  | "weakConsistency"
  | "improvingLogging"
  | "decliningLogging";

export type GeneralOverviewStatus =
  | "notEnoughData"
  | "onTrack"
  | "needsAttention"
  | "mixed";

export type HydrationStatus =
  | "notEnoughData"
  | "consistent"
  | "inconsistent"
  | "improving"
  | "declining";

export type DentalStatus =
  | "notEnoughData"
  | "consistent"
  | "inconsistent"
  | "improving"
  | "declining";
