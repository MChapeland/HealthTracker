export type DayPageLocationState = {
  from?: "dashboard" | "timeline";
};

export function dayBackTarget(
  state: DayPageLocationState | null | undefined
): { to: string; label: string } {
  if (state?.from === "dashboard") {
    return { to: "/", label: "Dashboard" };
  }
  return { to: "/timeline", label: "Timeline" };
}
