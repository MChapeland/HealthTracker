import { lazy, Suspense } from "react";
import { Navigate, useSearchParams } from "react-router-dom";
import { isDev } from "../lib/dev";

const OnboardingPage = lazy(() =>
  import("./OnboardingPage").then((m) => ({ default: m.OnboardingPage }))
);

type OnboardingPhase = "account-choice" | "login" | "setup";

type MockLoginPreview =
  | "signed-out"
  | "syncing"
  | "no-profile"
  | "ready"
  | "not-configured";

function parsePhase(value: string | null): OnboardingPhase {
  if (value === "login" || value === "setup") {
    return value;
  }
  return "account-choice";
}

function parseLoginPreview(value: string | null): MockLoginPreview {
  if (
    value === "syncing" ||
    value === "no-profile" ||
    value === "ready" ||
    value === "not-configured"
  ) {
    return value;
  }
  return "signed-out";
}

export function DevOnboardingRoute() {
  const [searchParams] = useSearchParams();

  if (!isDev) {
    return <Navigate to="/" replace />;
  }

  const initialPhase = parsePhase(searchParams.get("phase"));
  const initialLoginPreview = parseLoginPreview(
    searchParams.get("loginPreview")
  );

  return (
    <Suspense
      fallback={
        <div className="flex h-screen items-center justify-center bg-slate-950 text-slate-500">
          Loading...
        </div>
      }
    >
      <OnboardingPage
        mockup
        initialPhase={initialPhase}
        initialLoginPreview={initialLoginPreview}
      />
    </Suspense>
  );
}
