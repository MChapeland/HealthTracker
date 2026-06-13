import type { Settings, WalkingPrimary } from "../types";

/** Average adult step length used for steps ↔ distance conversions. */
const DEFAULT_STEP_LENGTH_M = 0.75;

export interface WalkingValues {
  steps: number | null;
  distanceKm: number | null;
  durationMin: number | null;
}

function stepsPerKm(): number {
  return 1000 / DEFAULT_STEP_LENGTH_M;
}

function speedKmh(settings: Settings): number {
  return settings.speedKmh > 0 ? settings.speedKmh : 4.5;
}

export function stepsToDistance(steps: number, _settings: Settings): number {
  return steps / stepsPerKm();
}

export function distanceToSteps(km: number, _settings: Settings): number {
  return Math.round(km * stepsPerKm());
}

export function distanceToDuration(km: number, settings: Settings): number {
  return (km / speedKmh(settings)) * 60;
}

export function stepsToDuration(steps: number, settings: Settings): number {
  return distanceToDuration(stepsToDistance(steps, settings), settings);
}

export function durationToDistance(min: number, settings: Settings): number {
  return (min / 60) * speedKmh(settings);
}

export function durationToSteps(min: number, settings: Settings): number {
  return distanceToSteps(durationToDistance(min, settings), settings);
}

export function convertWalking(
  primary: WalkingPrimary,
  value: number,
  settings: Settings
): WalkingValues {
  if (!value || value <= 0) {
    return { steps: null, distanceKm: null, durationMin: null };
  }
  switch (primary) {
    case "steps": {
      const steps = Math.round(value);
      const distanceKm = stepsToDistance(steps, settings);
      const durationMin = distanceToDuration(distanceKm, settings);
      return { steps, distanceKm, durationMin };
    }
    case "distance_km": {
      const distanceKm = value;
      const steps = distanceToSteps(distanceKm, settings);
      const durationMin = distanceToDuration(distanceKm, settings);
      return { steps, distanceKm, durationMin };
    }
    case "duration_min": {
      const durationMin = value;
      const distanceKm = durationToDistance(durationMin, settings);
      const steps = durationToSteps(durationMin, settings);
      return { steps, distanceKm, durationMin };
    }
  }
}

export function formatWalkingSummary(
  steps: number | null,
  distanceKm: number | null
): string {
  if (steps != null && steps > 0) {
    return `${steps.toLocaleString()} steps`;
  }
  if (distanceKm != null && distanceKm > 0) {
    return `${distanceKm.toFixed(1)} km`;
  }
  return "—";
}
