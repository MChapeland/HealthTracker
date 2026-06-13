import { formatQuantityUnit } from "../lib/foodDisplay";
import type { FoodUnit } from "../types";

type Props = {
  name: string;
  quantity: number;
  unit: FoodUnit;
  nameClassName?: string;
};

export function FoodServingLabel({
  name,
  quantity,
  unit,
  nameClassName = "font-medium",
}: Props) {
  return (
    <span className="min-w-0 text-left">
      <span className={nameClassName}>{name}</span>
      <span className="text-slate-500">
        {" "}
        ({formatQuantityUnit(quantity, unit)})
      </span>
    </span>
  );
}
