import type {
  MetricsPoint,
  PeriodSummary,
  Settings,
  Streaks,
} from "../../types";

export interface AnalysisContext {
  metrics: MetricsPoint[];
  settings: Settings;
  streaks: Streaks;
  periodSummary: PeriodSummary;
  userNote?: string;
}
