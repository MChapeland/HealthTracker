import type { ElementType, ReactNode } from "react";
import { TimelineParam, type SectionIconKind } from "./TimelineParam";

export function SectionHeader({
  kind,
  children,
  className = "mb-3 text-sm font-medium text-slate-400",
  as: Component = "h3",
}: {
  kind: SectionIconKind;
  children: ReactNode;
  className?: string;
  as?: ElementType;
}) {
  return (
    <Component className={className}>
      <TimelineParam kind={kind}>{children}</TimelineParam>
    </Component>
  );
}
