import { Link, NavLink, Outlet } from "react-router-dom";
import { isDev } from "../lib/dev";
import { useMobileViewport } from "../hooks/useMobileViewport";
import { MAIN_NAV, PAGE_ICONS } from "../lib/pageNav";
import { MobileBottomNav } from "./MobileBottomNav";

function DesktopLayout() {
  return (
    <div className="flex h-screen bg-slate-950 text-slate-100">
      <aside className="flex w-40 shrink-0 flex-col border-r border-slate-800 bg-slate-900">
        <div className="border-b border-slate-800 px-4 py-5 text-center">
          <h1 className="text-lg font-semibold leading-tight text-accent">
            Health Tracker
          </h1>
          <p className="mt-1 text-xs leading-snug text-slate-500">
            Personal wellness log
          </p>
        </div>
        <nav className="flex flex-1 flex-col gap-1 p-3">
          {MAIN_NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              className={({ isActive }) =>
                `flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors ${
                  isActive
                    ? "bg-accent-nav text-accent-nav"
                    : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                }`
              }
            >
              <i
                className={`${PAGE_ICONS[item.id]} w-4 shrink-0 text-center text-xs`}
                aria-hidden
              />
              {item.label}
            </NavLink>
          ))}
        </nav>
        {isDev && (
          <div className="border-t border-slate-800 p-3">
            <Link
              to="/dev/onboarding"
              className="block rounded-lg border border-amber-600/30 bg-amber-950/20 px-3 py-2 text-center text-xs text-amber-200/90 transition-colors hover:border-amber-600/50 hover:bg-amber-950/40"
            >
              Preview onboarding
            </Link>
          </div>
        )}
      </aside>
      <main className="flex-1 overflow-auto [scrollbar-gutter:stable]">
        <Outlet />
      </main>
    </div>
  );
}

function MobileLayout() {
  return (
    <div className="flex min-h-dvh flex-col bg-slate-950 text-slate-100">
      <header className="shrink-0 border-b border-slate-800 bg-slate-900 px-4 py-3 text-center">
        <h1 className="text-base font-semibold text-accent">Health Tracker</h1>
        <p className="text-xs text-slate-500">Personal wellness log</p>
      </header>
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
      <MobileBottomNav />
    </div>
  );
}

export function Layout() {
  const isMobile = useMobileViewport();
  return isMobile ? <MobileLayout /> : <DesktopLayout />;
}
