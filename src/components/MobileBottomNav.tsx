import { NavLink } from "react-router-dom";
import { MAIN_NAV, PAGE_ICONS } from "../lib/pageNav";

export function MobileBottomNav() {
  return (
    <nav
      className="mobile-bottom-nav shrink-0 border-t border-slate-800 bg-slate-900"
      aria-label="Main navigation"
    >
      <div className="grid grid-cols-6 gap-0.5 px-1 py-1">
        {MAIN_NAV.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === "/"}
            className={({ isActive }) =>
              `flex flex-col items-center gap-0.5 rounded-lg px-1 py-2 text-[10px] leading-tight transition-colors ${
                isActive
                  ? "bg-accent-nav text-accent-nav"
                  : "text-slate-500 hover:bg-slate-800 hover:text-slate-300"
              }`
            }
          >
            <i
              className={`${PAGE_ICONS[item.id]} text-sm`}
              aria-hidden
            />
            <span className="max-w-full truncate">{item.label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
