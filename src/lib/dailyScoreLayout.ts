const DAILY_SCORE_GRID_BASE =
  "grid grid-cols-1 items-stretch gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1fr)]";

/** Row 1 min height — matches measured dashboard row (SummaryCard tallest column ≈332px). */
const DAILY_SCORE_ROW_TEMPLATE = "lg:[grid-template-rows:minmax(20.75rem,auto)]";

/** Dashboard top row (Daily score | Streaks | Last 30 days). */
export const DAILY_SCORE_TOP_GRID_CLASS = `${DAILY_SCORE_GRID_BASE} ${DAILY_SCORE_ROW_TEMPLATE}`;

/** Same 3-column grid as dashboard so the score column width matches exactly. */
export const DAY_PAGE_TOP_GRID_CLASS = DAILY_SCORE_TOP_GRID_CLASS;

export const DAILY_SCORE_PANEL_SHELL_CLASS =
  "flex h-full w-full flex-col rounded-xl border border-slate-800 bg-slate-900/50 p-4";

/** Shared card shell for streaks / summary / day-page side columns. */
export const DAILY_SCORE_SIDE_PANEL_CLASS =
  "flex h-full min-w-0 flex-col rounded-xl border border-slate-800 bg-slate-900/50 p-4";

/** Compact field card (weight / steps) — natural height, not stretched. */
export const DAY_PAGE_FIELD_PANEL_CLASS =
  "flex min-w-0 flex-col rounded-xl border border-slate-800 bg-slate-900/50 p-4";

/** Right column on day page: spans cols 2–3; weight/steps on top, notes below. */
export const DAY_PAGE_RIGHT_COLUMN_CLASS =
  "flex h-full min-h-0 min-w-0 flex-col gap-4 lg:col-span-2 lg:col-start-2";
