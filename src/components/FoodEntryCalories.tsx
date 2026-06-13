type Props = {
  calories: number;
  dayTotalCalories: number;
  className?: string;
};

export function FoodEntryCalories({
  calories,
  dayTotalCalories,
  className = "shrink-0 tabular-nums font-medium text-slate-400",
}: Props) {  const pct =
    dayTotalCalories > 0
      ? Math.round((calories / dayTotalCalories) * 100)
      : null;

  return (
    <span className={className}>      {calories.toFixed(0)} kcal
      {pct != null ? (
        <span className="font-normal text-slate-500"> ({pct}%)</span>
      ) : null}
    </span>
  );
}
