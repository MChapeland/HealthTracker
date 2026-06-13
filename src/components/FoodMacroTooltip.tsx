import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ElementType,
  type FocusEvent as ReactFocusEvent,
  type MouseEvent,
  type ReactNode,
  type RefObject,
  Fragment,
} from "react";
import { createPortal } from "react-dom";
import {
  getServingMacros,
  servingMacroTooltipLines,
  type MacroTooltipLine,
} from "../lib/calories";
import { NutrientLabel } from "./NutrientLabel";
import { foodReferenceEntry } from "../lib/foodDisplay";
import type { Food, FoodEntry } from "../types";

type TooltipPayload = {
  entry?: FoodEntry;
  food?: Food | null;
};

type TooltipContextValue = {
  show: (
    anchor: HTMLElement,
    payload: TooltipPayload,
    positionEl?: HTMLElement
  ) => void;
  hide: () => void;
  listRootRef: RefObject<HTMLDivElement | null>;
  tooltipGap: number;
};

const TooltipContext = createContext<TooltipContextValue | null>(null);

function getMacroTooltipLines(
  entry?: FoodEntry,
  food?: Food | null
) {
  const resolvedEntry = entry ?? (food ? foodReferenceEntry(food) : null);
  if (!resolvedEntry) return [];
  const macros = getServingMacros(resolvedEntry, food);
  return servingMacroTooltipLines(macros);
}

function TooltipTail() {
  return (
    <span
      aria-hidden
      className="absolute top-1/2 left-full -translate-y-1/2"
    >
      <span className="block h-0 w-0 border-y-[7px] border-y-transparent border-l-[7px] border-l-slate-700" />
      <span className="absolute top-1/2 left-px h-0 w-0 -translate-y-1/2 border-y-[6px] border-y-transparent border-l-[6px] border-l-slate-800" />
    </span>
  );
}

function FloatingFoodMacroTooltip({
  anchor,
  lines,
  visible,
  gap,
}: {
  anchor: HTMLElement | null;
  lines: MacroTooltipLine[];
  visible: boolean;
  gap: number;
}) {
  const [, setLayoutTick] = useState(0);

  useEffect(() => {
    if (!anchor || !visible) return;

    const update = () => setLayoutTick((tick) => tick + 1);
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [anchor, visible]);

  if (lines.length === 0 || !anchor) return null;

  const rect = anchor.getBoundingClientRect();
  const top = rect.top + rect.height / 2;
  const hiddenGap = Math.round(gap * 0.875);

  return createPortal(
    <div
      role="tooltip"
      aria-hidden={!visible}
      className="pointer-events-none fixed z-50 min-w-[9rem] rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-2 text-xs shadow-lg transition-[top,opacity,transform] duration-200 ease-out"
      style={{
        top,
        left: rect.left,
        transform: visible
          ? `translate(calc(-100% - ${gap}px), -50%) scale(1)`
          : `translate(calc(-100% - ${hiddenGap}px), -50%) scale(0.98)`,
        opacity: visible ? 1 : 0,
      }}
    >
      <ul className="grid grid-cols-[auto_auto] gap-x-4 gap-y-0.5">
        {lines.map((line) => (
          <Fragment key={line.key}>
            <li className={line.muted ? "text-slate-500" : "text-slate-200"}>
              <NutrientLabel
                nutrient={line.key}
                iconClassName="shrink-0 text-[0.6rem]"
              />
            </li>
            <li
              className={`text-right tabular-nums ${
                line.muted ? "text-slate-500" : "text-slate-200"
              }`}
            >
              {line.value}
            </li>
          </Fragment>
        ))}
      </ul>
      <TooltipTail />
    </div>,
    document.body
  );
}

/** Wrap a food list so rows share one tooltip that moves vertically. */
export function FoodMacroTooltipList({
  children,
  tooltipGap = 32,
  disabled = false,
}: {
  children: ReactNode;
  /** Horizontal gap between row and tooltip in px (default 32). */
  tooltipGap?: number;
  /** Suppress tooltip show/hover while true (e.g. inline food edit). */
  disabled?: boolean;
}) {
  const listRootRef = useRef<HTMLDivElement>(null);
  const [positionAnchor, setPositionAnchor] = useState<HTMLElement | null>(null);
  const [payload, setPayload] = useState<TooltipPayload | null>(null);
  const [visible, setVisible] = useState(false);

  const hide = useCallback(() => {
    setVisible(false);
    setPositionAnchor(null);
    setPayload(null);
  }, []);

  useEffect(() => {
    if (disabled) hide();
  }, [disabled, hide]);

  const show = useCallback(
    (
      _anchor: HTMLElement,
      nextPayload: TooltipPayload,
      positionEl?: HTMLElement
    ) => {
      if (disabled) return;
      const lines = getMacroTooltipLines(nextPayload.entry, nextPayload.food);
      if (lines.length === 0) {
        hide();
        return;
      }
      setPositionAnchor(positionEl ?? _anchor);
      setPayload(nextPayload);
      setVisible(true);
    },
    [hide, disabled]
  );

  const handleListMouseLeave = useCallback(
    (event: MouseEvent<HTMLDivElement>) => {
      const related = event.relatedTarget;
      if (related instanceof Node && listRootRef.current?.contains(related)) {
        return;
      }
      hide();
    },
    [hide]
  );

  const lines = useMemo(
    () =>
      payload ? getMacroTooltipLines(payload.entry, payload.food ?? null) : [],
    [payload]
  );

  const value = useMemo(
    () => ({ show, hide, listRootRef, tooltipGap }),
    [show, hide, tooltipGap]
  );

  return (
    <TooltipContext.Provider value={value}>
      <div ref={listRootRef} onMouseLeave={handleListMouseLeave}>
        {children}
      </div>
      <FloatingFoodMacroTooltip
        anchor={positionAnchor}
        lines={lines}
        visible={visible}
        gap={tooltipGap}
      />
    </TooltipContext.Provider>
  );
}

type TargetProps = {
  entry?: FoodEntry;
  food?: Food | null;
  children: ReactNode;
  className?: string;
  /** Element for the hover zone (use `li` to cover a full list row). */
  as?: ElementType;
};

/** Hover target for a row inside {@link FoodMacroTooltipList}. */
export function FoodMacroTooltip({
  entry,
  food = null,
  children,
  className = "",
  as: Component = "div",
}: TargetProps) {
  const context = useContext(TooltipContext);
  const ref = useRef<HTMLElement>(null);

  const handleShow = () => {
    if (!context || !ref.current) return;
    const positionEl =
      ref.current.querySelector<HTMLElement>("[data-food-tooltip-position]") ??
      ref.current;
    context.show(ref.current, { entry, food }, positionEl);
  };

  const handleBlur = (event: ReactFocusEvent<HTMLElement>) => {
    const related = event.relatedTarget;
    if (related instanceof Node && context?.listRootRef.current?.contains(related)) {
      return;
    }
    context?.hide();
  };

  return (
    <Component
      ref={ref}
      data-food-tooltip-target
      className={`relative min-w-0 w-full transition-colors hover:bg-slate-800/60 before:pointer-events-none before:absolute before:inset-x-0 before:-inset-y-px before:content-[''] ${className}`.trim()}
      onMouseEnter={handleShow}
      onFocus={handleShow}
      onBlur={handleBlur}
    >
      {children}
    </Component>
  );
}
