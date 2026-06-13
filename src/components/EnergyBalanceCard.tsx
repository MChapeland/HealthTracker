import { Link } from "react-router-dom";
import {
  activityLevelLabel,
  calculateDayEnergyBalance,
  formatDeficit,
  formatEstimatedWeightChange,
} from "../lib/metabolism";
import type { DayActivityInput } from "../lib/metabolism";
import type { Settings } from "../types";
import { SectionHeader } from "./SectionHeader";

interface Props {
  settings: Settings;
  caloriesEaten: number;
  dayWeight: number | null;
  activity: DayActivityInput;
  /** Day being viewed (for age-from-birthday on historical days) */
  asOfDate?: string;
  compact?: boolean;
  /** Renders inside another card without its own outer border */
  embedded?: boolean;
}

export function EnergyBalanceCard({
  settings,
  caloriesEaten,
  dayWeight,
  activity,
  asOfDate,
  compact,
  embedded,
}: Props) {
  const balance = calculateDayEnergyBalance(
    settings,
    caloriesEaten,
    dayWeight,
    activity,
    asOfDate
  );

  if (!balance.complete) {
    return (
      <div
        className={
          embedded
            ? "text-xs text-slate-400"
            : `rounded-xl border border-amber-800/40 bg-amber-950/20 ${compact ? "p-3" : "p-4"}`
        }
      >
        {!compact && (
          <p className="text-sm text-amber-200/90">Estimated energy balance</p>
        )}
        <p className={`text-xs text-slate-400 ${compact ? "" : "mt-1"}`}>
          Add your{" "}
          {balance.missingFields.includes("weight") &&
          balance.missingFields.length > 1
            ? "weight and metabolism profile"
            : balance.missingFields.includes("weight")
              ? "weight for this day (or starting weight)"
              : "metabolism profile (height, birthday, sex)"}{" "}
          in{" "}
          <Link to="/settings" className="text-accent hover:underline">
            Settings
          </Link>{" "}
          to see daily deficit and estimated weight change.
        </p>
      </div>
    );
  }

  const deficit = balance.deficit!;
  const isDeficit = deficit > 0;
  const isSurplus = deficit < 0;
  const activityLabel = balance.derivedActivityLevel
    ? activityLevelLabel(balance.derivedActivityLevel)
    : null;

  const tdeeSub = activityLabel ?? "estimated burn";

  return (
    <div
      className={
        embedded
          ? ""
          : `rounded-xl border border-slate-800 bg-slate-900/50 ${compact ? "p-3" : "p-4"}`
      }
    >
      {!compact && (
        <SectionHeader
          kind="energyBalance"
          as="p"
          className="mb-3 text-sm font-medium text-slate-400"
        >
          Estimated energy balance
        </SectionHeader>
      )}
      <div className="grid grid-cols-2 gap-2 text-center text-xs">
        <Stat label="Burned" value={`${balance.tdee} kcal`} sub={tdeeSub} />
        <Stat
          label="Balance"
          value={formatDeficit(deficit)}
          sub={
            balance.estimatedKgChange != null
              ? formatEstimatedWeightChange(balance.estimatedKgChange)
              : undefined
          }
          highlight={
            isDeficit ? "good" : isSurplus ? "warn" : "neutral"
          }
        />
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  sub,
  highlight,
  valueClassName,
}: {
  label: string;
  value: string;
  sub?: string;
  highlight?: "good" | "warn" | "neutral";
  valueClassName?: string;
}) {
  const color =
    valueClassName ??
    (highlight === "good"
      ? "text-emerald-400"
      : highlight === "warn"
        ? "text-amber-400"
        : "text-slate-200");
  return (
    <div>
      <p className="text-slate-500">{label}</p>
      <p className={`font-semibold ${color}`}>{value}</p>
      {sub && <p className="text-slate-500">{sub}</p>}
    </div>
  );
}
