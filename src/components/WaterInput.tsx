import { useEffect, useState } from "react";
import { NumberInput } from "./NumberInput";

interface Props {
  waterMl: number | null;
  onChange: (waterMl: number | null) => void;
}

export function WaterInput({ waterMl, onChange }: Props) {
  const [input, setInput] = useState("");

  useEffect(() => {
    setInput(waterMl != null ? String(waterMl) : "");
  }, [waterMl]);

  const apply = (raw: string) => {
    const num = parseFloat(raw);
    if (!raw || Number.isNaN(num) || num <= 0) {
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
