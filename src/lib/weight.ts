export interface WeightProgress {
  start: number;
  current: number;
  target: number;
  lostFromStart: number;
  remainingToGoal: number;
  percentComplete: number;
  barPosition: number;
}

export function computeWeightProgress(
  startingWeight: number | null,
  targetWeight: number | null,
  currentWeight: number | null
): WeightProgress | null {
  if (
    startingWeight == null ||
    targetWeight == null ||
    currentWeight == null
  ) {
    return null;
  }
  const totalToLose = startingWeight - targetWeight;
  if (totalToLose <= 0) return null;

  const lostFromStart = startingWeight - currentWeight;
  const remainingToGoal = Math.max(0, currentWeight - targetWeight);
  const percentComplete = Math.min(
    100,
    Math.max(0, (lostFromStart / totalToLose) * 100)
  );
  const barPosition = percentComplete;

  return {
    start: startingWeight,
    current: currentWeight,
    target: targetWeight,
    lostFromStart,
    remainingToGoal,
    percentComplete,
    barPosition,
  };
}
