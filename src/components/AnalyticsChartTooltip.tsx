import type { ReactNode } from "react";
import { formatShortDate } from "../lib/dates";

/** Shared Recharts tooltip behaviour for analytics charts. */
export const analyticsChartTooltipProps = {
  isAnimationActive: false as const,
  shared: false as const,
  cursor: false as const,
  offset: { x: 12, y: -36 },
};

type TooltipPayloadItem = { payload?: { dateKey?: string } };

export function AnalyticsTooltipBox({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs shadow-lg">
      {children}
    </div>
  );
}

export function AnalyticsTooltipDate({ children }: { children: ReactNode }) {
  return <p className="font-medium text-slate-200">{children}</p>;
}

export function AnalyticsTooltipPrimary({
  children,
  className = "text-accent",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <p className={className}>{children}</p>;
}

export function AnalyticsTooltipSecondary({ children }: { children: ReactNode }) {
  return <p className="text-slate-400">{children}</p>;
}

export function AnalyticsTooltipContent({
  active,
  payload,
  visible = true,
  children,
}: {
  active?: boolean;
  payload?: ReadonlyArray<TooltipPayloadItem>;
  visible?: boolean;
  children: (ctx: { date: string }) => ReactNode;
}) {
  if (!active || !payload?.length || !visible) return null;
  const dateKey = payload[0].payload?.dateKey;
  if (!dateKey) return null;
  return (
    <AnalyticsTooltipBox>
      {children({ date: formatShortDate(dateKey) })}
    </AnalyticsTooltipBox>
  );
}
