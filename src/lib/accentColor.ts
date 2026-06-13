export const ACCENT_COLORS = [
  "blue",
  "emerald",
  "amber",
  "rose",
  "violet",
  "grey",
] as const;

export type AccentColor = (typeof ACCENT_COLORS)[number];

export const DEFAULT_ACCENT_COLOR: AccentColor = "blue";

export const ACCENT_COLOR_OPTIONS: {
  id: AccentColor;
  label: string;
  swatch: string;
}[] = [
  { id: "blue", label: "Azure", swatch: "#60a5fa" },
  { id: "emerald", label: "Emerald", swatch: "#34d399" },
  { id: "amber", label: "Amber", swatch: "#fbbf24" },
  { id: "rose", label: "Rose", swatch: "#fb7185" },
  { id: "violet", label: "Violet", swatch: "#a78bfa" },
  { id: "grey", label: "Graphite", swatch: "#94a3b8" },
];

export function normalizeAccentColor(value: string | null | undefined): AccentColor {
  if (value && ACCENT_COLORS.includes(value as AccentColor)) {
    return value as AccentColor;
  }
  return DEFAULT_ACCENT_COLOR;
}

export function applyAccentColor(accent: AccentColor): void {
  document.documentElement.dataset.accent = accent;
}

/** For SVG/chart props that need a resolved color string. */
export function accentCssVar(token: "300" | "400" | "500" | "600"): string {
  return `var(--accent-${token})`;
}
