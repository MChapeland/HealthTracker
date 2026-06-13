import { useEffect, useRef, useState } from "react";
import {
  dropdownMenuClass,
  dropdownMenuPlacementClass,
  dropdownOptionClass,
} from "../lib/dropdownStyles";
import {
  DEFAULT_ROUTINE_SORT,
  ROUTINE_SORT_OPTIONS,
  getRoutineSortOptionLabel,
  routineSortDirectionLabel,
  type RoutineSortField,
  type RoutineSortState,
} from "../lib/routineLibrary";

interface Props {
  sort: RoutineSortState;
  onChange: (sort: RoutineSortState) => void;
}

export function RoutineSortMenu({ sort, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handlePointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [open]);

  const selectField = (field: RoutineSortField) => {
    if (sort.field === field) {
      onChange({
        field,
        direction: sort.direction === "asc" ? "desc" : "asc",
      });
    } else {
      const option = ROUTINE_SORT_OPTIONS.find((o) => o.field === field);
      onChange({
        field,
        direction: option?.defaultDirection ?? DEFAULT_ROUTINE_SORT.direction,
      });
    }
    setOpen(false);
  };

  const activeLabel = getRoutineSortOptionLabel(sort.field);
  const activeDirection = routineSortDirectionLabel(sort.field, sort.direction);

  return (
    <div ref={containerRef} className="relative shrink-0">
      <button
        type="button"
        className="flex h-[38px] cursor-pointer items-center gap-2 rounded-lg border border-slate-700 bg-slate-800 px-3 text-sm text-slate-200 transition-colors hover:border-slate-600 hover:bg-slate-700/50"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`Sort routines: ${activeLabel}, ${activeDirection}`}
        onClick={() => setOpen((prev) => !prev)}
      >
        <i className="fa-solid fa-arrow-down-wide-short text-slate-400" aria-hidden />
        <span className="hidden min-[480px]:inline">Sort</span>
        <i
          className={`fa-solid fa-chevron-down text-xs text-slate-500 transition-transform ${open ? "rotate-180" : ""}`}
          aria-hidden
        />
      </button>

      {open && (
        <div
          className={`${dropdownMenuClass} ${dropdownMenuPlacementClass("bottom", "right")} w-56`}
          role="listbox"
          aria-label="Sort routines by"
        >
          {ROUTINE_SORT_OPTIONS.map(({ field, label }) => {
            const active = sort.field === field;
            const directionLabel = active
              ? routineSortDirectionLabel(field, sort.direction)
              : null;

            return (
              <button
                key={field}
                type="button"
                role="option"
                aria-selected={active}
                className={dropdownOptionClass(active, "justify-between gap-2")}
                onClick={() => selectField(field)}
              >
                <span>{label}</span>
                <span className="flex items-center gap-1.5 text-xs text-slate-500">
                  {directionLabel && <span>{directionLabel}</span>}
                  {active && (
                    <i
                      className={`fa-solid ${sort.direction === "asc" ? "fa-arrow-up" : "fa-arrow-down"}`}
                      aria-hidden
                    />
                  )}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
