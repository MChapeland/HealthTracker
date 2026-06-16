import { useCallback, useState } from "react";
import { Link } from "react-router-dom";
import { AiFeedbackDebugPanel } from "./AiFeedbackDebugPanel";
import { AiFeedbackResultCard } from "./AiFeedbackResultCard";
import { AiFeedbackTopicSelect } from "./AiFeedbackTopicSelect";
import { useAiFeedback } from "../hooks/useAiFeedback";
import { getTopicDefinition } from "../lib/aiFeedback/topics";
import { DEFAULT_AI_FEEDBACK_TOPIC } from "../lib/aiFeedback/topics";
import type { AiFeedbackTopic } from "../types";

type Props = {
  open: boolean;
  onClose: () => void;
};

export function AiFeedbackDialog({ open, onClose }: Props) {
  const [topic, setTopic] = useState<AiFeedbackTopic>(DEFAULT_AI_FEEDBACK_TOPIC);
  const [userNote, setUserNote] = useState("");
  const [whyExpanded, setWhyExpanded] = useState(false);
  const {
    phase,
    error,
    response,
    analysis,
    payload,
    settingsReady,
    canUseAi,
    generate,
    reset,
  } = useAiFeedback();

  const topicDef = getTopicDefinition(topic);

  const handleClose = useCallback(() => {
    reset();
    setTopic(DEFAULT_AI_FEEDBACK_TOPIC);
    setUserNote("");
    setWhyExpanded(false);
    onClose();
  }, [onClose, reset]);

  const handleGenerate = useCallback(() => {
    void generate(topic, userNote);
  }, [generate, topic, userNote]);

  const handleCopy = useCallback(async () => {
    if (!response) return;
    const text = [
      response.headline,
      response.status,
      response.summary,
      response.likelyExplanation,
      "",
      "Doing well:",
      ...response.positiveSignals.map((s) => `- ${s}`),
      "",
      "Watch:",
      ...response.watchOuts.map((s) => `- ${s}`),
      "",
      "Next steps:",
      ...response.nextSteps.map((s, i) => `${i + 1}. ${s}`),
    ].join("\n");
    await navigator.clipboard.writeText(text);
  }, [response]);

  if (!open) return null;

  const loading = phase === "analyzing" || phase === "generating";
  const insufficient =
    phase === "insufficient" || analysis?.sufficiency === "insufficient";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="ai-feedback-title"
      onClick={handleClose}
    >
      <div
        className="max-h-[85dvh] w-full max-w-md overflow-y-auto rounded-xl border border-slate-700 bg-slate-900 p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-2">
          <i className="fa-solid fa-wand-sparkles mt-0.5 text-accent" aria-hidden />
          <div className="min-w-0 flex-1">
            <h3 id="ai-feedback-title" className="text-base font-semibold text-slate-100">
              Analyze my progress
            </h3>
            <p className="mt-1 text-xs text-slate-500">
              AI coaching based on your last 30 days of logs.
            </p>
          </div>
        </div>

        {phase === "result" && response ? (
          <>
            <div className="mt-4">
              <AiFeedbackResultCard
                response={response}
                localStatusReason={analysis?.localStatusReason}
                showWhySection
                whyExpanded={whyExpanded}
                onToggleWhy={() => setWhyExpanded((v) => !v)}
              />
            </div>
            <AiFeedbackDebugPanel payload={payload ?? response.debugPayload} />
            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={() => void handleCopy()}
                className="rounded-xl border border-slate-600 px-4 py-1.5 text-sm text-slate-200 hover:bg-slate-800"
              >
                Copy
              </button>
              <button
                type="button"
                onClick={() => {
                  reset();
                  void generate(topic, userNote);
                }}
                disabled={loading}
                className="rounded-xl border border-slate-600 px-4 py-1.5 text-sm text-slate-200 hover:bg-slate-800 disabled:opacity-50"
              >
                Regenerate
              </button>
              <button
                type="button"
                onClick={handleClose}
                className="rounded-xl bg-accent px-4 py-1.5 text-sm hover:bg-accent-hover"
              >
                Close
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="mt-4 space-y-3">
              <div>
                <label className="mb-1 block text-xs text-slate-500">Topic</label>
                <AiFeedbackTopicSelect
                  value={topic}
                  onChange={setTopic}
                  disabled={loading}
                />
              </div>
              <p className="rounded-lg border border-slate-800 bg-slate-950/50 px-3 py-2 text-xs text-slate-400">
                {topicDef.description}
              </p>
              <div>
                <label className="mb-1 block text-xs text-slate-500">
                  Anything specific? (optional)
                </label>
                <textarea
                  className="min-h-[72px] w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-200 placeholder:text-slate-600"
                  value={userNote}
                  maxLength={500}
                  disabled={loading}
                  placeholder="Example: I feel like my weight has stalled this week."
                  onChange={(e) => setUserNote(e.target.value)}
                />
              </div>
              <p className="text-xs text-slate-500">
                Sends recent stats (not food names) to Google Gemini. Not medical advice.
              </p>
            </div>

            {insufficient && analysis?.emptyMessage && (
              <p className="mt-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
                {analysis.emptyMessage}
              </p>
            )}

            {error && (
              <p className="mt-3 text-xs text-red-400">{error}</p>
            )}

            {!canUseAi && settingsReady && (
              <p className="mt-3 text-xs text-slate-500">
                Enable AI progress feedback in{" "}
                <Link to="/settings" className="text-accent hover:underline" onClick={handleClose}>
                  Settings
                </Link>
                .
              </p>
            )}

            <AiFeedbackDebugPanel payload={payload} />

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={handleClose}
                disabled={loading}
                className="rounded-xl bg-slate-700 px-4 py-1.5 text-sm text-slate-200 hover:bg-slate-600 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleGenerate}
                disabled={loading || (!canUseAi && !import.meta.env.DEV)}
                className="rounded-xl bg-accent px-4 py-1.5 text-sm hover:bg-accent-hover disabled:opacity-50"
              >
                {phase === "analyzing"
                  ? "Analyzing…"
                  : phase === "generating"
                    ? "Getting feedback…"
                    : "Generate feedback"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
