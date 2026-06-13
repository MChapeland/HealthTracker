import {
  addDays,
  eachDayOfInterval,
  endOfWeek,
  format,
  parseISO,
  startOfWeek,
  subDays,
} from "date-fns";
import type { DayRecord } from "../types";

export function todayString(): string {
  return format(new Date(), "yyyy-MM-dd");
}

export function yesterdayString(): string {
  return format(subDays(new Date(), 1), "yyyy-MM-dd");
}

const WEEK_STARTS_ON = { weekStartsOn: 1 as const };

/** Monday–Sunday range for the calendar week containing `asOf` (yyyy-MM-dd). */
export function currentWeekRange(asOf: string = todayString()): {
  start: string;
  end: string;
} {
  const date = parseISO(asOf);
  return {
    start: format(startOfWeek(date, WEEK_STARTS_ON), "yyyy-MM-dd"),
    end: format(endOfWeek(date, WEEK_STARTS_ON), "yyyy-MM-dd"),
  };
}

/** `weekOffset` 0 = week containing today; −1 = previous week, etc. */
export function weekRangeForOffset(
  weekOffset: number,
  asOf: string = todayString()
): { start: string; end: string } {
  const anchor = addDays(parseISO(asOf), weekOffset * 7);
  return currentWeekRange(format(anchor, "yyyy-MM-dd"));
}

/** Most negative week offset still overlapping `journeyStartDate` (inclusive). */
export function minWeekOffset(
  journeyStartDate: string | null | undefined,
  asOf: string = todayString()
): number {
  if (!journeyStartDate) return Number.MIN_SAFE_INTEGER;
  let offset = 0;
  for (;;) {
    const prev = weekRangeForOffset(offset - 1, asOf);
    if (prev.end < journeyStartDate) return offset;
    offset -= 1;
    if (offset < -520) return offset;
  }
}

export function formatDisplayDate(dateStr: string): string {
  return format(parseISO(dateStr), "EEE, MMM d, yyyy");
}

export function formatShortDate(dateStr: string): string {
  return format(parseISO(dateStr), "MMM d");
}

export function mergeDaysWithRange(
  records: DayRecord[],
  start: string,
  end: string
): DayRecord[] {
  const map = new Map(records.map((d) => [d.date, d]));
  const interval = eachDayOfInterval({
    start: parseISO(start),
    end: parseISO(end),
  });
  return interval
    .map((d) => {
      const key = format(d, "yyyy-MM-dd");
      return (
        map.get(key) ?? {
          date: key,
          weight: null,
          walkingPrimary: null,
          steps: null,
          distanceKm: null,
          durationMin: null,
          workedOut: false,
          workoutDurationMin: null,
          workoutIntensity: "medium" as const,
          workoutCalories: null,
          workoutCaloriesOverride: false,
          notes: null,
          dailyScore: null,
          totalCalories: 0,
          totalCarbs: null,
          totalFat: null,
          totalProtein: null,
          totalFiber: null,
          totalSalt: null,
          waterMl: null,
          teethBrushings: null,
          exists: false,
        }
      );
    })
    .reverse();
}

export function clampRangeStart(
  start: string,
  journeyStartDate: string | null | undefined
): string {
  if (journeyStartDate && start < journeyStartDate) {
    return journeyStartDate;
  }
  return start;
}

export function isBeforeJourneyStart(
  date: string,
  journeyStartDate: string | null | undefined
): boolean {
  return !!journeyStartDate && date < journeyStartDate;
}

export function defaultRange(
  daysBack = 30,
  journeyStartDate?: string | null
): { start: string; end: string } {
  const end = new Date();
  const start = subDays(end, daysBack);
  const startStr = clampRangeStart(
    format(start, "yyyy-MM-dd"),
    journeyStartDate
  );
  return {
    start: startStr,
    end: format(end, "yyyy-MM-dd"),
  };
}

export type AnalyticsRange =
  | "7d"
  | "30d"
  | "3m"
  | "6m"
  | "1y"
  | "5y"
  | "all";

const ANALYTICS_RANGE_DAYS: Record<Exclude<AnalyticsRange, "all">, number> = {
  "7d": 7,
  "30d": 30,
  "3m": 90,
  "6m": 180,
  "1y": 365,
  "5y": 365 * 5,
};

/** Analytics charts use completed days only — range ends yesterday, not today. */
export function analyticsRange(
  selection: AnalyticsRange,
  journeyStartDate?: string | null
): { start: string; end: string } {
  const end = yesterdayString();
  const start =
    selection === "all"
      ? clampRangeStart("2000-01-01", journeyStartDate)
      : clampRangeStart(
          format(
            subDays(parseISO(end), ANALYTICS_RANGE_DAYS[selection]),
            "yyyy-MM-dd"
          ),
          journeyStartDate
        );
  if (start > end) {
    return { start: end, end };
  }
  return { start, end };
}

export function shiftDate(dateStr: string, delta: number): string {
  return format(addDays(parseISO(dateStr), delta), "yyyy-MM-dd");
}
