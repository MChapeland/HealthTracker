import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type ComponentProps,
  type FocusEvent,
  type KeyboardEvent,
} from "react";
import {
  evaluateNumberExpression,
  formatEvaluatedNumber,
  looksLikeNumberExpression,
} from "../lib/evaluateNumberExpression";

type Props = Omit<ComponentProps<"input">, "type">;

function valueToString(value: Props["value"]): string {
  if (value === null || value === undefined) return "";
  return String(value);
}

function clampToMinMax(
  value: number,
  min: Props["min"],
  max: Props["max"]
): number {
  let next = value;
  if (min != null) {
    const minNum = typeof min === "number" ? min : parseFloat(String(min));
    if (!Number.isNaN(minNum)) next = Math.max(next, minNum);
  }
  if (max != null) {
    const maxNum = typeof max === "number" ? max : parseFloat(String(max));
    if (!Number.isNaN(maxNum)) next = Math.min(next, maxNum);
  }
  return next;
}

function createChangeEvent(
  input: HTMLInputElement,
  value: string,
  name?: string
): ChangeEvent<HTMLInputElement> {
  return {
    target: { ...input, value, name: name ?? input.name },
    currentTarget: input,
  } as ChangeEvent<HTMLInputElement>;
}

/** Number field with optional + - * / expressions evaluated on Enter or blur. */
export function NumberInput({
  className = "",
  value,
  onChange,
  onBlur,
  onKeyDown,
  onEnter,
  onFocus,
  min,
  max,
  ...props
}: Props & { onEnter?: (committed: string) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [focused, setFocused] = useState(false);
  const [localValue, setLocalValue] = useState(() => valueToString(value));

  useEffect(() => {
    if (!focused) {
      setLocalValue(valueToString(value));
    }
  }, [value, focused]);

  const displayValue = focused ? localValue : valueToString(value);

  const commitValue = (raw: string): string => {
    const trimmed = raw.trim();
    const input = inputRef.current;
    if (!input) return trimmed;

    if (trimmed === "") {
      onChange?.(createChangeEvent(input, "", props.name));
      return "";
    }

    const evaluated = evaluateNumberExpression(trimmed);
    if (evaluated !== null) {
      const clamped = clampToMinMax(evaluated, min, max);
      const formatted = formatEvaluatedNumber(clamped);
      onChange?.(createChangeEvent(input, formatted, props.name));
      return formatted;
    }

    if (!looksLikeNumberExpression(trimmed)) {
      onChange?.(createChangeEvent(input, trimmed, props.name));
      return trimmed;
    }

    return trimmed;
  };

  const handleFocus = (event: FocusEvent<HTMLInputElement>) => {
    setFocused(true);
    setLocalValue(valueToString(value));
    onFocus?.(event);
  };

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const next = event.target.value;
    setLocalValue(next);
    if (!looksLikeNumberExpression(next)) {
      onChange?.(event);
    }
  };

  const handleBlur = (event: FocusEvent<HTMLInputElement>) => {
    const committed = commitValue(localValue);
    if (
      looksLikeNumberExpression(localValue) &&
      evaluateNumberExpression(localValue.trim()) === null
    ) {
      setLocalValue(valueToString(value));
    } else {
      setLocalValue(committed);
    }
    setFocused(false);
    onBlur?.(event);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      const committed = commitValue(localValue);
      setLocalValue(committed);
      if (
        looksLikeNumberExpression(localValue) &&
        evaluateNumberExpression(localValue.trim()) === null
      ) {
        setLocalValue(valueToString(value));
      } else {
        onEnter?.(committed);
      }
      onKeyDown?.(event);
      event.preventDefault();
      inputRef.current?.blur();
      return;
    }
    onKeyDown?.(event);
  };

  return (
    <input
      ref={inputRef}
      type="text"
      inputMode="decimal"
      className={`[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none ${className}`}
      {...props}
      min={min}
      max={max}
      value={displayValue}
      onFocus={handleFocus}
      onChange={handleChange}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
    />
  );
}
