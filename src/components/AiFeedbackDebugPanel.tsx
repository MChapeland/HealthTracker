import type { ProgressFeedbackRequest } from "../types";

type Props = {
  payload: ProgressFeedbackRequest | null | undefined;
};

export function AiFeedbackDebugPanel({ payload }: Props) {
  if (!import.meta.env.DEV || !payload) return null;

  return (
    <details className="mt-4 rounded-lg border border-slate-800 bg-slate-950/50 p-3">
      <summary className="cursor-pointer text-xs font-medium text-slate-400">
        View data sent to AI
      </summary>
      <pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap break-all text-[10px] text-slate-500">
        {JSON.stringify(payload, null, 2)}
      </pre>
    </details>
  );
}
