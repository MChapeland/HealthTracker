import type { ReactNode } from "react";
import { nutrientMeta, type NutrientKey } from "../lib/nutrients";

export function NutrientIcon({
  nutrient,
  className = "shrink-0 text-[0.65rem]",
}: {
  nutrient: NutrientKey;
  className?: string;
}) {
  const { icon } = nutrientMeta(nutrient);
  return <i className={`${icon} ${className}`.trim()} aria-hidden />;
}

export function NutrientLabel({
  nutrient,
  suffix,
  className = "inline-flex items-center gap-1",
  iconClassName = "shrink-0 text-[0.65rem]",
  children,
}: {
  nutrient: NutrientKey;
  suffix?: string;
  className?: string;
  iconClassName?: string;
  children?: ReactNode;
}) {
  const { label } = nutrientMeta(nutrient);
  return (
    <span className={className}>
      <NutrientIcon nutrient={nutrient} className={iconClassName} />
      <span>
        {children ?? label}
        {suffix ?? ""}
      </span>
    </span>
  );
}
