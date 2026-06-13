import type { ReactNode } from "react";
import {
  formatApiLogCost,
  formatApiLogDuration,
  formatApiLogTimestamp,
  formatApiLogTokens,
} from "../lib/mealEstimateApiLogDisplay";
import type { MealEstimateApiLog } from "../types";

type Props = {
  log: MealEstimateApiLog;
  onClose: () => void;
};

function DetailField({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div>
      <dt className="text-slate-500">{label}</dt>
      <dd className="text-slate-300">{children}</dd>
    </div>
  );
}

export function MealEstimateApiLogDialog({ log, onClose }: Props) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="api-log-dialog-title"
      onClick={onClose}
    >
      <div
        className="max-h-[85dvh] w-full max-w-4xl overflow-y-auto rounded-xl border border-slate-700 bg-slate-900 p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <h3
            id="api-log-dialog-title"
            className="text-base font-semibold text-slate-100"
          >
            API call details
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-lg bg-[#172033] text-slate-400 transition-colors hover:bg-slate-800 hover:text-slate-200"
          >
            <i className="fa-solid fa-xmark text-xs" aria-hidden />
          </button>
        </div>

        <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 text-xs sm:grid-cols-4">
          <DetailField label="Time">
            {formatApiLogTimestamp(log.createdAt)}
          </DetailField>
          <DetailField label="Status">
            <span
              className={
                log.status === "success" ? "text-emerald-400" : "text-red-400"
              }
            >
              {log.status}
            </span>
          </DetailField>
          <DetailField label="Model">{log.model}</DetailField>
          <DetailField label="Type">
            <span className="capitalize">{log.promptKind}</span>
          </DetailField>
          <DetailField label="Tokens">{formatApiLogTokens(log)}</DetailField>
          <DetailField label="Est. cost">
            {formatApiLogCost(log.estimatedCostUsd)}
          </DetailField>
          <DetailField label="Duration">
            {formatApiLogDuration(log.durationMs)}
          </DetailField>
          {log.httpStatus != null && (
            <DetailField label="HTTP status">{log.httpStatus}</DetailField>
          )}
        </dl>

        <div className="mt-4">
          <p className="mb-1 text-xs font-medium text-slate-500">Request</p>
          <p className="rounded-lg border border-slate-800 bg-slate-950/70 p-3 text-sm text-slate-300">
            {log.description}
          </p>
        </div>

        {log.errorMessage && (
          <div className="mt-4">
            <p className="mb-1 text-xs font-medium text-slate-500">Error</p>
            <p className="rounded-lg border border-red-900/50 bg-red-950/20 p-3 text-sm text-red-300">
              {log.errorMessage}
            </p>
          </div>
        )}

        <div className="mt-4 space-y-4">
          <div>
            <p className="mb-1 text-xs font-medium text-slate-500">Prompt sent</p>
            <pre className="max-h-56 overflow-auto whitespace-pre-wrap rounded-lg border border-slate-800 bg-slate-950/70 p-3 text-xs text-slate-300">
              {log.requestPrompt}
            </pre>
          </div>
          <div>
            <p className="mb-1 text-xs font-medium text-slate-500">
              Response received
            </p>
            <pre className="max-h-56 overflow-auto whitespace-pre-wrap rounded-lg border border-slate-800 bg-slate-950/70 p-3 text-xs text-slate-300">
              {log.responseText ?? log.errorMessage ?? "No response body"}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}
