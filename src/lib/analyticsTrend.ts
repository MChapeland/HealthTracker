import { differenceInCalendarDays, parseISO } from "date-fns";

/**
 * Linear values between logged entries across the chart timeline (calendar-day
 * spacing), matching the weight graph trend. Days before the first log and
 * after the last stay null.
 */
export function interpolateLoggedSeries(
  points: Array<{ date: string; value: number | null | undefined }>,
  isLogged: (value: number | null | undefined) => boolean = (value) =>
    value != null && Number.isFinite(value)
): Array<number | null> {
  const result = points.map((p) =>
    isLogged(p.value) ? (p.value as number) : null
  );
  const loggedIndices: number[] = [];
  for (let i = 0; i < points.length; i++) {
    if (isLogged(points[i].value)) loggedIndices.push(i);
  }

  for (let k = 0; k < loggedIndices.length - 1; k++) {
    const i0 = loggedIndices[k];
    const i1 = loggedIndices[k + 1];
    const v0 = points[i0].value as number;
    const v1 = points[i1].value as number;
    const startDate = parseISO(points[i0].date);
    const daySpan = differenceInCalendarDays(
      parseISO(points[i1].date),
      startDate
    );
    if (daySpan <= 0) continue;

    for (let i = i0 + 1; i < i1; i++) {
      const dayOffset = differenceInCalendarDays(
        parseISO(points[i].date),
        startDate
      );
      const t = dayOffset / daySpan;
      result[i] = v0 + (v1 - v0) * t;
    }
  }

  return result;
}
