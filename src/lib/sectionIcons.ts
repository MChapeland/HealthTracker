export const SECTION_ICONS = {
  weight: "fa-solid fa-weight-scale",
  calories: "fa-solid fa-utensils",
  steps: "fa-solid fa-shoe-prints",
  workout: "fa-solid fa-dumbbell",
  journey: "fa-solid fa-calendar-day",
  metabolism: "fa-solid fa-heart-pulse",
  notes: "fa-solid fa-note-sticky",
  dailyScore: "fa-solid fa-gauge-high",
  energyBalance: "fa-solid fa-scale-balanced",
  calorieDeficit: "fa-solid fa-scale-balanced",
  streaks: "fa-solid fa-fire",
  periodSummary: "fa-solid fa-calendar-days",
  physicalActivity: "fa-solid fa-person-walking",
  appearance: "fa-solid fa-palette",
  aiEstimation: "fa-solid fa-wand-sparkles",
  sync: "fa-solid fa-cloud",
  water: "fa-solid fa-droplet",
  teeth: "fa-solid fa-tooth",
} as const;

export type SectionIconKind = keyof typeof SECTION_ICONS;
