export function teethGoalMet(
  teethBrushings: number | null | undefined,
  goal: number
): boolean {
  return teethBrushings != null && teethBrushings >= goal;
}

export function formatTeethBrushings(count: number, goal: number): string {
  const label = goal === 1 ? "time" : "times";
  return `${count} / ${goal} ${label}`;
}

export function formatTeethCount(count: number): string {
  return `${count} ${count === 1 ? "time" : "times"}`;
}
