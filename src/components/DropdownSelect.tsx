import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  dropdownMenuClass,
  dropdownMenuGroupLabelClass,
  dropdownMenuPlacementClass,
  dropdownOptionClass,
  dropdownTriggerClass,
} from "../lib/dropdownStyles";

export type DropdownSelectOption<T extends string = string> = {
  value: T;
  label: ReactNode;
  disabled?: boolean;
};

export type DropdownSelectGroup<T extends string = string> = {
  label: string;
  options: DropdownSelectOption<T>[];
};

type Props<T extends string> = {
  value: T;
  onChange: (value: T) => void;
  options?: DropdownSelectOption<T>[];
  groups?: DropdownSelectGroup<T>[];
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  triggerClassName?: string;
  menuClassName?: string;
  menuAlign?: "left" | "right";
  placement?: "bottom" | "top";
  id?: string;
  "aria-label"?: string;
};

function joinClasses(...parts: Array<string | false | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

export function DropdownSelect<T extends string>({
  value,
  onChange,
  options,
  groups,
  disabled = false,
  placeholder = "Select…",
  className,
  triggerClassName,
  menuClassName,
  menuAlign = "left",
  placement = "bottom",
  id,
  "aria-label": ariaLabel,
}: Props<T>) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const flatOptions = options ?? groups?.flatMap((group) => group.options) ?? [];
  const selectedOption = flatOptions.find((option) => option.value === value);

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

  const selectValue = (next: T) => {
    onChange(next);
    setOpen(false);
  };

  const renderOption = (option: DropdownSelectOption<T>) => {
    const selected = option.value === value;
    return (
      <button
        key={option.value}
        type="button"
        role="option"
        aria-selected={selected}
        disabled={option.disabled}
        className={dropdownOptionClass(selected)}
        onClick={() => selectValue(option.value)}
      >
        {option.label}
      </button>
    );
  };

  return (
    <div
      ref={containerRef}
      className={joinClasses("relative", disabled && "opacity-60", className)}
    >
      <button
        type="button"
        id={id}
        disabled={disabled}
        className={joinClasses(dropdownTriggerClass, triggerClassName)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
        onClick={() => setOpen((prev) => !prev)}
      >
        <span
          className={joinClasses(
            "min-w-0 truncate",
            !selectedOption && value === "" && "text-slate-500"
          )}
        >
          {selectedOption?.label ?? (value === "" ? placeholder : value)}
        </span>
        <i
          aria-hidden
          className={joinClasses(
            "fa-solid fa-chevron-down shrink-0 text-xs text-slate-500 transition-transform",
            open && "rotate-180"
          )}
        />
      </button>

      {open && !disabled && (
        <div
          role="listbox"
          aria-label={ariaLabel}
          className={joinClasses(
            dropdownMenuClass,
            dropdownMenuPlacementClass(placement, menuAlign),
            menuClassName
          )}
        >
          {groups
            ? groups.map((group) => (
                <div key={group.label}>
                  <div className={dropdownMenuGroupLabelClass}>{group.label}</div>
                  {group.options.map(renderOption)}
                </div>
              ))
            : flatOptions.map(renderOption)}
        </div>
      )}
    </div>
  );
}
