export const DEFAULT_GEMINI_MODEL = "gemini-2.5-flash";

export const GEMINI_MODELS = [
  "gemini-2.5-flash",
  "gemini-2.5-flash-lite",
  "gemini-2.5-pro",
  "gemini-3.5-flash",
  "gemini-3.1-flash-lite",
  "gemini-3-flash-preview",
  "gemini-2.0-flash",
  "gemini-2.0-flash-lite",
  "gemini-3.1-pro-preview",
  "gemini-1.5-flash",
  "gemini-1.5-flash-8b",
  "gemini-1.5-pro",
] as const;

export type GeminiModel = (typeof GEMINI_MODELS)[number];

export type GeminiModelTier = "free" | "paid";

export type GeminiModelOption = {
  id: GeminiModel;
  label: string;
  hint?: string;
  tier: GeminiModelTier;
};

/** Standard-tier availability on Google AI Studio's free API plan (see ai.google.dev/pricing). */
export const GEMINI_MODEL_OPTIONS: GeminiModelOption[] = [
  {
    id: "gemini-2.5-flash",
    label: "Gemini 2.5 Flash",
    hint: "(recommended)",
    tier: "free",
  },
  { id: "gemini-2.5-flash-lite", label: "Gemini 2.5 Flash Lite", tier: "free" },
  { id: "gemini-2.5-pro", label: "Gemini 2.5 Pro", tier: "free" },
  { id: "gemini-3.5-flash", label: "Gemini 3.5 Flash", tier: "free" },
  { id: "gemini-3.1-flash-lite", label: "Gemini 3.1 Flash Lite", tier: "free" },
  { id: "gemini-3-flash-preview", label: "Gemini 3 Flash Preview", tier: "free" },
  { id: "gemini-2.0-flash", label: "Gemini 2.0 Flash", tier: "free" },
  { id: "gemini-2.0-flash-lite", label: "Gemini 2.0 Flash Lite", tier: "free" },
  { id: "gemini-3.1-pro-preview", label: "Gemini 3.1 Pro Preview", tier: "paid" },
  { id: "gemini-1.5-flash", label: "Gemini 1.5 Flash", tier: "paid" },
  { id: "gemini-1.5-flash-8b", label: "Gemini 1.5 Flash 8B", tier: "paid" },
  { id: "gemini-1.5-pro", label: "Gemini 1.5 Pro", tier: "paid" },
];

export const GEMINI_FREE_MODEL_OPTIONS = GEMINI_MODEL_OPTIONS.filter(
  (opt) => opt.tier === "free"
);

export const GEMINI_PAID_MODEL_OPTIONS = GEMINI_MODEL_OPTIONS.filter(
  (opt) => opt.tier === "paid"
);

export function normalizeGeminiModel(
  value: string | null | undefined
): GeminiModel {
  if (value && GEMINI_MODELS.includes(value as GeminiModel)) {
    return value as GeminiModel;
  }
  return DEFAULT_GEMINI_MODEL;
}

export function geminiModelTier(model: GeminiModel): GeminiModelTier {
  return (
    GEMINI_MODEL_OPTIONS.find((opt) => opt.id === model)?.tier ?? "free"
  );
}

export function geminiModelOptionLabel(opt: GeminiModelOption): string {
  return opt.hint ? `${opt.label} ${opt.hint}` : opt.label;
}
