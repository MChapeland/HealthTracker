export type PageId =
  | "dashboard"
  | "timeline"
  | "analytics"
  | "foods"
  | "workouts"
  | "settings"
  | "day";

export const PAGE_ICONS: Record<PageId, string> = {
  dashboard: "fa-solid fa-house",
  timeline: "fa-solid fa-calendar-days",
  analytics: "fa-solid fa-chart-line",
  foods: "fa-solid fa-apple-whole",
  workouts: "fa-solid fa-dumbbell",
  settings: "fa-solid fa-gear",
  day: "fa-solid fa-calendar-day",
};

export const PAGE_DESCRIPTIONS: Record<PageId, string> = {
  dashboard: "Your overview for today",
  timeline: "Your daily health history",
  analytics: "Trends and charts across your journey",
  foods: "Foods you eat and their nutrition info",
  workouts: "Exercises, routines, and progress over time",
  settings: "Profile, goals, and app preferences",
  day: "Log meals, weight, activity, and notes",
};

export const MAIN_NAV: ReadonlyArray<{
  id: PageId;
  to: string;
  label: string;
}> = [
  { id: "dashboard", to: "/", label: "Dashboard" },
  { id: "timeline", to: "/timeline", label: "Timeline" },
  { id: "analytics", to: "/analytics", label: "Analytics" },
  { id: "foods", to: "/foods", label: "Foods" },
  { id: "workouts", to: "/workouts", label: "Workouts" },
  { id: "settings", to: "/settings", label: "Settings" },
];
