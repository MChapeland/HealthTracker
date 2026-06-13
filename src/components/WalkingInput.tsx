import { useEffect, useState } from "react";
import { NumberInput } from "./NumberInput";

interface Props {
  steps: number | null;
  onChange: (steps: number | null) => void;
}

export function WalkingInput({ steps, onChange }: Props) {
  const [input, setInput] = useState("");

  useEffect(() => {
    setInput(steps != null ? String(steps) : "");
  }, [steps]);

  const apply = (raw: string) => {
    const num = parseFloat(raw);
    if (!raw || isNaN(num) || num <= 0) {
      onChange(null);
      return;
    }
    onChange(Math.round(num));
  };

  return (
    <NumberInput
      className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-center text-sm"
      placeholder="0"
      value={input}
      onChange={(e) => {
        setInput(e.target.value);
        apply(e.target.value);
      }}
    />
  );
}
