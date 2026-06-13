export const dropdownTriggerClass =
  "flex w-full cursor-pointer items-center justify-between gap-2 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-left text-sm text-slate-200 transition-colors hover:bg-slate-700/30 disabled:cursor-not-allowed disabled:opacity-50";

export const dropdownMenuClass =
  "absolute z-20 max-h-48 w-full cursor-pointer overflow-y-auto rounded-lg border border-slate-700 bg-slate-800 py-1 shadow-lg";

export const dropdownMenuGroupLabelClass =
  "px-3 py-1.5 text-xs font-medium text-slate-500 cursor-default";

export const dropdownMenuEmptyClass = "px-3 py-2 text-sm text-slate-500";

export function dropdownOptionClass(selected: boolean, extra?: string): string {
  return [
    "flex w-full cursor-pointer items-center px-3 py-2 text-left text-sm hover:bg-slate-700",
    selected ? "bg-slate-700/80 text-accent" : "text-slate-200",
    extra ?? "",
  ]
    .filter(Boolean)
    .join(" ");
}

export function dropdownMenuPlacementClass(
  placement: "bottom" | "top",
  align: "left" | "right" = "left"
): string {
  const vertical =
    placement === "top" ? "bottom-full mb-1" : "top-full mt-1";
  const horizontal = align === "right" ? "right-0" : "left-0";
  return `${vertical} ${horizontal}`;
}
