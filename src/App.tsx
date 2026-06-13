import { lazy, Suspense, useState } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { SyncConflictDialog } from "./components/SyncConflictDialog";
import { Layout } from "./components/Layout";
import { AuthProvider } from "./context/AuthContext";
import { SettingsProvider, useSettings } from "./context/SettingsContext";
import { SyncProvider, useSync } from "./context/SyncContext";
import { isDev } from "./lib/dev";
import { DashboardPage } from "./pages/DashboardPage";

const AnalyticsPage = lazy(() =>
  import("./pages/AnalyticsPage").then((m) => ({ default: m.AnalyticsPage }))
);
const DayPage = lazy(() =>
  import("./pages/DayPage").then((m) => ({ default: m.DayPage }))
);
const DevOnboardingRoute = lazy(() =>
  import("./pages/DevOnboardingRoute").then((m) => ({
    default: m.DevOnboardingRoute,
  }))
);
const FoodsPage = lazy(() =>
  import("./pages/FoodsPage").then((m) => ({ default: m.FoodsPage }))
);
const WorkoutsPage = lazy(() =>
  import("./pages/WorkoutsPage").then((m) => ({ default: m.WorkoutsPage }))
);
const ExerciseAnalyticsPage = lazy(() =>
  import("./pages/ExerciseAnalyticsPage").then((m) => ({
    default: m.ExerciseAnalyticsPage,
  }))
);
const RoutineAnalyticsPage = lazy(() =>
  import("./pages/RoutineAnalyticsPage").then((m) => ({
    default: m.RoutineAnalyticsPage,
  }))
);
const OnboardingPage = lazy(() =>
  import("./pages/OnboardingPage").then((m) => ({ default: m.OnboardingPage }))
);
const SettingsPage = lazy(() =>
  import("./pages/SettingsPage").then((m) => ({ default: m.SettingsPage }))
);
const TimelinePage = lazy(() =>
  import("./pages/TimelinePage").then((m) => ({ default: m.TimelinePage }))
);

function RouteLoadingFallback() {
  return (
    <div className="flex h-screen items-center justify-center bg-slate-950 text-slate-500">
      Loading...
    </div>
  );
}

function GlobalSyncConflict() {
  const { conflict, resolveConflict, dismissConflict, status } = useSync();
  const [busy, setBusy] = useState(false);
  if (!conflict) return null;
  return (
    <SyncConflictDialog
      conflict={conflict}
      busy={busy || status === "syncing"}
      onDismiss={dismissConflict}
      onKeepLocal={() => {
        setBusy(true);
        void resolveConflict("keepLocal").finally(() => setBusy(false));
      }}
      onUseRemote={() => {
        setBusy(true);
        void resolveConflict("useRemote").finally(() => setBusy(false));
      }}
    />
  );
}

function AppRoutes() {
  const { settings, loading, error, refresh } = useSettings();

  if (loading) {
    return <RouteLoadingFallback />;
  }

  if (!settings) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4 bg-slate-950 p-6 text-center">
        <p className="text-sm text-red-400">
          {error ?? "Could not load settings."}
        </p>
        <button
          type="button"
          onClick={() => void refresh()}
          className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!settings.onboardingComplete) {
    return (
      <Suspense fallback={<RouteLoadingFallback />}>
        <Routes>
          <Route path="*" element={<OnboardingPage />} />
        </Routes>
      </Suspense>
    );
  }

  return (
    <Suspense fallback={<RouteLoadingFallback />}>
      <Routes>
        {isDev && (
          <Route path="dev/onboarding" element={<DevOnboardingRoute />} />
        )}
        <Route element={<Layout />}>
          <Route index element={<DashboardPage />} />
          <Route path="timeline" element={<TimelinePage />} />
          <Route path="dashboard" element={<Navigate to="/" replace />} />
          <Route path="analytics" element={<AnalyticsPage />} />
          <Route path="foods" element={<FoodsPage />} />
          <Route path="workouts" element={<WorkoutsPage />} />
          <Route
            path="workouts/exercises/:id/analytics"
            element={<ExerciseAnalyticsPage />}
          />
          <Route
            path="workouts/routines/:id/analytics"
            element={<RoutineAnalyticsPage />}
          />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="day/:date" element={<DayPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}

export default function App() {
  return (
    <SettingsProvider>
      <AuthProvider>
        <SyncProvider>
          <BrowserRouter>
            <GlobalSyncConflict />
            <AppRoutes />
          </BrowserRouter>
        </SyncProvider>
      </AuthProvider>
    </SettingsProvider>
  );
}
