import type { ProgressFeedbackResponse } from "../types";

function confidenceClass(confidence: ProgressFeedbackResponse["confidence"]): string {
  switch (confidence) {
    case "low":
      return "bg-amber-500/15 text-amber-400";
    case "high":
      return "bg-emerald-500/15 text-emerald-400";
    default:
      return "bg-slate-700 text-slate-300";
  }
}

type Props = {
  response: ProgressFeedbackResponse;
  localStatusReason?: string;
  showWhySection?: boolean;
  onToggleWhy?: () => void;
  whyExpanded?: boolean;
};

export function AiFeedbackResultCard({
  response,
  localStatusReason,
  showWhySection,
  onToggleWhy,
  whyExpanded,
}: Props) {
  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <h4 className="text-base font-semibold text-slate-100">{response.headline}</h4>
        <span
          className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${confidenceClass(response.confidence)}`}
        >
          {response.confidence} confidence
        </span>
      </div>

      <p className="text-sm font-medium text-accent">{response.status}</p>
      <p className="text-sm text-slate-300">{response.summary}</p>

      <div>
        <p className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-500">
          What the data suggests
        </p>
        <p className="text-sm text-slate-400">{response.likelyExplanation}</p>
      </div>

      {response.positiveSignals.length > 0 && (
        <div>
          <p className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-500">
            Doing well
          </p>
          <ul className="list-inside list-disc space-y-1 text-sm text-emerald-400/90">
            {response.positiveSignals.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      )}

      {response.watchOuts.length > 0 && (
        <div>
          <p className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-500">
            Watch
          </p>
          <ul className="list-inside list-disc space-y-1 text-sm text-amber-400/90">
            {response.watchOuts.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      )}

      {response.nextSteps.length > 0 && (
        <div>
          <p className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-500">
            Next steps
          </p>
          <ul className="list-inside list-decimal space-y-1 text-sm text-slate-300">
            {response.nextSteps.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      )}

      <p className="text-xs text-slate-500">{response.confidenceReason}</p>

      {showWhySection && localStatusReason && onToggleWhy && (
        <div className="border-t border-slate-800 pt-3">
          <button
            type="button"
            onClick={onToggleWhy}
            className="text-xs text-slate-400 hover:text-slate-200"
          >
            {whyExpanded ? "Hide" : "Why we think this"}
          </button>
          {whyExpanded && (
            <p className="mt-2 text-xs text-slate-500">{localStatusReason}</p>
          )}
        </div>
      )}

      <p className="text-xs text-slate-600">
        Not medical advice. Talk to a healthcare professional for personal medical questions.
      </p>
    </div>
  );
}
