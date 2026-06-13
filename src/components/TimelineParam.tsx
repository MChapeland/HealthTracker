import type { ReactNode } from "react";
import { SECTION_ICONS, type SectionIconKind } from "../lib/sectionIcons";

/** @deprecated Use `SectionIconKind` from `../lib/sectionIcons` */
export type TimelineParamKind = SectionIconKind;

export { SECTION_ICONS as TIMELINE_PARAM_ICONS };
export type { SectionIconKind };

const defaultIconClass = "shrink-0 text-sm text-slate-500";

export function TimelineParam({
  kind,
  children,
  className = "text-slate-400",
  iconClassName = defaultIconClass,
}: {
  kind: SectionIconKind;
  children: ReactNode;
  className?: string;
  iconClassName?: string;
}) {
  return (
    <span className={`inline-flex items-center gap-1.5 ${className}`}>
      <i className={`${SECTION_ICONS[kind]} ${iconClassName}`} aria-hidden />
      {children}
    </span>
  );
}
